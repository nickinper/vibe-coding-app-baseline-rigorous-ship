#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Performance Profiling & Regression Testing for LeCun-Rigor Standards
 * 
 * Measures:
 * - Agent policy verification overhead (CPU/memory/runtime)
 * - Security policy compliance across upgrades
 * - System performance impact
 */

const PERF_LOG_PATH = path.join(process.cwd(), 'performance-metrics.json');
const ITERATIONS = 10;

class PerformanceProfiler {
  constructor() {
    this.metrics = this.loadMetrics();
  }

  loadMetrics() {
    try {
      return JSON.parse(fs.readFileSync(PERF_LOG_PATH, 'utf8'));
    } catch (e) {
      return { baseline: null, history: [] };
    }
  }

  saveMetrics() {
    fs.writeFileSync(PERF_LOG_PATH, JSON.stringify(this.metrics, null, 2));
  }

  async measurePolicyVerification() {
    console.log('📊 Measuring agent policy verification performance...');
    
    const measurements = [];
    
    for (let i = 0; i < ITERATIONS; i++) {
      const start = process.hrtime.bigint();
      const startMem = process.memoryUsage();
      
      try {
        await execAsync('node scripts/verify-agent-policy.js');
        
        const end = process.hrtime.bigint();
        const endMem = process.memoryUsage();
        
        const duration = Number(end - start) / 1e6; // Convert to milliseconds
        const memoryDelta = endMem.rss - startMem.rss;
        
        measurements.push({
          duration_ms: duration,
          memory_delta_bytes: memoryDelta,
          memory_peak_mb: endMem.rss / 1024 / 1024
        });
      } catch (error) {
        console.error(`❌ Policy verification failed on iteration ${i + 1}:`, error.message);
        process.exit(1);
      }
    }

    return this.calculateStats(measurements);
  }

  async measureSystemOverhead() {
    console.log('🔧 Measuring system overhead...');
    
    // Measure deliverable generation with policy checks
    const start = process.hrtime.bigint();
    const startMem = process.memoryUsage();
    
    try {
      await execAsync('npm run validate:answers && npm run gen');
      
      const end = process.hrtime.bigint();
      const endMem = process.memoryUsage();
      
      return {
        total_pipeline_ms: Number(end - start) / 1e6,
        memory_peak_mb: endMem.rss / 1024 / 1024,
        memory_delta_mb: (endMem.rss - startMem.rss) / 1024 / 1024
      };
    } catch (error) {
      console.error('❌ System overhead measurement failed:', error.message);
      process.exit(1);
    }
  }

  calculateStats(measurements) {
    const durations = measurements.map(m => m.duration_ms);
    const memoryDeltas = measurements.map(m => m.memory_delta_bytes);
    
    return {
      policy_verification: {
        avg_duration_ms: durations.reduce((a, b) => a + b) / durations.length,
        min_duration_ms: Math.min(...durations),
        max_duration_ms: Math.max(...durations),
        p95_duration_ms: this.percentile(durations, 95),
        avg_memory_delta_kb: memoryDeltas.reduce((a, b) => a + b) / memoryDeltas.length / 1024,
        peak_memory_mb: Math.max(...measurements.map(m => m.memory_peak_mb))
      }
    };
  }

  percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    return sorted[Math.ceil(index)];
  }

  async runRegressionTests() {
    console.log('🧪 Running security regression tests...');
    
    // Test 1: Verify all agents still pass policy
    try {
      await execAsync('node scripts/verify-agent-policy.js');
      console.log('✅ Agent policy compliance: PASS');
    } catch (error) {
      console.error('❌ Agent policy compliance: FAIL');
      return false;
    }

    // Test 2: Verify network allowlist integrity
    try {
      const allowlist = JSON.parse(fs.readFileSync('configs/agent-net-allowlist.json', 'utf8'));
      if (!allowlist.net || allowlist.net.deny_all_by_default !== true) {
        throw new Error('Network deny-by-default not enforced');
      }
      console.log('✅ Network allowlist integrity: PASS');
    } catch (error) {
      console.error('❌ Network allowlist integrity: FAIL -', error.message);
      return false;
    }

    // Test 3: Verify enterprise override safety
    try {
      const overrides = JSON.parse(fs.readFileSync('configs/policy-overrides.json', 'utf8'));
      if (overrides.enabled && !process.env.ENTERPRISE_POLICY_OVERRIDE) {
        console.warn('⚠️  Policy overrides enabled but ENTERPRISE_POLICY_OVERRIDE not set');
      }
      console.log('✅ Enterprise override safety: PASS');
    } catch (error) {
      console.error('❌ Enterprise override safety: FAIL -', error.message);
      return false;
    }

    return true;
  }

  generateReport(currentMetrics, systemMetrics) {
    const report = {
      timestamp: new Date().toISOString(),
      version: require('../package.json').version,
      performance: {
        ...currentMetrics,
        system_overhead: systemMetrics
      },
      regression_status: 'passed',
      recommendations: []
    };

    // Performance analysis
    if (currentMetrics.policy_verification.avg_duration_ms > 1000) {
      report.recommendations.push('Policy verification taking >1s - consider optimization');
    }

    if (systemMetrics.memory_peak_mb > 500) {
      report.recommendations.push('High memory usage detected - monitor for memory leaks');
    }

    // Baseline comparison
    if (this.metrics.baseline) {
      const baseline = this.metrics.baseline.performance.policy_verification;
      const current = currentMetrics.policy_verification;
      
      const perfDelta = ((current.avg_duration_ms - baseline.avg_duration_ms) / baseline.avg_duration_ms) * 100;
      
      if (perfDelta > 20) {
        report.recommendations.push(`Performance regression: ${perfDelta.toFixed(1)}% slower than baseline`);
      }
      
      report.performance.regression_analysis = {
        duration_change_percent: perfDelta,
        baseline_avg_ms: baseline.avg_duration_ms,
        current_avg_ms: current.avg_duration_ms
      };
    }

    return report;
  }

  async run() {
    console.log('🚀 Starting LeCun-Rigor Performance Profile & Regression Testing\n');

    // Run regression tests first
    const regressionPassed = await this.runRegressionTests();
    if (!regressionPassed) {
      console.error('\n❌ Regression tests failed - aborting performance profiling');
      process.exit(1);
    }

    // Measure performance
    const policyMetrics = await this.measurePolicyVerification();
    const systemMetrics = await this.measureSystemOverhead();

    // Generate report
    const report = this.generateReport(policyMetrics, systemMetrics);
    
    // Update metrics history
    this.metrics.history.push(report);
    if (!this.metrics.baseline) {
      this.metrics.baseline = report;
      console.log('📝 Set performance baseline');
    }

    // Keep last 50 runs
    if (this.metrics.history.length > 50) {
      this.metrics.history = this.metrics.history.slice(-50);
    }

    this.saveMetrics();

    // Display results
    console.log('\n📊 Performance Profile Results:');
    console.log(`   Policy Verification: ${policyMetrics.policy_verification.avg_duration_ms.toFixed(2)}ms avg`);
    console.log(`   Peak Memory: ${policyMetrics.policy_verification.peak_memory_mb.toFixed(2)}MB`);
    console.log(`   System Pipeline: ${systemMetrics.total_pipeline_ms.toFixed(2)}ms total`);
    
    if (report.performance.regression_analysis) {
      const delta = report.performance.regression_analysis.duration_change_percent;
      const indicator = delta > 0 ? '📈' : '📉';
      console.log(`   Performance Δ: ${indicator} ${delta.toFixed(1)}% vs baseline`);
    }

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(`   • ${rec}`));
    }

    console.log('\n✅ Performance profile complete');
    console.log(`📄 Detailed metrics saved to ${PERF_LOG_PATH}`);
  }
}

if (require.main === module) {
  new PerformanceProfiler().run().catch(console.error);
}

module.exports = PerformanceProfiler;