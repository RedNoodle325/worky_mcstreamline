# Stage 1: Build frontend
FROM oven/bun:1 AS frontend-builder
WORKDIR /app/frontend-react
COPY frontend-react/package.json frontend-react/bun.lock* ./
RUN bun install --frozen-lockfile
COPY frontend-react/ ./
RUN bun run build

# Stage 2: Build Rust backend
FROM rust:1.86-slim AS backend-builder
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend

# Cache dependencies
COPY backend/Cargo.toml backend/Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# Build the real binary
COPY backend/ ./
RUN touch src/main.rs && cargo build --release

# Stage 3: Runtime image
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=backend-builder /app/backend/target/release/server ./server
COPY --from=frontend-builder /app/frontend-react-dist ./frontend-react-dist

RUN mkdir -p uploads

ENV HOST=0.0.0.0
ENV PORT=3000
ENV FRONTEND_DIR=/app/frontend-react-dist
ENV UPLOAD_DIR=/app/uploads

EXPOSE 3000

CMD ["./server"]
