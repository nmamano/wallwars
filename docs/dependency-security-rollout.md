# Dependency security rollout

Last verified: 2026-08-30

This runbook covers a later, separately approved rollout of dependency-only security updates. It does not authorize a deployment.

## Release inputs

- Use the reviewed commit that contains only the approved dependency manifests, lockfiles, and this document.
- Record the commit ID and the reviewed dependency-diff fingerprint before rollout.
- Confirm that both lockfiles install without modification.
- Use Node 22 for baseline and release verification. The backend container declares `node:22-slim` in both build and runtime stages.
- Confirm the resolved versions for each fixed advisory. Do not treat a lower audit count as proof of a fix.
- Record all residual advisory package paths and the reason each path remains.

## Pre-rollout verification

Backend:

1. Run `npm ci` with Node 22.
2. Run `npm ls --all --json` and require a clean dependency graph.
3. Run `npm audit --json` and compare each resolved package version with its advisory range.
4. Run the backend test entry point. Record that this legacy repository currently has a placeholder test that exits with status 1.
5. Run `npm run build` and require a successful TypeScript build.
6. Build the backend Dockerfile and confirm that the production stage starts `dist/app.js` on the declared service port.

Frontend:

1. Run `npm ci` with Node 22.
2. Run `npm ls --all --json` and require a clean dependency graph.
3. Run `npm audit --json` and record exact residual paths.
4. Frontend tests were removed with the CRA test libraries; run `npm run build` (tsc, then Vite) and require a successful optimized build.
5. Run the reviewed browser-persistence checks for theme, dark mode, private and rated settings, board dimensions, sound volume, and board zoom.

## Gated rollout coordination

Each deployment needs separate approval. A push to `master` is a deployment: GitHub Actions builds and checks the backend and frontend images, and when both pass, it moves the `master` tag on both images. The self-hosted server follows that tag and deploys both images automatically. Do not push the reviewed commit before the rollout is approved.

The server switches the frontend as soon as it deploys it. The backend swap waits for the drain gate: the server waits until no game is in flight, turns on draining (the backend then refuses new games, joins and rematches), checks again, and then replaces the backend container. If no quiet moment occurs within the wait limit, the server does not swap the backend, and an operator decides.

Thus the new frontend can run with the old backend for some time. The reviewed backend and frontend must remain mutually compatible in either order: verify that both the old and new frontend work with both the old and new backend. If this is not possible, hold the automatic deploy and release the two parts manually in a known order.

At the deployment gate, record the pushed commit, the image digests that the build reports, and the commit that the server reports as deployed. After each part changes, confirm backend health, HTTPS reachability, a normal Socket.IO connection without creating test games, and the `index.html` rewrite for direct client-side routes.

## Post-rollout checks

- Open the lobby and confirm that it renders at desktop and mobile widths.
- Confirm that the browser connects to the backend and receives normal lobby data.
- Confirm that public and private game controls render, but do not create batch test games.
- Reload after changing theme, dark mode, private/rated settings, and board dimensions. Confirm that each setting persists.
- Open an offline or puzzle board. Change sound volume and zoom, leave the board, return, and confirm that both settings persist.
- Confirm that player profile and client-side game routes load directly through the frontend rewrite.
- Review the backend and web server logs for new startup, dependency, connection, or client exceptions.
- Record the deployed commit ID, verification time, and results.

## Rollback

1. Stop the rollout if startup, build, connection, routing, or persistence checks fail.
2. If a backend check fails right after the swap, the deploy puts the previous backend image back automatically. Confirm that it did.
3. Otherwise, revert the bad commit on `master` and push it after approval: the next green build deploys the revert. For a faster rollback, hold the automatic deploy and deploy the previously recorded known-good commit manually. Remove the hold when `master` is fixed. The server keeps the previous frontend releases, so a frontend rollback switches back to one of them.
4. Repeat the service, route, and persistence checks after rollback.
5. Record the failure, the affected commit, the rollback release, and all residual advisories. Do not close an alert until the resolved production package version is outside its advisory range.

The dependency update does not include a database schema migration. If later work adds a schema or runtime migration, it needs a separate rollout and rollback plan.
