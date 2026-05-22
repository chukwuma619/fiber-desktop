# Security policy

## Supported versions

Security fixes are applied to the latest release on the default branch (`main`). Older tagged releases may not receive backports unless noted in a release announcement.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Email **chukwuma619@gmail.com** with:

- A description of the issue and impact
- Steps to reproduce (proof of concept if available)
- Affected version or commit hash
- Your environment (OS, app version)

We aim to acknowledge reports within a few business days and will coordinate disclosure after a fix is available.

## Scope notes

Fiber Desktop is a **local-first** application:

- The Fiber node (`fnn`) runs on the user’s machine.
- CKB private keys are stored in a user-chosen file (`{data_dir}/ckb/key`) and protected with a password stored in the OS keychain (or equivalent).
- There is **no** hosted wallet or remote key custody in this repository.

Issues in the upstream **Fiber protocol or `fnn` binary** should be reported to [nervosnetwork/fiber](https://github.com/nervosnetwork/fiber) when they affect the node itself rather than the desktop shell.

## Safe development practices

- Do not commit private keys, keychain passwords, or real `config.yml` files with secrets.
- Review [Tauri capability](https://v2.tauri.app/reference/acl/capability/) changes carefully; they control plugin access from the webview.
