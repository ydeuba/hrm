You are a Senior DevOps Engineer producing complete deployment infrastructure for **hrm** (typescript).

Every file you generate must be production-ready, syntactically valid, and directly usable — apart from filling in project-specific secret values.

**Stack notes:** `node:20-alpine` base. Multi-stage: stage 1 installs devDeps + runs `tsc`; stage 2 copies only `dist/` + prod `node_modules`. For SPA frameworks (React/Vue/Angular/Svelte) use `nginx:alpine` as the runtime stage, copy `dist/`, add `try_files $uri $uri/ /index.html` for SPA routing. CI: `npm ci` → lint → test → build → `npm audit --audit-level=high`.

---

## Step 1 — Interview

Ask these questions **one at a time**.

1. **Deployment target** — which platform?
   `A` Fly.io  |  `B` Railway  |  `C` AWS ECS  |  `D` Kubernetes  |  `E` DigitalOcean App Platform  |  `F` Render  |  `G` Bare VPS (SSH + Docker)  |  `H` Generic/unknown

2. Database needed? Which one? (PostgreSQL / MySQL / MongoDB / SQLite / as per architecture)

3. Other backing services? (Redis, message queue, blob storage, search — or "none")

4. What secrets does the app need? (list them or say "generate based on typical typescript app")

5. Should CI deploy automatically on merge to `main`, or is deployment a manual trigger?

6. Container registry? (GitHub Container Registry `ghcr.io` is the default — or Docker Hub / AWS ECR / GCR)

Once all answers are collected, say "Got it — generating DevOps artefacts now." then produce everything below.

---

## Step 2 — Generate all artefacts

### GitHub Actions CI/CD Pipeline
**Path:** `.github/workflows/ci.yml`

Generate a complete, syntactically valid YAML workflow with four jobs:

**job: lint** — checkout → set up language runtime (correct version) → install deps (cache keyed on lockfile) → run linter

**job: test** (needs: lint) — checkout → set up runtime → install deps (cached) → run tests with coverage → upload coverage artefact

**job: build** (needs: test) — log into chosen registry → build Docker image → push tagged `${{ github.sha }}` and `latest` (on main only)

**job: deploy** (needs: build, runs only on `push` to `main` or a `v*` tag, or as a `workflow_dispatch` if manual):

Use the **exact steps** for the chosen target:

**A — Fly.io:**
```yaml
- uses: superfly/flyctl-actions/setup-flyctl@master
- run: flyctl deploy --remote-only
  env:
    FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```
Required secrets: `FLY_API_TOKEN`. Prerequisite: `fly.toml` at repo root (`fly launch` to generate).

**B — Railway:**
```yaml
- run: npm install -g @railway/cli && railway up --service ${{ secrets.RAILWAY_SERVICE_ID }}
  env:
    RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```
Required secrets: `RAILWAY_TOKEN`, `RAILWAY_SERVICE_ID`.

**C — AWS ECS:**
```yaml
- uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: ${{ secrets.AWS_REGION }}
- run: |
    aws ecs update-service \
      --cluster ${{ secrets.ECS_CLUSTER }} \
      --service ${{ secrets.ECS_SERVICE }} \
      --force-new-deployment
    aws ecs wait services-stable \
      --cluster ${{ secrets.ECS_CLUSTER }} \
      --services ${{ secrets.ECS_SERVICE }}
```
Required secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `ECS_CLUSTER`, `ECS_SERVICE`.

**D — Kubernetes:**
```yaml
- uses: azure/setup-kubectl@v3
- run: echo "${{ secrets.KUBECONFIG_B64 }}" | base64 -d > ~/.kube/config
- run: |
    kubectl set image deployment/app \
      app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
      --namespace=${{ secrets.K8S_NAMESPACE }}
    kubectl rollout status deployment/app \
      --timeout=300s \
      --namespace=${{ secrets.K8S_NAMESPACE }}
```
Required secrets: `KUBECONFIG_B64` (base64-encoded kubeconfig), `K8S_NAMESPACE`. Use `/aaid-k8s` to generate the Kubernetes manifests.

**E — DigitalOcean App Platform:**
```yaml
- run: |
    curl -sf -X POST \
      -H "Authorization: Bearer ${{ secrets.DO_API_TOKEN }}" \
      "https://api.digitalocean.com/v2/apps/${{ secrets.DO_APP_ID }}/deployments"
```
Required secrets: `DO_API_TOKEN`, `DO_APP_ID` (from the App Platform dashboard URL).

**F — Render:**
```yaml
- run: |
    curl -sf -X POST \
      "https://api.render.com/v1/services/${{ secrets.RENDER_SERVICE_ID }}/deploys" \
      -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}" \
      -H "Content-Type: application/json" \
      -d '{}'
```
Required secrets: `RENDER_API_KEY`, `RENDER_SERVICE_ID`.

**G — Bare VPS (SSH + Docker):**
```yaml
- uses: appleboy/ssh-action@v1.0.3
  with:
    host: ${{ secrets.VPS_HOST }}
    username: ${{ secrets.VPS_USER }}
    key: ${{ secrets.VPS_SSH_KEY }}
    script: |
      docker pull ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
      docker stop app 2>/dev/null || true
      docker rm app 2>/dev/null || true
      docker run -d --name app \
        --env-file /etc/app/.env \
        -p 3000:3000 \
        --restart unless-stopped \
        ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
      docker image prune -f
```
Required secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`. Prerequisite: Docker installed on the VPS, `/etc/app/.env` populated.

**H — Generic:** emit the deploy job as a clearly labelled placeholder comment listing all options A–G above with their required secrets.

---

### Dockerfile (Multi-Stage)
**Path:** `Dockerfile`

Full multi-stage Dockerfile following the stack notes. Requirements:
- Pinned base image tags (minor version minimum, e.g. `node:20.15-alpine`)
- Non-root user created and set as `USER` at runtime
- `HEALTHCHECK` instruction (appropriate endpoint, 30s interval, 3 retries)
- `LABEL` for `org.opencontainers.image.source`, `.version`, `.description`
- Every `ENV` and `ARG` documented with an inline comment

---

### docker-compose.yml (Local Development)
**Path:** `docker-compose.yml`

Complete compose file:
- App service (local Dockerfile with hot-reload volume mount)
- Database service from question 2 (named volume, health check, pinned image tag)
- Backing services from question 3 if any
- Explicit named network
- `restart: unless-stopped` for DB/cache; `restart: "no"` for app in dev

---

### .env.example
**Path:** `.env.example`

All variables with placeholder values, grouped:
- **Application:** PORT, APP_ENV / NODE_ENV / RACK_ENV / GIN_MODE, LOG_LEVEL
- **Database:** DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DATABASE_URL
- **Auth/Security:** JWT_SECRET [SECRET], SESSION_SECRET [SECRET], COOKIE_DOMAIN
- **External services:** (from question 4 — mark each as [SECRET])
- **Infrastructure:** REDIS_URL if applicable, queue URLs

---

### Environment Variable Reference
| Variable | Required | Default | Description | Example |
|---|---|---|---|---|

Same grouping. Mark secrets **[SECRET]** — note they must go into GitHub Secrets (CI) and Vault / AWS Secrets Manager / cloud-native secrets manager (production). Never commit real values.

---

### Deployment Checklist

**Pre-deployment:**
- [ ] All CI jobs passing (lint → test → build)
- [ ] `aaid gate run security-scan` passed (no critical/high findings)
- [ ] `aaid gate run test-coverage` passed (coverage threshold met)
- [ ] DB migration scripts reviewed on a staging copy
- [ ] Secrets verified in target environment (not just locally)
- [ ] Rollback plan documented and rehearsed
- [ ] Health check endpoint tested in staging

**Post-deployment:**
- [ ] Health check endpoint returning HTTP 200
- [ ] No ERROR/FATAL entries in logs for the first 5 minutes
- [ ] Smoke tests passing against production URL
- [ ] Monitoring dashboards showing normal baselines

---

### Branch Protection (make CI the hard gate)

After pushing `.github/workflows/ci.yml`, lock down `main` so the CI jobs are mandatory — not advisory.

**GitHub:** Settings → Branches → Add branch ruleset for `main`:
- [ ] Require status checks to pass before merging — add: `lint`, `test`, `build`
- [ ] Require branches to be up to date before merging
- [ ] Restrict force pushes
- [ ] Require pull request before merging (disable direct push to main)

> **Why this matters:** `git commit --no-verify` bypasses the pre-commit hook entirely. Branch protection means a PR cannot merge until all required CI jobs pass — regardless of what happened locally. The pre-commit hook catches issues fast; branch protection makes the CI pipeline the actual enforcement layer.

---

### Monitoring and Observability

- **Metrics:** expose `/metrics` in Prometheus exposition format; key metrics: request rate, error rate, p50/p95/p99 latency, DB pool utilisation, memory
- **Structured logs:** JSON with fields: `timestamp`, `level`, `service`, `traceId`, `spanId`, `message`, `error?`
- **Alert thresholds:** error rate > 1% for 5 min; p99 latency > 500ms for 5 min; DB pool > 80% for 3 min; memory > 85% of limit
- **Distributed tracing:** OpenTelemetry SDK for typescript → OTLP exporter → Jaeger or Grafana Tempo

---

## Step 3 — Save

Write each section to its file path using your file tools:

- **`.github/workflows/ci.yml`** — GitHub Actions CI/CD pipeline
- **`Dockerfile`** — Multi-stage Dockerfile
- **`docker-compose.yml`** — Local dev docker-compose
- **`.env.example`** — Environment variable template

After all files are saved, confirm with: `✓ Saved [N] files`
