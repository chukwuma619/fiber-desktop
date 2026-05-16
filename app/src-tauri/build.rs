fn main() {
    let target = std::env::var("TARGET").expect("TARGET must be set by Cargo for build.rs");
    println!("cargo:rustc-env=FIBER_DESKTOP_TARGET_TRIPLE={target}");
    tauri_build::build()
}
