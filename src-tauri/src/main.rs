// Prevents additional console window on Windows in release, DO NOT REMOVE!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::Value;
use std::env;
use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::Manager;

// Tauri command to check Node.js availability and workspace validation
#[tauri::command]
async fn check_environment() -> Result<Value, String> {
    let mut issues = Vec::new();
    let mut status = "ok";

    // Check if Node.js is available
    let node_check = Command::new("node").arg("--version").output();
    let node_version = match node_check {
        Ok(output) => String::from_utf8_lossy(&output.stdout).trim().to_string(),
        Err(_) => {
            issues.push("Node.js not found in PATH. Please install Node.js 18+");
            status = "error";
            "not_found".to_string()
        }
    };

    // Check if we're in a valid workspace
    let cwd = env::current_dir().map_err(|e| format!("Cannot get current directory: {}", e))?;
    let package_json = cwd.join("package.json");
    let workspace_valid = package_json.exists();
    
    if !workspace_valid {
        issues.push("Invalid workspace: package.json not found");
        if status == "ok" { status = "warning"; }
    }

    // Check for required files
    let required_files = ["scripts/ship.js", "AGENTS.md", "answers.json"];
    let mut missing_files = Vec::new();
    
    for file in &required_files {
        if !cwd.join(file).exists() {
            missing_files.push(*file);
        }
    }
    
    if !missing_files.is_empty() {
        issues.push(&format!("Missing files: {}", missing_files.join(", ")));
        if status == "ok" { status = "warning"; }
    }

    // Check npm dependencies
    let node_modules = cwd.join("node_modules");
    let deps_installed = node_modules.exists();
    
    if !deps_installed {
        issues.push("Dependencies not installed. Run 'npm install' first");
        if status == "ok" { status = "warning"; }
    }

    Ok(serde_json::json!({
        "status": status,
        "node_version": node_version,
        "workspace_valid": workspace_valid,
        "dependencies_installed": deps_installed,
        "working_directory": cwd.to_string_lossy(),
        "issues": issues
    }))
}

// Tauri command to run ship pipeline
#[tauri::command]
async fn run_ship_pipeline(answers_file: Option<String>) -> Result<Value, String> {
    let cwd = env::current_dir().map_err(|e| format!("Cannot get current directory: {}", e))?;
    
    // Validate workspace first
    if !cwd.join("package.json").exists() {
        return Err("Invalid workspace: package.json not found".to_string());
    }

    // Check Node.js availability
    let node_check = Command::new("node").arg("--version").output();
    if node_check.is_err() {
        return Err("Node.js not available. Please install Node.js and ensure it's in your PATH".to_string());
    }

    // Determine which answers file to use
    let answers_arg = match answers_file {
        Some(file) => format!("--answers={}", file),
        None => {
            if cwd.join("answers.json").exists() {
                "--answers=answers.json".to_string()
            } else if cwd.join("answers.ci.json").exists() {
                "--answers=answers.ci.json".to_string()
            } else {
                return Err("No answers file found. Please run the questionnaire first".to_string());
            }
        }
    };

    // Execute the ship command
    let output = Command::new("npm")
        .arg("run")
        .arg("ship")
        .arg("--")
        .arg(&answers_arg)
        .current_dir(&cwd)
        .output()
        .map_err(|e| format!("Failed to execute npm run ship: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    
    Ok(serde_json::json!({
        "success": output.status.success(),
        "exit_code": output.status.code(),
        "stdout": stdout,
        "stderr": stderr
    }))
}

// Tauri command to run questionnaire
#[tauri::command]
async fn run_questionnaire() -> Result<Value, String> {
    let cwd = env::current_dir().map_err(|e| format!("Cannot get current directory: {}", e))?;
    
    if !cwd.join("package.json").exists() {
        return Err("Invalid workspace: package.json not found".to_string());
    }

    let output = Command::new("npm")
        .arg("run")
        .arg("start")
        .current_dir(&cwd)
        .output()
        .map_err(|e| format!("Failed to execute npm run start: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    
    Ok(serde_json::json!({
        "success": output.status.success(),
        "exit_code": output.status.code(),
        "stdout": stdout,
        "stderr": stderr
    }))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            check_environment,
            run_ship_pipeline,
            run_questionnaire
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}