use parking_lot::Mutex;

pub struct AppUxState {
    hide_on_close: Mutex<bool>,
}

impl AppUxState {
    pub fn new() -> Self {
        Self {
            hide_on_close: Mutex::new(true),
        }
    }

    pub fn set_hide_on_close(&self, enabled: bool) {
        *self.hide_on_close.lock() = enabled;
    }

    pub fn hide_on_close(&self) -> bool {
        *self.hide_on_close.lock()
    }
}

impl Default for AppUxState {
    fn default() -> Self {
        Self::new()
    }
}
