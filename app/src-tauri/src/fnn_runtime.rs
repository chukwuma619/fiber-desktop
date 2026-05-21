use parking_lot::Mutex;
use serde::Serialize;
use std::collections::VecDeque;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

/// Emitted for each new log line while fnn is owned by this app session.
pub const FNN_LOG_LINE_EVENT: &str = "fnn-log-line";

const LOG_CAP: usize = 800;

/// Remove common ANSI escape sequences so logs are readable in the UI textarea.
fn strip_ansi_escapes(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut it = s.chars().peekable();
    while let Some(c) = it.next() {
        if c != '\u{1b}' {
            out.push(c);
            continue;
        }

        match it.next() {
            // CSI: ESC [ ... final-byte
            Some('[') => {
                for x in it.by_ref() {
                    let code = x as u32;
                    if (0x40..=0x7e).contains(&code) {
                        break;
                    }
                }
            }
            // OSC: ESC ] ... BEL or ST
            Some(']') => {
                let mut saw_esc = false;
                for x in it.by_ref() {
                    if x == '\u{7}' || (saw_esc && x == '\\') {
                        break;
                    }
                    saw_esc = x == '\u{1b}';
                }
            }
            // DCS/PM/APC: ESC P/^/_ ... ST
            Some('P' | '^' | '_') => {
                let mut saw_esc = false;
                for x in it.by_ref() {
                    if saw_esc && x == '\\' {
                        break;
                    }
                    saw_esc = x == '\u{1b}';
                }
            }
            // Single-character escape sequence.
            Some(_) => {}
            None => {}
        }
    }
    out
}

/// Returns true if the process with the given PID is currently alive.
fn pid_is_alive(pid: u32) -> bool {
    #[cfg(target_os = "linux")]
    {
        let proc_dir = Path::new("/proc").join(pid.to_string());
        if !proc_dir.exists() {
            return false;
        }
        if let Ok(stat) = std::fs::read_to_string(proc_dir.join("stat")) {
            if let Some((_, rest)) = stat.rsplit_once(") ") {
                return !rest.starts_with('Z');
            }
        }
        true
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("ps")
            .args(["-o", "stat=", "-p", &pid.to_string()])
            .stderr(Stdio::null())
            .output()
            .map(|o| o.status.success() && !String::from_utf8_lossy(&o.stdout).contains('Z'))
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
        thread::sleep(Duration::from_millis(500));
        if pid_is_alive(pid) {
            let _ = Command::new("/bin/kill")
                .args(["-9", &pid.to_string()])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status();
        }
        let deadline = Instant::now() + Duration::from_secs(5);
        while pid_is_alive(pid) && Instant::now() < deadline {
            thread::sleep(Duration::from_millis(100));
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FnnRuntimeSnapshot {
    pub status: FnnStatusPayload,
    pub logs: Vec<String>,
}

pub struct FnnRuntime {
    child: Mutex<Option<FnnSlot>>,
    pid_file: Mutex<Option<PathBuf>>,
    logs: Arc<Mutex<VecDeque<String>>>,
    app: Mutex<Option<AppHandle>>,
}

impl FnnRuntime {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
            pid_file: Mutex::new(None),
            logs: Arc::new(Mutex::new(VecDeque::new())),
            app: Mutex::new(None),
        }
    }

    pub fn attach_app(&self, app: AppHandle) {
        *self.app.lock() = Some(app);
    }

    fn app_handle(&self) -> Option<AppHandle> {
        self.app.lock().clone()
    }

    fn push_line(logs: &Arc<Mutex<VecDeque<String>>>, app: Option<&AppHandle>, line: String) {
        {
            let mut g = logs.lock();
            if g.len() >= LOG_CAP {
                g.pop_front();
            }
            g.push_back(line.clone());
        }
        if let Some(app) = app {
            let _ = app.emit(FNN_LOG_LINE_EVENT, line);
        }
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
        }
        let app = self.app_handle();
        let logs = self.logs.clone();
        Self::push_line(
            &logs,
            app.as_ref(),
            format!("[fiber-desktop] Reconnected to running fnn process (PID {pid})."),
        );
        Self::push_line(
            &logs,
            app.as_ref(),
            "[fiber-desktop] Logs from before this session are not available.".to_string(),
        );
        *slot = Some(FnnSlot::Adopted(pid));
        true
    }

    /// Spawn fnn. Does not log the password.
    pub fn start(
        &self,
        app: &AppHandle,
        binary: &str,
        config: &str,
        data_dir: &str,
        password: &str,
    ) -> Result<u32, String> {
        {
            let mut slot = self.child.lock();
            if let Some(FnnSlot::Owned(ch)) = &mut *slot {
                if ch.try_wait().map_err(|e| e.to_string())?.is_none() {
                    return Err("FNN is already running".to_string());
                }
            } else if let Some(FnnSlot::Adopted(pid)) = &*slot {
                if pid_is_alive(*pid) {
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

        let log_app = app.clone();
        if let Some(out) = child.stdout.take() {
            let logs = self.logs.clone();
            let emit_app = log_app.clone();
            thread::spawn(move || {
                let reader = BufReader::new(out);
                for line in reader.lines().map_while(Result::ok) {
                    let clean = strip_ansi_escapes(&line);
                    Self::push_line(&logs, Some(&emit_app), format!("[out] {clean}"));
                }
            });
        }
        if let Some(err) = child.stderr.take() {
            let logs = self.logs.clone();
            thread::spawn(move || {
                let reader = BufReader::new(err);
                for line in reader.lines().map_while(Result::ok) {
                    let clean = strip_ansi_escapes(&line);
                    Self::push_line(&logs, Some(&log_app), format!("[err] {clean}"));
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

    pub fn remember_pid_file(&self, path: PathBuf) {
        *self.pid_file.lock() = Some(path);
    }

    pub fn take_pid_file(&self) -> Option<PathBuf> {
        self.pid_file.lock().take()
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
        if max == 0 {
            return Vec::new();
        }
        let g = self.logs.lock();
        let skip = g.len().saturating_sub(max);
        g.iter().skip(skip).cloned().collect()
    }

    pub fn runtime_snapshot(&self, max_log_lines: usize) -> FnnRuntimeSnapshot {
        FnnRuntimeSnapshot {
            status: self.status_payload(),
            logs: self.logs_tail(max_log_lines),
        }
    }
}
