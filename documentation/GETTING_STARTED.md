# Local Development & Getting Started Guide

This document outlines the requirements and setup steps needed to configure your local developer sandbox and run MasterForge on your machine.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ (for frontend development)
- **npm** or **yarn** (package manager)
- **Java 17** (for backend)
- **Gradle** 7.0+ (included with wrapper)
- **PostgreSQL** 13+ (database)
- **Git** (version control)

---

## 💻 Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd masterforge-backend
   ```

2. **Configure your local PostgreSQL connection** in `src/main/resources/application.properties`:
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/masterforge
   spring.datasource.username=your_db_user
   spring.datasource.password=your_db_password
   spring.jpa.hibernate.ddl-auto=update
   ```

3. **Build and compile the backend:**
   ```bash
   ./gradlew build
   ```

4. **Launch the Spring Boot server:**
   ```bash
   ./gradlew bootRun
   ```

5. **Verify the API is running locally:**
   ```bash
   curl http://localhost:8080/api/health
   ```

---

## 🎨 Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd masterforge-frontend
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure your local API & WebSocket endpoints** in `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: false,
     apiBaseUrl: 'http://localhost:8080',
     wsBaseUrl: 'ws://localhost:8080',
   };
   ```

4. **Start the local Ionic/Angular development server:**
   ```bash
   npm start
   ```

5. **Open the application in your browser:**
   ```
   http://localhost:8100
   ```

---

## 🐳 Docker (Optional)

*(Coming soon: Docker Compose configuration for local full-stack containerized deployments)*
