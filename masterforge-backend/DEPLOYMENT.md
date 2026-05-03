# MasterForge — Deployment Guide

MasterForge is a D&D campaign management application built with a Spring Boot 4 (Kotlin) backend
and an Angular/Ionic frontend. This guide covers how to build and run both components in
development and production environments.

---

## Prerequisites

- **Java 17** (or later)
- **PostgreSQL 14+** — a database named `masterforge_db` must exist
- **Node.js 18+** and **npm** — required for the frontend build

### Required environment variables (production only)

| Variable | Description |
|---|---|
| `DB_URL` | JDBC URL, e.g. `jdbc:postgresql://db-host:5432/masterforge_db` |
| `DB_USERNAME` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | Secret key for JWT signing (minimum 32 characters) |

---

## Running locally (dev)

The default `application.properties` targets a local PostgreSQL instance with the credentials
`postgres / 1234`. No environment variables are required.

```bash
cd masterforge-backend
./gradlew bootRun
```

The API will be available at `http://localhost:8080`.

---

## Running in production

### 1. Build the JAR

```bash
cd masterforge-backend
./gradlew bootJar
```

The artifact is produced at `build/libs/masterforge-backend-0.0.1-SNAPSHOT.jar`.

### 2. Set environment variables and start

```bash
export DB_URL=jdbc:postgresql://db-host:5432/masterforge_db
export DB_USERNAME=your_db_user
export DB_PASSWORD=your_db_password
export JWT_SECRET=your-very-long-secret-key-min-32-chars

java -jar build/libs/masterforge-backend-0.0.1-SNAPSHOT.jar \
     --spring.profiles.active=prod
```

The `prod` profile enforces `ddl-auto=validate` (no automatic schema changes),
disables SQL logging, and applies structured log output.

---

## Frontend build

```bash
cd masterforge-frontend
npm install
npm run build
```

The production build is output to `masterforge-frontend/www/`. This directory can be:

- **Served as static files from Spring Boot** — copy the contents of `www/` into
  `masterforge-backend/src/main/resources/static/` before building the JAR.
- **Served from a CDN or web server** — deploy `www/` to any static hosting provider
  and point `environment.prod.ts → apiBaseUrl` to the backend URL before building.

---

## Mock payment disclaimer

The payment system included in MasterForge is a **simulation for academic purposes only**.
It does not connect to any real payment gateway and no actual financial transactions are
processed. All payment flows, card numbers, and transaction records are entirely fictitious.
This feature must **not** be used with real payment data, real card numbers, or in any
production environment where financial regulations apply.
