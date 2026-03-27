# Deployment Guide

Worky McStreamline is a Rust/Axum backend that serves a React frontend as static files, backed by a Supabase PostgreSQL database.

## Prerequisites

- [Rust + Cargo](https://rustup.rs/)
- [Bun](https://bun.sh/) (frontend package manager)
- [sqlx-cli](https://github.com/launchbadge/sqlx) for running migrations
- A [Supabase](https://supabase.com/) project

Install sqlx-cli if you don't have it:

```bash
cargo install sqlx-cli --no-default-features --features postgres
```

---

## 1. Configure Environment

Copy the example env file and fill in your values:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

| Variable            | Description                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`      | Supabase Postgres connection string (from Supabase Dashboard → Settings → Database → Connection string) |
| `SUPABASE_URL`      | Your Supabase project URL                                                                               |
| `SUPABASE_ANON_KEY` | Your Supabase anon/public key                                                                           |
| `HOST`              | Bind address — use `127.0.0.1` for local, `0.0.0.0` to accept external connections                      |
| `PORT`              | Port to listen on (default: `3000`)                                                                     |
| `FRONTEND_DIR`      | Path to the built frontend files (see step 2)                                                           |
| `UPLOAD_DIR`        | Writable directory for uploaded files (default: `./uploads`)                                            |

---

## 2. Build the Frontend

```bash
cd frontend-react
bun install
bun build
```

The production build outputs to `../frontend-react-dist/`.

---

## 3. Run Database Migrations

```bash
cd backend
sqlx migrate run
```

Migrations are in `backend/migrations/` and run in filename order.

---

## 4. Build and Run the Backend

**Development:**

```bash
cd backend
FRONTEND_DIR=../frontend-react-dist cargo run
```

**Production (release build):**

```bash
cd backend
cargo build --release
FRONTEND_DIR=/absolute/path/to/frontend-react-dist ./target/release/worky_backend
```

The server starts on `http://<HOST>:<PORT>`. It serves:

- The React app at `/`
- API endpoints at `/api/*`
- Uploaded files at `/uploads/*`

---

## 5. Running as a systemd Service (Linux VPS)

Create `/etc/systemd/system/worky.service`:

```ini
[Unit]
Description=Worky McStreamline
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/opt/worky_mcstreamline/backend
EnvironmentFile=/opt/worky_mcstreamline/backend/.env
Environment=FRONTEND_DIR=/opt/worky_mcstreamline/frontend-react-dist
ExecStart=/opt/worky_mcstreamline/backend/target/release/worky_backend
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable worky
sudo systemctl start worky
sudo systemctl status worky
```

---

## Updating a Deployment

```bash
# Pull latest code
git pull

# Rebuild frontend
cd frontend-react && bun install && bun build && cd ..

# Run any new migrations
cd backend && sqlx migrate run

# Rebuild and restart backend
cargo build --release
sudo systemctl restart worky
```

---

## Environment Variable Reference

```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
HOST=0.0.0.0
PORT=3000
FRONTEND_DIR=../frontend-react-dist
UPLOAD_DIR=./uploads
```
