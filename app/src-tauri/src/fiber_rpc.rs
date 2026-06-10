use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;

const RPC_TIMEOUT: Duration = Duration::from_secs(3);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FiberRpcError {
    pub kind: FiberRpcErrorKind,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FiberRpcErrorKind {
    Config,
    Transport,
    Parse,
    Rpc,
    MissingResult,
}

impl FiberRpcError {
    pub fn to_json_string(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|_| self.message.clone())
    }

    /// Best-effort display text when only the serialized error string is available.
    pub fn message_from_json(raw: &str) -> String {
        serde_json::from_str::<FiberRpcError>(raw)
            .map(|err| err.message)
            .unwrap_or_else(|_| raw.to_string())
    }
}

fn jsonrpc_error(err: &Value) -> FiberRpcError {
    FiberRpcError {
        kind: FiberRpcErrorKind::Rpc,
        message: err
            .get("message")
            .and_then(|m| m.as_str())
            .unwrap_or("Unknown RPC error")
            .to_string(),
        code: err.get("code").and_then(|c| c.as_i64()),
        data: err
            .get("data")
            .cloned()
            .filter(|d| !d.is_null()),
    }
}

pub fn empty_rpc_url_error() -> String {
    FiberRpcError {
        kind: FiberRpcErrorKind::Config,
        message: "FNN RPC URL is empty; set it in Settings.".to_string(),
        code: None,
        data: None,
    }
    .to_json_string()
}

pub fn call(rpc_url: &str, method: &str, params: Value) -> Result<Value, String> {
    let _ = method;
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
        .timeout(RPC_TIMEOUT)
        .send_json(body)
        .map_err(|e| {
            FiberRpcError {
                kind: FiberRpcErrorKind::Transport,
                message: e.to_string(),
                code: None,
                data: None,
            }
            .to_json_string()
        })?
        .into_json()
        .map_err(|e| {
            FiberRpcError {
                kind: FiberRpcErrorKind::Parse,
                message: e.to_string(),
                code: None,
                data: None,
            }
            .to_json_string()
        })?;

    if let Some(err) = resp.get("error") {
        return Err(jsonrpc_error(err).to_json_string());
    }

    resp.get("result")
        .cloned()
        .ok_or_else(|| {
            FiberRpcError {
                kind: FiberRpcErrorKind::MissingResult,
                message: "RPC response missing result".to_string(),
                code: None,
                data: None,
            }
            .to_json_string()
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn jsonrpc_error_extracts_message_and_code() {
        let err = json!({
            "code": -32000,
            "message": "channel not ready",
            "data": null
        });
        let parsed = jsonrpc_error(&err);
        assert_eq!(parsed.message, "channel not ready");
        assert_eq!(parsed.code, Some(-32000));
        assert!(parsed.data.is_none());
    }

    #[test]
    fn serialized_error_round_trips_message() {
        let err = jsonrpc_error(&json!({
            "code": -32999,
            "message": "Unauthorized"
        }));
        let json = err.to_json_string();
        assert_eq!(FiberRpcError::message_from_json(&json), "Unauthorized");
    }
}
