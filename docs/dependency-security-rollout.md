# Dependency security rollout

Last verified: 2026-08-30

This runbook covers a later, separately approved rollout of dependency-only security updates. It does not authorize a deployment.

## Release inputs

- Use the reviewed commit that contains only the approved dependency manifests, lockfiles, and this document.
- Record the commit ID and the reviewed dependency-diff fingerprint before rollout.
- Confirm that both lockfiles install without modification.
- Use Node 18 for baseline and release verification. The backend container declares `node:18-slim` in both build and runtime stages.
- Confirm the resolved versions for each fixed advisory. Do not treat a lower audit count as proof of a fix.
- Record all residual advisory package paths and the reason each path remains.

## Pre-rollout verification

Backend:

1. Run `npm ci` with Node 18.
2. Run `npm ls --all --json` and require a clean dependency graph.
3. Run `npm audit --json` and compare each resolved package version with its advisory range.
4. Run the backend test entry point. Record that this legacy repository currently has a placeholder test that exits with status 1.
5. Run `npm run build` and require a successful TypeScript build.
6. Build the backend Dockerfile and confirm that the production stage starts `dist/app.js` on the declared service port.

Frontend:

1. Run `npm ci` with Node 18.
2. Run `npm ls --all --json` and require a clean dependency graph.
3. Run `npm audit --json` and record exact residual paths.
4. Run `CI=true npm test -- --watchAll=false`. Record the current expected no-tests result until tests are added.
5. Run `npm run build` and require a successful optimized build.
6. Run the reviewed browser-persistence checks for theme, dark mode, private and rated settings, board dimensions, sound volume, and board zoom.

## Gated rollout coordination

Each deployment needs separate approval. Before a rollout, confirm how the Vercel project is triggered and whether an authorized operator can hold, cancel, or promote a frontend deployment. The repository README describes Vercel continuous deployment, so this runbook does not assume that the backend and frontend can be released manually in sequence.

The reviewed backend and frontend must remain mutually compatible throughout the release window. If Vercel deployment is automatic and cannot be held, use one of these later-approved coordination methods:

- make the dependency release safe in either order and verify that both the old and new frontend work with both the old and new backend; or
- use the verified Vercel control to hold or delay frontend promotion until the approved backend checks pass.

At the deployment gate, record the actual Vercel trigger, available controls, chosen compatibility method, and rollback controls. Only then define the release order. The backend uses the repository's Fly configuration and `backend/Dockerfile`; the frontend uses the repository's Vercel project. After each platform changes, confirm process or build health, HTTPS reachability, a normal Socket.IO connection without creating test games, and the `index.html` rewrite for direct client-side routes.

## Post-rollout checks

- Open the lobby and confirm that it renders at desktop and mobile widths.
- Confirm that the browser connects to the backend and receives normal lobby data.
- Confirm that public and private game controls render, but do not create batch test games.
- Reload after changing theme, dark mode, private/rated settings, and board dimensions. Confirm that each setting persists.
- Open an offline or puzzle board. Change sound volume and zoom, leave the board, return, and confirm that both settings persist.
- Confirm that player profile and client-side game routes load directly through the frontend rewrite.
- Review backend and frontend platform logs for new startup, dependency, connection, or client exceptions.
- Record the deployed commit ID, verification time, and results.

## Rollback

1. Stop the rollout if startup, build, connection, routing, or persistence checks fail.
2. Redeploy the previously recorded known-good backend release through Fly.
3. Redeploy the previously recorded known-good frontend release through Vercel.
4. Repeat the service, route, and persistence checks after rollback.
5. Record the failure, the affected commit, the rollback release, and all residual advisories. Do not close an alert until the resolved production package version is outside its advisory range.

The dependency update does not include a database schema migration. If later work adds a schema or runtime migration, it needs a separate rollout and rollback plan.
