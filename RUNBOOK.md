# Local runbook

## Prerequisites

- Java 25 and Maven
- Python 3.10 or 3.11
- Node.js 20 or later
- A Supabase Postgres database with the existing `calls`, `detection_results`, and `alerts` tables available to the Spring service

Use one strong, randomly generated `SECRET_KEY` for all three backend services. The Spring API verifies these HS256 JWTs; the login API issues them; inference verifies and forwards them.

## 1. Configure backend secrets

Create `voice-cloning-backend/.env` from [`voice-cloning-backend/.env.example`](voice-cloning-backend/.env.example), and create `aasist_repo/.env` from [`aasist_repo/.env.example`](aasist_repo/.env.example).

Set these values in your shell before starting services. PowerShell does not automatically load `.env` files:

```powershell
$env:SECRET_KEY = "use-one-long-random-secret-in-all-services"
$env:SUPABASE_DB_URL = "jdbc:postgresql://your-project.pooler.supabase.com:5432/postgres"
$env:SUPABASE_DB_USER = "your_database_user"
$env:SUPABASE_DB_PASSWORD = "your_database_password"
$env:AUTH_DATABASE_URL = "postgresql+psycopg://your_database_user:your_database_password@your-project.pooler.supabase.com:5432/postgres"
$env:CORS_ALLOWED_ORIGINS = "http://localhost:5173"
```

`AUTH_DATABASE_URL` and the Spring JDBC URL target the same Supabase Postgres database, but their URL formats are intentionally different.

## 2. Start Spring Boot

In one PowerShell window:

```powershell
Set-Location voice-cloning-backend
mvn spring-boot:run
```

It listens on `http://localhost:8080`. Its `/calls`, `/detections`, and `/alerts` endpoints all require a bearer token.

## 3. Start login service

In a second PowerShell window:

```powershell
Set-Location aasist_repo
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r login_system\requirements.txt
uvicorn login_system.main:app --port 8001 --reload
```

The service starts on `http://localhost:8001`. On first startup it creates the `users` table in Supabase.

If you have an existing local `users.db`, migrate it once after setting `AUTH_DATABASE_URL`:

```powershell
python -m login_system.migrate_sqlite_users --source path\to\users.db
```

The source file is read-only. Existing Postgres emails are skipped.

## 4. Start inference service

In a third PowerShell window, with the same `SECRET_KEY` still set:

```powershell
Set-Location aasist_repo
.\.venv\Scripts\Activate.ps1
pip install -r inference_api\requirements.txt
$env:SPRING_BOOT_URL = "http://localhost:8080"
uvicorn inference_api.main:app --port 8000 --reload
```

The health endpoint is `http://localhost:8000/health`. It loads the CPU model readiness check on request. Docker deployment includes ffmpeg for MP3 and M4A; local MP3/M4A use also needs `ffmpeg` available on your `PATH`.

## 5. Start frontend

In a fourth PowerShell window:

```powershell
Set-Location frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`, create an account, and submit WAV/MP3/M4A audio. Microphone capture creates a WAV in-browser before upload.

## Service flow

```text
Browser ── signup/login ──> Login API ──> Supabase users table
Browser ── Bearer JWT + audio ──> Inference API ── Bearer JWT ──> Spring /detections
Browser ── Bearer JWT ───────────────────────────────────────────> Spring /calls, /alerts
Spring API ──────────────────────────────────────────────────────> Supabase Postgres
```

The existing Spring API only exposes `GET /calls`; it does not create call records when an audio upload is analyzed. Analysis results are written to `detection_results` and create high-risk alerts. Wire the call-origin system to create `calls` rows if you want analyzed uploads to populate call history.
