# ANANSI beta page — operations and verification

13 November 2026. User authorized publishing to the existing Cloudflare-connected GitHub repository. Website source is `robillionair/XelvonXTZ`; ANANSI application source is a separate repository. This change does not certify any application milestone.

## Delivery

- `/Anansi`, `/anansi`, `/anansi/`, and `/anansi.html` use the new page.
- Homepage palette and fonts retained; dramatic memory-compiler imagery is an existing studio asset. All page CSS and JavaScript, including the spider, are inside the HTML. The image and Google Fonts remain external assets.
- One procedural 27px-body jumping spider follows the viewport over the page, with analytic two-bone leg IK, alternating tetrapod steps, stalk/crouch/pounce/retreat/startle states, eyes, markings, pedipalps, hairs and contact shadows. Pointer events pass through it. 112px canvas, DPR capped at 2; hidden tabs suspend; touch/reduced motion default off; visitors can toggle it. No Three.js or Tailwind runtime.
- Other public HTML pages load the same engine through `/spider.js`, guarded against a second spider. Tab-session storage carries only spider position/on-off across pages, never email or pointer history. The site privacy page documents this and distinguishes the beta Cloudflare registry from older Firebase forms.
- HTML is about 30KB before compression. Existing hero JPEG is 367KB. No generated image, inference, tracking pixel, analytics library, or model download.
- Windows pilot installer is bundled in Worker assets; its direct asset route is denied by the Worker. All requests run through the Worker (`run_worker_first = true`), including asset paths. Do not remove this setting without replacing the protection.
- Windows pilot 0.1.0 from 13 November 2026: 10,547,273 bytes, SHA256 `2b0c1c7980b7cf8c62b1d9b621723276ef943208d988ea579a62494da5408d74`, source `6f216e3224e2c855236aac5492f69b467cf8c5d5`. `anansi-installer-provenance.json` and public `/anansi/build.json` preserve identity. No installer was executed during website work.
- Installer is unsigned, experimental, with plaintext workspaces/backups. The page discloses these facts and remaining acceptance/security gates. Owner explicitly requested beta distribution; that does not close production gates. Linux is disabled, coming soon.

## Email access and privacy

`POST /api/anansi/register` checks same-origin, JSON, a 2048-byte stream limit, email shape, explicit consent, Windows platform and a honeypot. The SQLite-backed `AnansiBetaRegistry` Durable Object transaction stores the normalized email, timestamp, platform, source and consent version, then creates a cryptographically random 15-minute capability. Five requests per minute per temporarily hashed IP. Registration and download fail closed if the binding, installer, or persistence is unavailable. Email ownership is not verified; the page says so. No verification or marketing messages are sent.

`GET /api/anansi/download?token=...` verifies the capability against durable storage before streaming an attachment with `private, no-store`. Tokens are reusable during their short lifetime to permit retries. Expired tokens and rate entries are cleaned by an alarm; consent records are retained for the beta and reviewed at its end. No signup records or production credentials belong in Git.

The `ANANSI_BETA` binding and SQLite class migration are declared in root `wrangler.toml`, so Workers deployment provisions the storage without a hand-entered database ID. Use the root config for the full website. `worker/wrangler.toml` is the older standalone backend config and does not describe this site deployment.

Authenticated export: `GET /api/anansi/admin/emails`, with `Authorization: Bearer <ADMIN_KEY>` using the existing Cloudflare secret (minimum 16 characters). Response contains up to 100 subscribers and `nextCursor`; pass it as `?after=` to continue. No key in the repository, client, URL or examples. Without the configured secret, access is denied. Do not repurpose the public newsletter endpoint for this registry. Owner may inspect/remove individual `beta:<normalized-email>` keys through Cloudflare Durable Object storage tooling to fulfill withdrawal/deletion requests. Never export these records into public assets.

## Verification executed

- `npm test`: 14/14 pass, including existing compiler tests, registration/consent, fail-closed persistence, actual installer hash, token forgery/expiry, protected paths, request bounds/origin, throttling, authenticated export/pagination, spider finite animation across 600 simulated frames, hidden-tab suspension and reduced-motion/touch defaults.
- `npx wrangler deploy --dry-run --outdir .wrangler/dry-run`: pass; Worker bundle about 24.6KiB / 7.94KiB gzip. New durable binding and ASSETS recognized.
- Actual local Cloudflare runtime: `npx wrangler dev --port 4182 --local`, then `node scripts/verify-anansi-beta.mjs`: 15 HTTP checks pass, including real capture and downloading the complete installer with the expected SHA256.
- Stopped that Worker process, started a new one with persisted local state, then ran `node scripts/verify-anansi-beta.mjs --resume`: previous capability remained usable and complete downloaded hash matched. The resume script must only be described as a restart test after an actual restart.
- In-app browser: inspected desktop hero at normal viewport and mobile at 390×844; one canvas, no horizontal overflow, `pointer-events: none`; successful synthetic email/consent submission and unlocked download on desktop and mobile. Temporary viewport reset afterward. No sensitive data used.
- Initial preview found an existing clean-URL redirect loop from fetching `/anansi/index.html` through Assets. Fixed Worker mapping to `/anansi/` and reverified all four routes.

Production push/deployment state is recorded after publication. Local dry-run does not prove deployment or production storage. Wrangler has no local Cloudflare authentication; the existing Git-connected Workers Builds deployment is the authorized publication route.

## Recovery

Revert the website commit and push to roll back page/Worker code. Do not delete the Durable Object migration history or its stored emails as part of a routine rollback. Preserve installer provenance. The original app checkout and private application data are untouched. Tests use only synthetic emails in local ignored `.wrangler/` state.
