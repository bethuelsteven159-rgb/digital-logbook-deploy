# Codecov & Testing Setup

This project runs all tests with coverage on every push and pull request using **Gitea Actions**, and uploads the results to **Codecov**.

Codecov only supports GitHub, GitLab, and Bitbucket — not Gitea — so the Codecov project lives on the public GitHub repo `bethuelsteven159-rgb/digital-logbook-deploy`, while CI runs on the Wits Gitea repo. For Codecov to associate reports with the right commits, the GitHub repo must contain the same commits (see step 2).

## How it works

- `.gitea/workflows/tests.yml` — CI on the Wits Gitea repo (every push to `main` and every pull request). Runs all client and server tests with coverage, then uploads the four lcov reports to Codecov using the `CODECOV_TOKEN` secret.
- `.github/workflows/tests.yml` — the same workflow for GitHub (runs automatically if the repo is pushed/mirrored there).
- `codecov.yml` — maps report paths (`src/...`, `services/...`) to real repo paths (`client/src/...`, `server/services/...`) and keeps dead files out of the metrics.
- Per-package coverage scripts:
  - `server`: `npm run test:coverage` → `coverage/lcov.info` (Vitest) + `coverage-node/lcov.info` (Node test runner via c8)
  - `client`: `npm run test:coverage` → same two reports
  - Root: `npm test` and `npm run test:coverage` run both packages.

## One-time setup steps

### 1. Make the GitHub repo public

Codecov is free only for public repositories. On GitHub, open `bethuelsteven159-rgb/digital-logbook-deploy` → **Settings** → General → Danger Zone → **Change repository visibility** → Public.

### 2. Mirror the Gitea repo to GitHub

So Codecov sees the same commit SHAs that CI uploads:

1. On GitHub, create a personal access token (Settings → Developer settings → Personal access tokens) with `repo` scope.
2. On Gitea, open the repo → **Settings** → **Mirror** → add a push mirror:
   - Git Remote URL: `https://github.com/bethuelsteven159-rgb/digital-logbook-deploy.git`
   - Authorization: your GitHub username + the PAT
3. Sync now, then it syncs automatically on every push.

**Warning about Render:** if Render auto-deploys this GitHub repo, every mirrored push triggers a deployment. Either disable auto-deploy in Render (deploy manually), or mirror to a separate public repo instead — and update the Codecov slug in `.gitea/workflows/tests.yml` plus the badge URL in `README.md` to match.

### 3. Create the Codecov project and token

1. Sign in at <https://codecov.io> with your GitHub account.
2. The public repo should appear under "Not yet set up" — click **Setup Repo**.
3. Copy the **repository upload token** (Repo settings → General).

### 4. Add the token to Gitea

On Gitea, open the repo → **Settings** → **Actions** → **Secrets** → add:

- Name: `CODECOV_TOKEN`
- Value: the upload token from step 3

### 5. Push and verify

Push to `main` on Gitea. In the repo's **Actions** tab, the "Tests" workflow should pass. Then check <https://codecov.io/gh/bethuelsteven159-rgb/digital-logbook-deploy> — the report and the README badge will populate after the first successful upload.

The Codecov upload step has `continue-on-error: true`, so CI stays green even while the token/mirror are not yet configured — the tests themselves always gate the build.

## Troubleshooting

- **"Actions" tab missing on Gitea** — the instance has no runners; ask the course administrators, or use the GitHub workflow on a manually-pushed repo instead.
- **Codecov upload fails on Gitea** — the runner may not be able to fetch `codecov/codecov-action@v5` from GitHub. Fallback: replace that step with
  `run: pip install codecov-cli && codecovcli do-upload -t ${{ secrets.CODECOV_TOKEN }} --slug bethuelsteven159-rgb/digital-logbook-deploy -f client/coverage/lcov.info -f client/coverage-node/lcov.info -f server/coverage/lcov.info -f server/coverage-node/lcov.info`
- **Reports show but files are "not found"** — the `fixes:` list in `codecov.yml` maps report paths to repo paths; add an entry if a new top-level source directory is added.
- **Badge shows unknown** — the badge only reflects commits that exist on the GitHub repo (mirror sync).
