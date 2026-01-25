# Typing-Web

Typing test web app with auth, Google sign-in, and progress tracking.

## Local setup
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Environment variables:
- `SECRET_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DATABASE_URL` (optional; defaults to SQLite `typing.db`)
- `AUTO_CREATE_DB` (default `true` for SQLite; set `false` when using Alembic/Postgres)

Google OAuth redirect URI:
- `https://<your-domain>/auth/google/callback`

Run locally:
```bash
flask --app app run --debug
```

## Migrations (Alembic)
Initialize/upgrade:
```bash
alembic upgrade head
```

Create a new migration after model changes:
```bash
alembic revision --autogenerate -m "your message"
```

## Render deploy (Postgres)
1) Create a Render Postgres database and link `DATABASE_URL` to the service.
2) Set env vars in Render:
   - `SECRET_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `DATABASE_URL`
   - `AUTO_CREATE_DB=false`
3) Add a build or deploy command:
```bash
alembic upgrade head
```

## Basic smoke test
1) Home page loads.
2) Create account with email/password; sign in and out.
3) Google sign-in works (if configured).
4) Run a test; results save and appear on Profile.
5) Update username; verify it changes on Profile and “My Records.”
6) Streak/averages update after multiple tests across days.

### Automated smoke test (local)
Start the app, then run:
```bash
BASE_URL=http://127.0.0.1:5050 scripts/smoke_test.sh
```
