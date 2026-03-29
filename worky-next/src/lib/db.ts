import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, {
  max: 5,         // Match Rust's limit for Supabase PgBouncer
  prepare: false, // Required for PgBouncer (equivalent to Rust's statement_cache_capacity(0))
  idle_timeout: 20,
  connect_timeout: 10,
})

export default sql
