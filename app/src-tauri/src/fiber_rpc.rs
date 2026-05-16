use serde_json::{json, Value};

pub fn call(rpc_url: &str, method: &str, params: Value) -> Result<Value, String> {
    let id = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();

    let body = json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": method,
        "params": params,
    });

    let resp: Value = ureq::post(rpc_url.trim_end_matches('/'))
        .set("Content-Type", "application/json")
        .send_json(body)
        .map_err(|e| format!("RPC transport error: {e}"))?
        .into_json()
        .map_err(|e| format!("invalid JSON from node: {e}"))?;

    if let Some(err) = resp.get("error") {
        return Err(format!("RPC error: {}", err));
    }

    resp.get("result")
        .cloned()
        .ok_or_else(|| "RPC response missing result".to_string())
}
