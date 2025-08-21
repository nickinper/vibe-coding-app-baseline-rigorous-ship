// Enhanced Desktop UI with Error Handling and Tauri Integration
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';

class VibeDesktopApp {
    constructor() {
        this.isRunning = false;
        this.currentEnv = null;
        this.init();
    }

    async init() {
        try {
            // Initialize UI elements
            this.elements = {
                statusBadge: document.getElementById('statusBadge'),
                nodeVersion: document.getElementById('nodeVersion'),
                workspaceStatus: document.getElementById('workspaceStatus'),
                depsStatus: document.getElementById('depsStatus'),
                workingDir: document.getElementById('workingDir'),
                issuesList: document.getElementById('issuesList'),
                outputCard: document.getElementById('outputCard'),
                outputTitle: document.getElementById('outputTitle'),
                loadingSpinner: document.getElementById('loadingSpinner'),
                logOutput: document.getElementById('logOutput'),
                refreshBtn: document.getElementById('refreshBtn'),
                questionnaireBtn: document.getElementById('questionnaireBtn'),
                shipStandardBtn: document.getElementById('shipStandardBtn'),
                shipEnterpriseBtn: document.getElementById('shipEnterpriseBtn'),
                selfCheckBtn: document.getElementById('selfCheckBtn'),
                openTerminalBtn: document.getElementById('openTerminalBtn')
            };

            // Bind event listeners with error handling
            this.bindEvents();

            // Initial environment check
            await this.checkEnvironment();

            console.log('✅ Vibe Desktop App initialized successfully');
        } catch (error) {
            this.handleError('Failed to initialize application', error);
        }
    }

    bindEvents() {
        try {
            this.elements.refreshBtn.addEventListener('click', () => this.safeExecute(this.checkEnvironment));
            this.elements.questionnaireBtn.addEventListener('click', () => this.safeExecute(this.runQuestionnaire));
            this.elements.shipStandardBtn.addEventListener('click', () => this.safeExecute(() => this.runShipPipeline('answers.ci.json')));
            this.elements.shipEnterpriseBtn.addEventListener('click', () => this.safeExecute(() => this.runShipPipeline('answers.enterprise.ci.json')));
            this.elements.selfCheckBtn.addEventListener('click', () => this.safeExecute(this.runSelfCheck));
            this.elements.openTerminalBtn.addEventListener('click', () => this.safeExecute(this.openTerminal));
        } catch (error) {
            this.handleError('Failed to bind event listeners', error);
        }
    }

    async safeExecute(fn) {
        if (this.isRunning) {
            this.showError('Another operation is currently running. Please wait...');
            return;
        }

        try {
            this.isRunning = true;
            await fn.call(this);
        } catch (error) {
            this.handleError('Operation failed', error);
        } finally {
            this.isRunning = false;
            this.setLoading(false);
        }
    }

    async checkEnvironment() {
        try {
            this.setLoading(true, 'Checking environment...');
            
            const result = await invoke('check_environment');
            this.currentEnv = result;
            
            // Update UI with environment status
            this.elements.nodeVersion.textContent = result.node_version || 'Not found';
            this.elements.workspaceStatus.textContent = result.workspace_valid ? '✅ Valid' : '❌ Invalid';
            this.elements.depsStatus.textContent = result.dependencies_installed ? '✅ Installed' : '❌ Missing';
            this.elements.workingDir.textContent = result.working_directory || 'Unknown';

            // Update status badge
            this.updateStatusBadge(result.status);

            // Show issues if any
            this.displayIssues(result.issues || []);

            // Enable/disable buttons based on environment
            this.updateButtonStates();

            console.log('✅ Environment check completed', result);
        } catch (error) {
            this.handleError('Failed to check environment', error);
            this.updateStatusBadge('error');
        }
    }

    async runQuestionnaire() {
        try {
            this.setLoading(true, 'Running questionnaire...');
            this.showOutput('Starting questionnaire...\n');

            const result = await invoke('run_questionnaire');
            
            if (result.success) {
                this.showOutput(`✅ Questionnaire completed successfully!\n\n${result.stdout}`, false);
                await this.checkEnvironment(); // Refresh status
            } else {
                this.showOutput(`❌ Questionnaire failed (exit code: ${result.exit_code})\n\nSTDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`, false);
            }
        } catch (error) {
            this.handleError('Failed to run questionnaire', error);
        }
    }

    async runShipPipeline(answersFile = null) {
        try {
            const mode = answersFile?.includes('enterprise') ? 'Enterprise' : 'Standard';
            this.setLoading(true, `Shipping ${mode} deliverable...`);
            this.showOutput(`🚢 Starting ${mode} ship pipeline...\n`);

            const result = await invoke('run_ship_pipeline', { answersFile });
            
            if (result.success) {
                this.showOutput(`✅ Ship pipeline completed successfully!\n\n${result.stdout}`, false);
            } else {
                this.showOutput(`❌ Ship pipeline failed (exit code: ${result.exit_code})\n\nSTDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`, false);
            }
        } catch (error) {
            this.handleError('Failed to run ship pipeline', error);
        }
    }

    async runSelfCheck() {
        try {
            this.setLoading(true, 'Running CI self-check...');
            this.showOutput('🔍 Running CI self-check...\n');

            // Use shell command for self-check since it's not exposed as Tauri command
            const result = await this.runShellCommand('npm', ['run', 'ci:selfcheck']);
            
            if (result.success) {
                this.showOutput(`✅ CI self-check passed!\n\n${result.output}`, false);
            } else {
                this.showOutput(`❌ CI self-check failed\n\n${result.output}`, false);
            }
        } catch (error) {
            this.handleError('Failed to run self-check', error);
        }
    }

    async openTerminal() {
        try {
            // Open system terminal in current working directory
            if (this.currentEnv?.working_directory) {
                await open(`file://${this.currentEnv.working_directory}`);
            } else {
                this.showError('Working directory not available');
            }
        } catch (error) {
            this.handleError('Failed to open terminal', error);
        }
    }

    async runShellCommand(command, args) {
        try {
            // Note: This is a simplified version. In real implementation,
            // you'd use Tauri's shell plugin with proper scope configuration
            const result = await invoke('run_shell_command', { command, args });
            return result;
        } catch (error) {
            // Fallback: show error and suggest manual execution
            this.showError(`Please run manually: ${command} ${args.join(' ')}`);
            return { success: false, output: `Failed to execute: ${error.message}` };
        }
    }

    updateStatusBadge(status) {
        this.elements.statusBadge.className = `status-badge status-${status}`;
        const statusText = {
            'ok': 'Ready',
            'warning': 'Issues',
            'error': 'Error'
        };
        this.elements.statusBadge.textContent = statusText[status] || 'Unknown';
    }

    displayIssues(issues) {
        if (issues.length === 0) {
            this.elements.issuesList.classList.add('hidden');
            return;
        }

        this.elements.issuesList.innerHTML = '';
        issues.forEach(issue => {
            const li = document.createElement('li');
            li.textContent = issue;
            if (issue.toLowerCase().includes('not found') || issue.toLowerCase().includes('missing')) {
                li.classList.add('error');
            }
            this.elements.issuesList.appendChild(li);
        });
        this.elements.issuesList.classList.remove('hidden');
    }

    updateButtonStates() {
        const isValid = this.currentEnv?.workspace_valid && this.currentEnv?.node_version !== 'not_found';
        
        // Disable buttons if environment is not ready
        [this.elements.questionnaireBtn, this.elements.shipStandardBtn, 
         this.elements.shipEnterpriseBtn, this.elements.selfCheckBtn].forEach(btn => {
            btn.disabled = !isValid || this.isRunning;
        });
    }

    setLoading(loading, title = 'Output') {
        if (loading) {
            this.elements.loadingSpinner.classList.remove('hidden');
            this.elements.outputTitle.textContent = title;
        } else {
            this.elements.loadingSpinner.classList.add('hidden');
        }
        
        // Update button states
        this.updateButtonStates();
    }

    showOutput(content, clear = true) {
        this.elements.outputCard.classList.remove('hidden');
        if (clear) {
            this.elements.logOutput.textContent = content;
        } else {
            this.elements.logOutput.textContent += content;
        }
        // Auto-scroll to bottom
        this.elements.logOutput.scrollTop = this.elements.logOutput.scrollHeight;
    }

    showError(message) {
        this.showOutput(`❌ Error: ${message}\n`, true);
        this.elements.outputCard.classList.remove('hidden');
    }

    handleError(context, error) {
        console.error(`[${context}]`, error);
        const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
        this.showError(`${context}: ${errorMessage}`);
        
        // Also show in status badge if it's a critical error
        if (context.includes('initialize') || context.includes('environment')) {
            this.updateStatusBadge('error');
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        new VibeDesktopApp();
    } catch (error) {
        console.error('Failed to initialize Vibe Desktop App:', error);
        document.body.innerHTML = `
            <div style="padding: 20px; color: #da3633; background: #ffeef0; border-radius: 6px; margin: 20px;">
                <h2>❌ Initialization Error</h2>
                <p>Failed to start the application: ${error.message}</p>
                <p>Please check the console for more details and ensure Tauri is properly configured.</p>
            </div>
        `;
    }
});

// Export for debugging
window.VibeApp = VibeDesktopApp;