use parking_lot::Mutex;
use serde::Serialize;
use std::collections::VecDeque;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::Arc;
use std::thread;

const LOG_CAP: usize = 800;

/// Remove common ANSI CSI color sequences so logs are readable in the UI textarea.
fn strip_ansi_escapes(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut it = s.chars().peekable();
    while let Some(c) = it.next() {
        if c == '\u{1b}' && it.peek() == Some(&'[') {
            it.next();
            for x in it.by_ref() {
                let code = x as u32;
                if (0x40..=0x7e).contains(&code) {
                    break;
                }
            }
        } else {
            out.push(c);
        }
    }
    out
}

/// Returns true if the process with the given PID is currently alive.
fn pid_is_alive(pid: u32) -> bool {
    #[cfg(target_os = "linux")]
    {
        Path::new(&format!("/proc/{pid}")).exists()
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("ps")
            .args(["-p", &pid.to_string()])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
        // We approximate by checking if `tasklist /FI "PID eq {pid}"` returns a line.
        Command::new("tasklist")
            .args(["/FI", &format!("PID eq {pid}"), "/NH"])
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).contains(&pid.to_string()))
            .unwrap_or(false)
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos", windows)))]
    {
        false
    }
}

/// Send SIGTERM then SIGKILL to an adopted process.
fn kill_pid(pid: u32) {
    #[cfg(unix)]
    {
        let _ = Command::new("/bin/kill")
            .arg(pid.to_string())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
        // Give the process a moment to exit cleanly before forcing.
        std::thread::sleep(std::time::Duration::from_millis(500));
        if pid_is_alive(pid) {
            let _ = Command::new("/bin/kill")
                .args(["-9", &pid.to_string()])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status();
        }
    }
    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(["/F", "/PID", &pid.to_string()])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
}

/// The two ways the runtime can own an fnn process.
enum FnnSlot {
    /// Spawned by this app session – we hold the `Child` handle.
    Owned(Child),
    /// Found alive from a previous session – we only have the PID.
    Adopted(u32),
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FnnStatusPayload {
    pub kind: &'static str,
    pub pid: Option<u32>,
    pub exit_code: Option<i32>,
}

pub struct FnnRuntime {
    child: Mutex<Option<FnnSlot>>,
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

    /// Try to adopt an orphaned fnn process from a previous session.
    /// Returns `true` when the PID is alive and the slot was set.
    pub fn adopt(&self, pid: u32) -> bool {
        if !pid_is_alive(pid) {
            return false;
        }
        let mut slot = self.child.lock();
        // Don't override a currently-running owned process.
        if let Some(FnnSlot::Owned(ref mut ch)) = *slot {
            if ch.try_wait().ok().flatten().is_none() {
                return false;
            }
        }
        {
            let mut g = self.logs.lock();
            g.clear();
            g.push_back(format!(
                "[fiber-desktop] Reconnected to running fnn process (PID {pid})."
            ));
            g.push_back(
                "[fiber-desktop] Logs from before this session are not available.".to_string(),
            );
        }
        *slot = Some(FnnSlot::Adopted(pid));
        true
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
            match &mut *slot {
                Some(FnnSlot::Owned(ref mut ch)) => {
                    if ch.try_wait().map_err(|e| e.to_string())?.is_none() {
                        return Err("FNN is already running".to_string());
                    }
                }
                Some(FnnSlot::Adopted(pid)) => {
                    if pid_is_alive(*pid) {
                        return Err("FNN is already running".to_string());
                    }
                }
                None => {}
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
                    let clean = strip_ansi_escapes(&line);
                    Self::push_line(&logs, format!("[out] {clean}"));
                }
            });
        }
        if let Some(err) = child.stderr.take() {
            let logs = self.logs.clone();
            thread::spawn(move || {
                let reader = BufReader::new(err);
                for line in reader.lines().map_while(Result::ok) {
                    let clean = strip_ansi_escapes(&line);
                    Self::push_line(&logs, format!("[err] {clean}"));
                }
            });
        }

        let mut slot = self.child.lock();
        *slot = Some(FnnSlot::Owned(child));
        Ok(pid)
    }

    pub fn stop(&self) -> Result<(), String> {
        let mut slot = self.child.lock();
        match slot.take() {
            Some(FnnSlot::Owned(mut ch)) => {
                let _ = ch.kill();
                let _ = ch.wait();
            }
            Some(FnnSlot::Adopted(pid)) => {
                kill_pid(pid);
            }
            None => {}
        }
        Ok(())
    }

    pub fn status_payload(&self) -> FnnStatusPayload {
        let mut slot = self.child.lock();
        match &mut *slot {
            Some(FnnSlot::Owned(ref mut ch)) => match ch.try_wait() {
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
            },
            Some(FnnSlot::Adopted(pid)) => {
                let pid = *pid;
                if pid_is_alive(pid) {
                    FnnStatusPayload {
                        kind: "running",
                        pid: Some(pid),
                        exit_code: None,
                    }
                } else {
                    *slot = None;
                    FnnStatusPayload {
                        kind: "stopped",
                        pid: None,
                        exit_code: None,
                    }
                }
            }
            None => FnnStatusPayload {
                kind: "stopped",
                pid: None,
                exit_code: None,
            },
        }
    }

    pub fn logs_tail(&self, max: usize) -> Vec<String> {
        let g = self.logs.lock();
        let skip = g.len().saturating_sub(max);
        g.iter().skip(skip).cloned().collect()
    }
}
