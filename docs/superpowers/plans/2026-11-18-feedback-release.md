# Feedback release implementation plan

**Goal:** Release v1.0.33 with voluntary feedback delivered through the existing Cloudflare Pages API to Discord, and verify landing page release synchronization.

**Architecture:** Browser posts to loopback Tracker server. Server validates fields and adds running build metadata, then calls the fixed HTTPS Pages endpoint. Only Cloudflare stores the Discord webhook secret. No game data is sent automatically.

**Tech Stack:** Existing Node.js HTTP server, static HTML/CSS/JavaScript, Pages Functions, Discord webhook.

## Constraints and review focus
- Preserve Scanner, history, Shortlist and updater behavior.
- No secret in repository, assets or release packages.
- Reject invalid input, oversized bodies, foreign browser origins, rapid duplicates and upstream errors.
- Use an acknowledged Discord response; do not automatically retry ambiguous sends.
- Report cached landing data accurately and verify actual ZIP/Setup assets.

## Tasks
- [ ] Add Pages feedback endpoint with tests, request limits and private secret configuration.
- [ ] Replace local-only sender with the fixed relay, verify errors and existing tests; retain approved UI.
- [ ] Update README/privacy/version, build and inspect ZIP/Setup, scan for secrets.
- [ ] Commit and push web/app, publish verified assets, verify live release/API/landing synchronization.
