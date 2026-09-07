# Signal Ledger frontend

React + TypeScript + Vite interface for the protected voice-integrity workflow.

## Local run

1. Copy the environment template and set the local service URLs:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Install and start the development server:

   ```powershell
   npm install
   npm run dev
   ```

3. Open the URL Vite reports (normally `http://localhost:5173`).

The UI requires the login system, inference API, and Spring API to be running. See the repository root `RUNBOOK.md` for the complete multi-service setup.

## Environment variables

| Variable | Local default | Use |
| --- | --- | --- |
| `VITE_AUTH_API_URL` | `http://localhost:8001` | Login, signup, and current-user API |
| `VITE_INFERENCE_API_URL` | `http://localhost:8000` | Authenticated audio analysis API |
| `VITE_SPRING_API_URL` | `http://localhost:8080` | Protected calls and alerts API |

Only non-secret browser URLs may use `VITE_` variables. Never put `SECRET_KEY`, database credentials, or Supabase service keys in this file.
