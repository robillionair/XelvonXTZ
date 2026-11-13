# Website build status — 13 November 2026

Last verified implementation commit: `9a1e821`.

ANANSI beta page is live at `https://robillionair.com/Anansi`. Git-connected Cloudflare build `55a5de6e-0691-4746-aea6-f32c7cdc38ef` succeeded. Production browser signup and full Windows installer download verified; SHA256 `2b0c1c7980b7cf8c62b1d9b621723276ef943208d988ea579a62494da5408d74` matches the packaged pilot. Direct/unauthorized access denied. See [operations and evidence](ANANSI-beta-operations.md) and [acceptance plan](ANANSI-beta-page-plan.md).

14/14 tests pass, production Worker dry-run passes, actual local runtime HTTP and restart persistence pass, desktop/mobile browser inspection passes. The one spider works across public pages. Linux is coming soon. Pilot is unsigned with plaintext workspaces/backups; no production application/security certification is implied.

These documentation/evidence updates do not change runtime code. The application repository is separate; do not infer its last verified application commit from this website record.
