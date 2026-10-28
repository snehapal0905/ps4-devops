# DevOps setup for Trust Juggler

The app (fraud-detection engine + API + React dashboard) is wrapped in a DevOps workflow:

```
git push ─▶ Jenkins ─▶ Lint ─▶ Unit tests ─▶ Train ML model ─▶ Quality gate ─▶ Promote model
                    ─▶ Build Docker images ─▶ Deploy (docker compose) ─▶ Selenium tests ─▶ Live
```

## What was added

| File | Purpose |
|---|---|
| `Jenkinsfile` | The CI/CD pipeline above (Windows or Linux Jenkins) |
| `Dockerfile` | Backend image (FastAPI + engine), already in the project |
| `Dockerfile.frontend` + `nginx.conf` | Frontend image: React built with Node, served by Nginx, `/api` forwarded to the backend |
| `docker-compose.yml` | Runs 3 containers: `web` (:8081), `api` (:8000), `db` (PostgreSQL) |
| `devops/check_model.py` | ML quality gate: fails the build if the new model is not good enough |
| `devops/wait_for.py` | Health check after deployment |
| `selenium-tests/` | Selenium WebDriver tests in JavaScript against the deployed app |

## Syllabus mapping

| Experiment | Where |
|---|---|
| 1. Git / GitHub SCM | This repo on GitHub; Jenkins pulls from it on every push |
| 2–3. Jenkins, CI/CD | `Jenkinsfile` |
| 4–5. Docker, containerized app | `Dockerfile`, `Dockerfile.frontend`, `docker-compose.yml` |
| 6–7. Selenium testing (JavaScript) | `selenium-tests/app.test.js` |
| 8. ML model in CI/CD | Stages *Train ML model*, *Model quality gate*, *Promote model* |
| 9. Deploy with Docker through Jenkins | Stages *Build Docker images*, *Deploy*, *Selenium tests* |

## Run it by hand

```bash
# containers
docker compose up -d --build        # app: http://localhost:8081   API: http://localhost:8000/docs
docker compose ps
docker compose logs api
docker compose down

# ML: train, evaluate and gate the model
python -m sim.evaluate --riders 600 --no-sweep --out model_out
python devops/check_model.py model_out/metrics.json

# Selenium tests (Chrome must be installed)
cd selenium-tests && npm install && npm test
```

Demo logins: `ops@trustjuggler.demo` at `/company/login`, rider `9000000001` at `/rider/login`, password `demo-pass-123`.

## Jenkins setup

1. Open Jenkins at `http://localhost:8080` (the app itself runs on 8081, so they do not clash).
2. Plugins: **Git**, **Pipeline**, **Timestamper** (the suggested plugins cover these).
3. *New Item* → **Pipeline** → *Pipeline script from SCM* → Git → your repo URL → branch `main` → script path `Jenkinsfile`.
4. *Build Triggers* → **Poll SCM** `H/5 * * * *` (or a GitHub webhook).
5. *Build Now*. The Jenkins machine needs Python, Node, Docker Desktop (running) and Chrome on its PATH.
