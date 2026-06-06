# Shop agents — follow-up work

The **Agents** tab and Rust poller are implemented. See [SHOP-AGENTS.md](./SHOP-AGENTS.md).

## Done

- [x] Agents tab in UI (multi-agent list + add/edit/remove)
- [x] Background polling per agent (`shop_agents.rs`)
- [x] Configurable API URL, merchant ID, token, paths, poll interval
- [x] Start / stop per agent
- [x] Status: last poll, jobs processed, last error, last invoice

## Later

- [ ] Store API tokens in keychain (per agent id) instead of `shop_agents.json`
- [ ] Poll `get_invoice` after submit and notify shop when paid
- [ ] Desktop notification on new job / invoice paid
- [ ] Persist agents across app restart (already saved; verify QA)
- [ ] Pairing wizard UI (generate code on shop → paste token here)
- [ ] Example reference shop backend in docs or separate repo
- [ ] Release QA checklist in [RELEASE_QA.md](./RELEASE_QA.md)
