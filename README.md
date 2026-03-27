# Worky McStreamline

A field service and commissioning management app for tracking HVAC/cooling system installations, service tickets, scheduling, and supply chain — built with a Rust/Axum backend and a React frontend.

## Features

**Sites & Assets**
- Manage sites, units, and SyCool cooling systems
- Track unit commissioning status and levels
- Import units from CSV; import Astea data via the included Python script
- Component and material tracking per unit

**Service & Support**
- Customer support (CS) tickets with XML import and scope-of-work documentation
- General issue/ticket tracking with CxAlloy import support
- Warranty claim management
- Issue-to-service-line linking

**Operations**
- Job scheduling and technician dispatch
- Contractor and site contact management
- Site documents, forms, and job number tracking
- Notes (with email PDF import), todos, and campaigns

**Supply Chain & Reporting**
- Bill of Materials (BOM) with component search
- Master Scope of Work (MSOW) draft management
- Reports view

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Rust, Axum 0.7, Tokio |
| Database | PostgreSQL via Supabase, SQLx |
| Frontend | React 19, TypeScript, Vite |
| Auth | JWT + bcrypt |

## Getting Started

### Prerequisites

- [Rust + Cargo](https://rustup.rs/)
- [Bun](https://bun.sh/)
- [sqlx-cli](https://github.com/launchbadge/sqlx): `cargo install sqlx-cli --no-default-features --features postgres`
- A [Supabase](https://supabase.com/) project

### Setup

```bash
# 1. Configure environment
cp backend/.env.example backend/.env
# Fill in DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY

# 2. Run database migrations
cd backend && sqlx migrate run

# 3. Build the frontend
cd frontend-react && bun install && bun build

# 4. Start the backend (serves the frontend too)
cd backend && FRONTEND_DIR=../frontend-react-dist cargo run
```

The app runs at `http://localhost:3000`.

For full deployment instructions (systemd service, production builds, etc.) see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Project Structure

```
backend/          Rust/Axum API server
  src/
    handlers/     Route handlers (auth, sites, units, tickets, schedule, ...)
    models/       Database models
    routes.rs     API route definitions
  migrations/     SQL migration files

frontend-react/   React + TypeScript frontend (Vite)
  src/
    pages/        Page components
    components/   Shared UI components
    api/          API client functions

frontend-react-dist/  Production frontend build (generated)
```

## License

MIT
