// CI/CD pipeline for Trust Juggler (HackForge).
// Test -> train the ML model -> quality gate -> build Docker images -> deploy -> Selenium tests.
// Works on a Windows or Linux Jenkins agent that has Python 3.11+, Node 20+, Docker and Chrome.

def run(String cmd) {
    if (isUnix()) { sh cmd } else { bat cmd }
}

pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 45, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.PY = isUnix() ? '.venv/bin/python' : '.venv\\Scripts\\python'
                }
            }
        }

        stage('Install dependencies') {
            steps {
                run 'python -m venv .venv'
                run "${env.PY} -m pip install -q -r requirements.txt"
                run 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                run "${env.PY} -m pyflakes engine sim api devops"
                run 'npm run lint'
            }
        }

        stage('Unit tests') {
            steps {
                run "${env.PY} -m pytest -q"
            }
        }

        stage('Train ML model') {
            steps {
                // generates synthetic riders, trains + calibrates the model, writes metrics.json and model.json
                run "${env.PY} -m sim.evaluate --riders 600 --no-sweep --out model_out"
            }
        }

        stage('Model quality gate') {
            steps {
                // fails the build if the new model catches too few takeovers or blocks too many honest riders
                run "${env.PY} devops/check_model.py model_out/metrics.json"
                archiveArtifacts artifacts: 'model_out/*.json', fingerprint: true
            }
        }

        stage('Promote model') {
            steps {
                // the model that passed the gate is the one baked into the API image
                script {
                    if (isUnix()) {
                        sh 'cp model_out/model.json engine/models/default.json'
                    } else {
                        bat 'copy /Y model_out\\model.json engine\\models\\default.json'
                    }
                }
            }
        }

        stage('Build Docker images') {
            steps {
                run 'docker compose build'
                run 'docker images hackforge-*'
            }
        }

        stage('Deploy') {
            steps {
                run 'docker compose down'
                run 'docker compose up -d'
                run "${env.PY} devops/wait_for.py http://localhost:8000/health 180"
                run "${env.PY} devops/wait_for.py http://localhost:8081/ 60"
                run 'docker compose ps'
            }
        }

        stage('Selenium tests') {
            steps {
                dir('selenium-tests') {
                    run 'npm ci'
                    withEnv(['BASE_URL=http://localhost:8081']) {
                        run 'npm test'
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'Deployed: app on http://localhost:8081, API docs on http://localhost:8000/docs'
        }
        failure {
            script {
                try { run 'docker compose logs --tail=50' } catch (err) { echo 'no containers to show' }
            }
        }
    }
}
