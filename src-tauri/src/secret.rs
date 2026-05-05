use keyring::Entry;

const SERVICE: &str = "com.ebube.fiber-desktop";
const USER: &str = "fnn_fiber_secret_key_password";

pub fn set_fnn_secret_password(password: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE, USER).map_err(|e| e.to_string())?;
    entry
        .set_password(password)
        .map_err(|e| format!("could not store password in OS keychain: {e}"))
}

pub fn get_fnn_secret_password() -> Result<Option<String>, String> {
    let entry = Entry::new(SERVICE, USER).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(p) => Ok(Some(p)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn has_fnn_secret_password() -> Result<bool, String> {
    Ok(get_fnn_secret_password()?.is_some())
}
