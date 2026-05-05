use parking_lot::Mutex;
use serde::Serialize;
use std::collections::VecDeque;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::Arc;
use std::thread;

const LOG_CAP: usize = 800;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FnnStatusPayload {
    pub kind: &'static str,
    pub pid: Option<u32>,
    pub exit_code: Option<i32>,
}

pub struct FnnRuntime {
    child: Mutex<Option<Child>>,
    logs: Arc<Mutex<VecDeque<String>>>,
}

impl FnnRuntime {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
            logs: Arc::new(Mutex::new(VecDeque::new())),
        }
    }

    fn push_line(logs: &Arc<Mutex<VecDeque<String>>>, line: String) {
        let mut g = logs.lock();
        if g.len() >= LOG_CAP {
            g.pop_front();
        }
        g.push_back(line);
    }

    /// Spawn fnn. Does not log the password.
    pub fn start(
        &self,
        binary: &str,
        config: &str,
        data_dir: &str,
        password: &str,
    ) -> Result<u32, String> {
        {
            let mut slot = self.child.lock();
            if let Some(ref mut ch) = *slot {
                if ch.try_wait().map_err(|e| e.to_string())?.is_none() {
                    return Err("FNN is already running".to_string());
                }
            }
            *slot = None;
        }

        {
            let mut g = self.logs.lock();
            g.clear();
        }

        if !Path::new(binary).exists() {
            return Err(format!("fnn binary not found: {binary}"));
        }
        if !Path::new(config).exists() {
            return Err(format!("config not found: {config}"));
        }
        std::fs::create_dir_all(data_dir).map_err(|e| e.to_string())?;

        let mut cmd = Command::new(binary);
        cmd.args(["-c", config, "-d", data_dir]);
        cmd.env("FIBER_SECRET_KEY_PASSWORD", password);
        if let Ok(rust_log) = std::env::var("RUST_LOG") {
            cmd.env("RUST_LOG", rust_log);
        } else {
            cmd.env("RUST_LOG", "info");
        }
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());
        cmd.stdin(Stdio::null());

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("failed to spawn fnn ({binary}): {e}"))?;

        let pid = child.id();

        if let Some(out) = child.stdout.take() {
            let logs = self.logs.clone();
            thread::spawn(move || {
                let reader = BufReader::new(out);
                for line in reader.lines().map_while(Result::ok) {
                    Self::push_line(&logs, format!("[out] {line}"));
                }
            });
        }
        if let Some(err) = child.stderr.take() {
            let logs = self.logs.clone();
            thread::spawn(move || {
                let reader = BufReader::new(err);
                for line in reader.lines().map_while(Result::ok) {
                    Self::push_line(&logs, format!("[err] {line}"));
                }
            });
        }

        let mut slot = self.child.lock();
        *slot = Some(child);
        Ok(pid)
    }

    pub fn stop(&self) -> Result<(), String> {
        let mut slot = self.child.lock();
        if let Some(mut ch) = slot.take() {
            let _ = ch.kill();
            let _ = ch.wait();
        }
        Ok(())
    }

    pub fn status_payload(&self) -> FnnStatusPayload {
        let mut slot = self.child.lock();
        if let Some(ref mut ch) = *slot {
            match ch.try_wait() {
                Ok(None) => FnnStatusPayload {
                    kind: "running",
                    pid: Some(ch.id()),
                    exit_code: None,
                },
                Ok(Some(status)) => {
                    let code = status.code();
                    *slot = None;
                    FnnStatusPayload {
                        kind: "crashed",
                        pid: None,
                        exit_code: code,
                    }
                }
                Err(_) => {
                    *slot = None;
                    FnnStatusPayload {
                        kind: "crashed",
                        pid: None,
                        exit_code: None,
                    }
                }
            }
        } else {
            FnnStatusPayload {
                kind: "stopped",
                pid: None,
                exit_code: None,
            }
        }
    }

    pub fn logs_tail(&self, max: usize) -> Vec<String> {
        let g = self.logs.lock();
        let skip = g.len().saturating_sub(max);
        g.iter().skip(skip).cloned().collect()
    }
}
