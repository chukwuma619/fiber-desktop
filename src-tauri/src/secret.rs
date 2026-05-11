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

/// Whether a password entry exists. Must **not** decrypt the secret: on macOS,
/// `get_password` triggers authentication on every call unless the user chose
/// "Always Allow", which feels like an endless prompt loop when the UI checks often.
#[cfg(target_os = "macos")]
pub fn has_fnn_secret_password() -> Result<bool, String> {
    macos::generic_password_item_exists(SERVICE, USER)
}

#[cfg(not(target_os = "macos"))]
pub fn has_fnn_secret_password() -> Result<bool, String> {
    Ok(get_fnn_secret_password()?.is_some())
}

#[cfg(target_os = "macos")]
mod macos {
    use security_framework::item::{ItemClass, ItemSearchOptions, Limit};

    /// `errSecItemNotFound` — same as keyring's mapping for missing entries.
    const ERR_SEC_ITEM_NOT_FOUND: i32 = -25300;

    pub fn generic_password_item_exists(service: &str, account: &str) -> Result<bool, String> {
        let mut search = ItemSearchOptions::new();
        search.class(ItemClass::generic_password());
        search.service(service);
        search.account(account);
        search.limit(Limit::Max(1));
        search.load_attributes(true);
        search.load_data(false);

        match search.search() {
            Ok(items) => Ok(!items.is_empty()),
            Err(e) => {
                if e.code() == ERR_SEC_ITEM_NOT_FOUND {
                    Ok(false)
                } else {
                    Err(format!("keychain query failed: {e}"))
                }
            }
        }
    }
}
