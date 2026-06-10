//! Shop agents poll external website APIs for invoice jobs and fulfill them via local FNN.

use crate::fiber_rpc;
use crate::settings::{self, Network};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::JoinHandle;
use std::time::Duration;
use tauri::{AppHandle, Manager};

const DEFAULT_POLL_JOBS_PATH: &str = "/api/merchant/jobs";
const DEFAULT_SUBMIT_INVOICE_PATH: &str = "/api/merchant/invoices";
const MIN_POLL_INTERVAL_SECS: u64 = 3;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShopAgentConfig {
    pub id: String,
    pub name: String,
    pub api_base_url: String,
    pub merchant_id: String,
    pub api_token: String,
    #[serde(default = "default_poll_jobs_path")]
    pub poll_jobs_path: String,
    #[serde(default = "default_submit_invoice_path")]
    pub submit_invoice_path: String,
    #[serde(default = "default_poll_interval_secs")]
    pub poll_interval_secs: u64,
    #[serde(default)]
    pub enabled: bool,
}

fn default_poll_jobs_path() -> String {
    DEFAULT_POLL_JOBS_PATH.to_string()
}

fn default_submit_invoice_path() -> String {
    DEFAULT_SUBMIT_INVOICE_PATH.to_string()
}

fn default_poll_interval_secs() -> u64 {
    5
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShopAgentStatus {
    pub id: String,
    pub running: bool,
    pub last_poll_at: Option<String>,
    pub last_error: Option<String>,
    pub jobs_processed: u64,
    pub last_order_id: Option<String>,
    pub last_invoice_address: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShopAgentRow {
    pub config: ShopAgentConfig,
    pub status: ShopAgentStatus,
}

struct AgentRuntime {
    stop: Arc<AtomicBool>,
    #[allow(dead_code)]
    handle: JoinHandle<()>,
}

pub struct ShopAgentsManager {
    configs: Mutex<Vec<ShopAgentConfig>>,
    statuses: Mutex<HashMap<String, ShopAgentStatus>>,
    runtimes: Mutex<HashMap<String, AgentRuntime>>,
}

impl ShopAgentsManager {
    pub fn new() -> Self {
        Self {
            configs: Mutex::new(Vec::new()),
            statuses: Mutex::new(HashMap::new()),
            runtimes: Mutex::new(HashMap::new()),
        }
    }

    pub fn load_and_start(&self, app: &AppHandle) -> Result<(), String> {
        let configs = load_configs(app)?;
        {
            let mut store = self.configs.lock();
            *store = configs.clone();
        }
        for config in configs {
            if config.enabled {
                self.start_agent(app, &config)?;
            }
        }
        Ok(())
    }

    pub fn list(&self) -> Vec<ShopAgentRow> {
        let configs = self.configs.lock().clone();
        let statuses = self.statuses.lock().clone();
        configs
            .into_iter()
            .map(|config| {
                let status = statuses.get(&config.id).cloned().unwrap_or_else(|| {
                    ShopAgentStatus {
                        id: config.id.clone(),
                        running: false,
                        last_poll_at: None,
                        last_error: None,
                        jobs_processed: 0,
                        last_order_id: None,
                        last_invoice_address: None,
                    }
                });
                ShopAgentRow { config, status }
            })
            .collect()
    }

    pub fn upsert(&self, app: &AppHandle, mut config: ShopAgentConfig) -> Result<ShopAgentRow, String> {
        config.api_base_url = config.api_base_url.trim().trim_end_matches('/').to_string();
        config.merchant_id = config.merchant_id.trim().to_string();
        config.name = config.name.trim().to_string();
        if config.name.is_empty() {
            return Err("Agent name is required.".to_string());
        }
        if config.api_base_url.is_empty() {
            return Err("Shop API URL is required.".to_string());
        }
        if config.merchant_id.is_empty() {
            return Err("Merchant ID is required.".to_string());
        }
        if config.api_token.trim().is_empty() {
            return Err("API token is required.".to_string());
        }
        if config.id.trim().is_empty() {
            config.id = new_agent_id();
        }
        config.poll_interval_secs = config.poll_interval_secs.max(MIN_POLL_INTERVAL_SECS);
        if config.poll_jobs_path.trim().is_empty() {
            config.poll_jobs_path = default_poll_jobs_path();
        }
        if config.submit_invoice_path.trim().is_empty() {
            config.submit_invoice_path = default_submit_invoice_path();
        }

        self.stop_agent(&config.id);

        {
            let mut configs = self.configs.lock();
            if let Some(existing) = configs.iter_mut().find(|c| c.id == config.id) {
                *existing = config.clone();
            } else {
                configs.push(config.clone());
            }
        }

        save_configs(app, &self.configs.lock())?;

        if config.enabled {
            self.start_agent(app, &config)?;
        } else {
            self.set_status_stopped(&config.id);
        }

        Ok(self
            .list()
            .into_iter()
            .find(|row| row.config.id == config.id)
            .expect("agent row exists after upsert"))
    }

    pub fn delete(&self, app: &AppHandle, id: &str) -> Result<(), String> {
        self.stop_agent(id);
        {
            let mut configs = self.configs.lock();
            configs.retain(|c| c.id != id);
            save_configs(app, &configs)?;
        }
        self.statuses.lock().remove(id);
        Ok(())
    }

    pub fn set_enabled(&self, app: &AppHandle, id: &str, enabled: bool) -> Result<ShopAgentRow, String> {
        let config = {
            let mut configs = self.configs.lock();
            let Some(agent) = configs.iter_mut().find(|c| c.id == id) else {
                return Err("Agent not found.".to_string());
            };
            agent.enabled = enabled;
            agent.clone()
        };
        save_configs(app, &self.configs.lock())?;
        self.stop_agent(id);
        if enabled {
            self.start_agent(app, &config)?;
        } else {
            self.set_status_stopped(id);
        }
        Ok(self
            .list()
            .into_iter()
            .find(|row| row.config.id == id)
            .expect("agent row exists"))
    }

    fn start_agent(&self, app: &AppHandle, config: &ShopAgentConfig) -> Result<(), String> {
        if self.runtimes.lock().contains_key(&config.id) {
            return Ok(());
        }

        let stop = Arc::new(AtomicBool::new(false));
        let stop_flag = stop.clone();
        let app_handle = app.clone();
        let agent_config = config.clone();

        let handle = std::thread::spawn(move || {
            agent_loop(app_handle, agent_config, stop_flag);
        });

        self.runtimes.lock().insert(
            config.id.clone(),
            AgentRuntime { stop, handle },
        );

        {
            let mut statuses = self.statuses.lock();
            let entry = statuses.entry(config.id.clone()).or_insert_with(|| ShopAgentStatus {
                id: config.id.clone(),
                running: false,
                last_poll_at: None,
                last_error: None,
                jobs_processed: 0,
                last_order_id: None,
                last_invoice_address: None,
            });
            entry.running = true;
            entry.last_error = None;
        }

        Ok(())
    }

    fn stop_agent(&self, id: &str) {
        if let Some(runtime) = self.runtimes.lock().remove(id) {
            runtime.stop.store(true, Ordering::Relaxed);
        }
        self.set_status_stopped(id);
    }

    fn set_status_stopped(&self, id: &str) {
        if let Some(status) = self.statuses.lock().get_mut(id) {
            status.running = false;
        }
    }

    fn record_poll_ok(&self, id: &str) {
        let mut statuses = self.statuses.lock();
        let entry = statuses.entry(id.to_string()).or_insert_with(|| ShopAgentStatus {
            id: id.to_string(),
            running: true,
            last_poll_at: None,
            last_error: None,
            jobs_processed: 0,
            last_order_id: None,
            last_invoice_address: None,
        });
        entry.running = true;
        entry.last_poll_at = Some(iso_now());
        entry.last_error = None;
    }

    fn record_poll_error(&self, id: &str, message: String) {
        let mut statuses = self.statuses.lock();
        let entry = statuses.entry(id.to_string()).or_insert_with(|| ShopAgentStatus {
            id: id.to_string(),
            running: true,
            last_poll_at: None,
            last_error: None,
            jobs_processed: 0,
            last_order_id: None,
            last_invoice_address: None,
        });
        entry.last_error = Some(message);
        entry.last_poll_at = Some(iso_now());
    }

    fn record_job_done(
        &self,
        id: &str,
        order_id: &str,
        invoice_address: &str,
    ) {
        let mut statuses = self.statuses.lock();
        if let Some(entry) = statuses.get_mut(id) {
            entry.jobs_processed = entry.jobs_processed.saturating_add(1);
            entry.last_order_id = Some(order_id.to_string());
            entry.last_invoice_address = Some(invoice_address.to_string());
            entry.last_error = None;
        }
    }
}

fn agent_loop(app: AppHandle, config: ShopAgentConfig, stop: Arc<AtomicBool>) {
    let interval = Duration::from_secs(config.poll_interval_secs.max(MIN_POLL_INTERVAL_SECS));
    while !stop.load(Ordering::Relaxed) {
        match run_agent_tick(&app, &config) {
            Ok(processed) => {
                let manager = app.state::<ShopAgentsManager>();
                manager.record_poll_ok(&config.id);
                for (order_id, invoice_address) in processed {
                    manager.record_job_done(&config.id, &order_id, &invoice_address);
                }
            }
            Err(err) => {
                let manager = app.state::<ShopAgentsManager>();
                manager.record_poll_error(
                    &config.id,
                    fiber_rpc::FiberRpcError::message_from_json(&err),
                );
            }
        }
        std::thread::sleep(interval);
    }
}

fn run_agent_tick(app: &AppHandle, config: &ShopAgentConfig) -> Result<Vec<(String, String)>, String> {
    let jobs = fetch_invoice_jobs(config)?;
    let settings = settings::load_or_default(app)?;
    let currency = match settings.network {
        Network::Mainnet => "Fibb",
        Network::Testnet => "Fibt",
    };
    let rpc_url = settings.fnn_rpc_url.trim().to_string();
    if rpc_url.is_empty() {
        return Err("FNN RPC URL is empty. Set it in Setup.".to_string());
    }

    let mut done = Vec::new();
    for job in jobs {
        let amount_hex = ckb_to_shannons_hex(&job.amount_ckb)?;
        let mut params = json!({
            "amount": amount_hex,
            "currency": currency,
        });
        if let Some(desc) = job.description.as_ref().filter(|s| !s.trim().is_empty()) {
            params["description"] = json!(desc);
        }

        let invoice_result = fiber_rpc::call(&rpc_url, "new_invoice", json!([params]))?;
        let (invoice_address, payment_hash) = parse_invoice_result(&invoice_result)?;
        submit_invoice(config, &job, &invoice_address, &payment_hash)?;
        done.push((job.order_id, invoice_address));
    }
    Ok(done)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InvoiceJob {
    job_id: String,
    order_id: String,
    amount_ckb: String,
    description: Option<String>,
}

fn fetch_invoice_jobs(config: &ShopAgentConfig) -> Result<Vec<InvoiceJob>, String> {
    let mut url = join_url(&config.api_base_url, &config.poll_jobs_path)?;
    let sep = if url.contains('?') { '&' } else { '?' };
    url.push_str(&format!("{sep}merchantId={}", url_encode(&config.merchant_id)));

    let value: Value = http_json(
        "GET",
        &url,
        &config.api_token,
        None,
    )?;
    let jobs_value = value
        .get("jobs")
        .ok_or_else(|| "Poll response missing `jobs` array.".to_string())?;
    serde_json::from_value(jobs_value.clone())
        .map_err(|e| format!("Invalid jobs payload: {e}"))
}

fn submit_invoice(
    config: &ShopAgentConfig,
    job: &InvoiceJob,
    invoice_address: &str,
    payment_hash: &str,
) -> Result<(), String> {
    let url = join_url(&config.api_base_url, &config.submit_invoice_path)?;
    let body = json!({
        "jobId": job.job_id,
        "orderId": job.order_id,
        "invoiceAddress": invoice_address,
        "paymentHash": payment_hash,
    });
    http_json("POST", &url, &config.api_token, Some(body))?;
    Ok(())
}

fn http_json(
    method: &str,
    url: &str,
    token: &str,
    body: Option<Value>,
) -> Result<Value, String> {
    let agent = ureq::AgentBuilder::new().timeout(Duration::from_secs(15)).build();
    let response = match method {
        "GET" => agent
            .get(url)
            .set("Accept", "application/json")
            .set("Authorization", &format!("Bearer {token}"))
            .call(),
        "POST" => {
            let payload = body.unwrap_or_else(|| json!({}));
            agent
                .post(url)
                .set("Accept", "application/json")
                .set("Content-Type", "application/json")
                .set("Authorization", &format!("Bearer {token}"))
                .send_json(payload)
        }
        other => return Err(format!("Unsupported HTTP method: {other}")),
    }
    .map_err(|e| format!("Shop API request failed: {e}"))?;
    if !(200..300).contains(&response.status()) {
        return Err(format!(
            "Shop API HTTP {}: {}",
            response.status(),
            response.into_string().unwrap_or_default()
        ));
    }
    response
        .into_json()
        .map_err(|e| format!("Shop API returned invalid JSON: {e}"))
}

fn parse_invoice_result(result: &Value) -> Result<(String, String), String> {
    let invoice_address = result
        .get("invoice_address")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "new_invoice did not return invoice_address.".to_string())?;

    let payment_hash = result
        .get("payment_hash")
        .and_then(|v| v.as_str())
        .or_else(|| {
            result
                .get("invoice")
                .and_then(|inv| inv.get("payment_hash"))
                .and_then(|v| v.as_str())
        })
        .or_else(|| {
            result
                .get("invoice")
                .and_then(|inv| inv.get("data"))
                .and_then(|data| data.get("payment_hash"))
                .and_then(|v| v.as_str())
        })
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "new_invoice did not return payment_hash.".to_string())?;

    Ok((invoice_address.to_string(), payment_hash.to_string()))
}

fn ckb_to_shannons_hex(ckb_text: &str) -> Result<String, String> {
    let t = ckb_text.trim().replace(',', "");
    if t.is_empty() {
        return Err("Invoice amount is empty.".to_string());
    }
    let parts: Vec<&str> = t.split('.').collect();
    if parts.len() > 2 {
        return Err(format!("Invalid CKB amount: {ckb_text}"));
    }
    let whole: u128 = parts[0]
        .parse()
        .map_err(|_| format!("Invalid CKB amount: {ckb_text}"))?;
    let frac = parts.get(1).copied().unwrap_or("");
    if frac.len() > 8 {
        return Err(format!("Too many decimal places: {ckb_text}"));
    }
    let frac_shannons: u128 = if frac.is_empty() {
        0
    } else {
        let mut padded = frac.to_string();
        while padded.len() < 8 {
            padded.push('0');
        }
        padded
            .parse()
            .map_err(|_| format!("Invalid CKB fraction: {ckb_text}"))?
    };
    let shannons = whole
        .checked_mul(100_000_000)
        .and_then(|w| w.checked_add(frac_shannons))
        .ok_or_else(|| format!("CKB amount out of range: {ckb_text}"))?;
    if shannons == 0 {
        return Err("CKB amount must be positive.".to_string());
    }
    Ok(format!("0x{:x}", shannons))
}

fn agents_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("shop_agents.json"))
}

fn load_configs(app: &AppHandle) -> Result<Vec<ShopAgentConfig>, String> {
    let path = agents_path(app)?;
    if !path.is_file() {
        return Ok(Vec::new());
    }
    let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| format!("Invalid shop_agents.json: {e}"))
}

fn save_configs(app: &AppHandle, configs: &[ShopAgentConfig]) -> Result<(), String> {
    let path = agents_path(app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let raw = serde_json::to_string_pretty(configs).map_err(|e| e.to_string())?;
    std::fs::write(path, raw).map_err(|e| e.to_string())
}

fn new_agent_id() -> String {
    let ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    format!("agent_{ms}")
}

fn iso_now() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("{secs}")
}

fn join_url(base: &str, path: &str) -> Result<String, String> {
    let path = path.trim();
    if path.starts_with("http://") || path.starts_with("https://") {
        return Ok(path.to_string());
    }
    let base = base.trim_end_matches('/');
    let path = if path.starts_with('/') {
        path.to_string()
    } else {
        format!("/{path}")
    };
    Ok(format!("{base}{path}"))
}

fn url_encode(value: &str) -> String {
    value
        .bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                (b as char).to_string()
            }
            _ => format!("%{b:02X}"),
        })
        .collect()
}
