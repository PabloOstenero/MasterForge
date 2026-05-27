# MasterForge

**Professional ERP and Campaign Management Platform for Dungeon Masters**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Motivation](#motivation)
- [Documentation](#documentation)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Architecture](#project-architecture)
- [Live Environments](#live-environments)
- [Local Development & Setup](#local-development-setup)
- [Project Scope](#project-scope)
- [Core Functional Requirements](#core-functional-requirements)
- [Roadmap](#roadmap)
- [API Documentation](#api-documentation)
- [Security Considerations](#security-considerations)
- [Contributing](#contributing)
- [Show Your Support](#show-your-support)

---

## 🎭 Overview

**MasterForge** is a comprehensive, multiplatform management solution designed exclusively for professional Dungeon Masters (Pro-GMs), content creators, and players of Dungeons & Dragons 5th Edition (D&D 5e). It combines enterprise resource planning (ERP), customer relationship management (CRM), and AI-powered creative tools to streamline the operational and creative aspects of managing professional tabletop RPG campaigns.

The platform centralizes:
- **Business Management**: Player client databases, session scheduling, and revenue tracking
- **Creative Creation**: Dynamic character builder and a comprehensive system for forging, validating, and balancing homebrew assets (items, spells, subclasses, races, and monsters)

---

## 💡 Motivation

The tabletop RPG market has experienced exponential growth in recent years. Professional Game Masters and independent TTRPG creators are increasingly monetizing their campaigns, content assets, and gaming services through platforms like Patreon and pay-per-session models. 

However, this emerging professional niche lacks a **specialized software management system (SGE)** tailored to their unique operational and creative needs. Existing solutions either focus on casual players or are generic business management tools that don't understand the intricacies of D&D 5e rules mechanics.

**MasterForge** fills this gap by providing:
- A lightweight ERP/CRM built specifically for managing player clients and session schedules
- Automated calculation of D&D 5e character statistics and mechanics
- AI-assisted co-creation, balancing, and mechanical validation of custom homebrew content assets
- A mobile-first experience for both GMs and players
- A SaaS business model scalable to a growing professional community

---

## 📖 Documentation

A comprehensive suite of technical manuals and guides is available in the repository:

*   **[Official Project Manual (18 Chapters)](file:///d:/MasterForge/documentation/PROJECT_DOCUMENT.md)**: Official comprehensive engineering manual detailing project specifications, Gantt WBS schedules, UML/Mermaid diagrams, and dynamic E2E quality test results.
*   **[User Guide (Player & DM)](file:///d:/MasterForge/documentation/USER_MANUAL.md)**: Dynamic player character sheet interactions (rests, wallet balance, multiclass level-ups) and Dungeon Master campaign control (session scheduler, Combat Tracker grids).
*   **[Local Sandbox Setup Guide](file:///d:/MasterForge/documentation/GETTING_STARTED.md)**: Step-by-step developer installation guide to deploy the backend database, Spring Boot REST API, and Ionic client.
*   **[Two-Factor Authentication Architecture (2FA)](file:///d:/MasterForge/documentation/2FA_SECURITY.md)**: Security specifications detailing the TOTP (RFC 6238) algorithm, time synchronization, and emergency recovery codes.
*   **Planning & Architecture Specs**:
    *   [Planning & Design](file:///d:/MasterForge/documentation/masterforge_planning_design.md) | [System Design](file:///d:/MasterForge/documentation/system_design_masterforge.md) | [System Implementation](file:///d:/MasterForge/documentation/system_implementation_masterforge.md) | [Presentation Deck](file:///d:/MasterForge/documentation/masterforge_presentation.md)

---

🌎 **[Spanish Documentation (Documentación Oficial en Español)](file:///d:/MasterForge/documentation/documentacion_esp/README.md)**: Acceda a toda la suite documental y manuales técnicos en español (TFG).

---

## ✨ Key Features

### For Dungeon Masters (Pro-GMs)

| Feature | Description |
|---------|-------------|
| **Player Client Management** | Maintain a comprehensive database of players with contact info, session history, and payment status |
| **Session Scheduling & Control** | Plan campaigns, manage player attendance, set capacity limits, and track session states (pending/paid/completed) |
| **Digital Asset Inventory** | Organize and manage custom adventures, homebrew rules, and proprietary content packages |
| **Remote Player Monitoring** | View key statistics and character information of your players in real-time |
| **AI Homebrew Forge (Upcoming)** | Leverage large language models to co-create, balance, and mechanically validate custom items, spells, races, and classes (Phase 3) |
| **Dashboard & Analytics** | Track campaign metrics, player engagement, and revenue at a glance |

### For Players

| Feature | Description |
|---------|-------------|
| **Character Builder** | Create and customize D&D 5e characters by selecting race, class, level, and ability scores |
| **Automated Calculations** | System automatically computes AC, saving throws, skill bonuses, HP, and spell slots |
| **Interactive Character Sheet** | Mobile-friendly, interactive sheet that updates in real-time during gameplay |
| **Combat Tracking** | Track hit points, spell slots, and temporary conditions during active play |
| **Campaign Access** | View scheduled sessions, campaign details, and communicate with your Game Master |

### 🔮 Future Evolution & Roadmap

We have structured the future development roadmap of the platform around two critical areas:

*   **D&D 5e Rules Engine Upgrades**:
    *   **Feat System (Dotes)**: Option to select official feats instead of standard ability score increases (ASIs) during level-ups, applying appropriate rules and stat boosts.
    *   **Conditions & Status Tracking**: Automatic mechanical penalties for active conditions (e.g., Blinded, Poisoned, Restrained) integrated with the Combat Tracker.
    *   **Encumbrance Calculations**: Automated speed calculations based on inventory total weight and the character's Strength score.
*   **AI Integration for Homebrew Co-Creation**:
    *   **AI Homebrew Assistant**: Co-create and refine narrative flavor text descriptions for custom spells, items, subclasses, and races.
    *   **Mechanical Balance Auditor**: Analyze homebrew numbers and properties against the mathematical baseline of the SRD 5.1 to alert the creator of any balance drifts before sharing with the community.

---

## 🛠️ Technology Stack

### Frontend (Multiplataform Client)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Ionic Framework + Angular | Multiplataform web & mobile (Android/iOS) development |
| **Styling** | SCSS/Sass | Component-based styling |
| **Build Tool** | Webpack (via Angular CLI) | Bundling and optimization |
| **Package Manager** | npm | Dependency management |

### Backend (Business Logic & API)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Language** | Kotlin | Modern, type-safe JVM language |
| **Framework** | Spring Boot | Enterprise-grade REST API development |
| **Build Tool** | Gradle | Project build and dependency management |
| **Port** | Default: 8080 | API server listening port |

### Data Layer

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Database** | PostgreSQL | Relational data for users, players, campaigns, and game mechanics |
| **ORM** | JPA/Hibernate (Spring Data) | Object-relational mapping for database operations |

### External Services & Tools

| Tool | Purpose |
|------|---------|
| **OpenAI / Gemini API** | AI model integration for procedural content generation |
| **JWT (JSON Web Tokens)** | Stateless authentication and authorization |
| **BCrypt** | Secure password hashing |
| **GitHub** | Version control and collaboration |
| **Postman** | API testing and documentation |
| **Figma** | UI/UX design and prototyping |

---

## 🏗️ Project Architecture

```
MasterForge/
├── masterforge-backend/              # Spring Boot + Kotlin API
│   ├── src/main/kotlin/
│   │   └── com/masterforge/masterforge_backend/
│   │       ├── config/               # Application & Security configurations
│   │       ├── controller/           # REST endpoints (Monsters, Characters, Homebrew)
│   │       ├── model/                # JPA Database Entities & DTOs
│   │       ├── repository/           # Spring Data JPA repositories
│   │       ├── service/              # Core business services (Auth, Homebrew, Discord)
│   │       ├── util/                 # Rules engines & utility classes
│   │       └── MasterforgeBackendApplication.kt
│   ├── src/main/resources/
│   │   ├── db/migration/             # Liquibase/Flyway schema migrations
│   │   ├── application.properties    # Dev configuration settings
│   │   └── application-prod.properties # Production database & cloud config
│   ├── build.gradle.kts              # Kotlin Gradle build and dependencies
│   └── ...
│
├── masterforge-frontend/             # Ionic + Angular Multiplatform Client
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/           # Reusable UI elements (cards, tables)
│   │   │   ├── guards/               # Role and auth protection guards
│   │   │   ├── home/                 # Dynamic dashboard landing page
│   │   │   ├── interceptors/         # JWT headers and API interceptors
│   │   │   ├── layout/               # Header, sidebar, and layout templates
│   │   │   ├── models/               # TypeScript models & data mappings
│   │   │   ├── pages/                # Main router outlets (SPA pages)
│   │   │   │   ├── character-sheet/  # Interactive character sheet & combat hud
│   │   │   │   ├── forge-character/  # Step-by-step D&D 5e character creator
│   │   │   │   ├── homebrew/         # User & community homebrew workshop
│   │   │   │   ├── homebrew-item-form/ # Dedicated custom item creator
│   │   │   │   ├── homebrew-spell-form/# Dedicated custom spell creator
│   │   │   │   ├── homebrew-race-form/ # Dedicated custom race creator
│   │   │   │   ├── homebrew-class-form/# Dedicated custom class creator
│   │   │   │   ├── homebrew-subclass-form/# Dedicated custom subclass creator
│   │   │   │   ├── bestiary/         # Official and custom D&D creatures list
│   │   │   │   └── campaigns/        # Pro-GM campaign planner & player CRM
│   │   │   ├── services/             # HTTP clients & business logic
│   │   │   ├── utils/                # Utility modules & math calculations
│   │   │   └── app.routes.ts         # Navigation routing configuration
│   │   ├── theme/                    # HSL design tokens & global stylesheets
│   │   └── main.ts                   # Bootstrapping module
│   ├── package.json                  # Frontend dependencies
│   ├── ionic.config.json             # Ionic framework configuration
│   └── ...
│
└── README.md                         # Project documentation
```

---

## 🌐 Live Environments

The production platform is fully deployed and accessible:

- **Frontend Client (GitHub Pages):** [https://pabloostenero.github.io/MasterForge/](https://pabloostenero.github.io/MasterForge/)
- **Backend API (Render):** [https://masterforge-4n4g.onrender.com](https://masterforge-4n4g.onrender.com)
- **Database (Supabase PostgreSQL):** Connected via a secure connection pool on port `5432`

---

## 🛠️ Local Development & Setup

If you want to contribute, test new features, or run a local copy of MasterForge, please refer to our detailed setup manual:

👉 **[Local Development & Getting Started Guide](./documentation/GETTING_STARTED.md)**

---

## 📦 Project Scope

### MVP (Minimum Viable Product) - Included

- ✅ D&D 5e rules engine for characters limited to SRD 5.1 content
- ✅ Web-based dashboard for Pro-GMs (CRM and session management)
- ✅ Mobile-first character builder app for players
- ✅ Real-time character stat calculations
- ✅ Custom Homebrew Content Workshop (items, spells, races, classes, subclasses, and monsters)
- ✅ JWT authentication and role-based access control
- ✅ PostgreSQL-backed persistent data storage

### Extended Objectives (Backlog - Time Permitting)

- 🔜 Expansion book support and advanced homebrew mechanics
- 🔜 Custom class/race creation with automated balancing
- 🔜 Payment tracking with internal ledger system
- 🔜 Campaign notes and session logs

### Out of Scope (Deliberate Exclusions)

- ❌ **Inventory Management**: No automatic weight/encumbrance calculations
- ❌ **Virtual Tabletop (VTT)**: No interactive maps, battle grids, or 3D dice rollers
- ❌ **Payment Gateway Integration**: No real payment processing (Stripe/PayPal) in v1
- ❌ **Module Marketplace**: No built-in content purchasing system
- ❌ **Voice/Video Chat**: No integrated communication beyond chat

---

## 🎯 Core Functional Requirements

| Req. ID | Description | Priority |
|---------|-------------|----------|
| **RF01** | System distinguishes between Pro-GM and Player roles | MUST |
| **RF02** | Pro-GMs can schedule sessions and track player payment status | MUST |
| **RF03** | Players can create D&D 5e characters with automatic stat calculations | MUST |
| **RF04** | Real-time HP and spell slot tracking during gameplay | MUST |
| **RF05** | AI-assisted homebrew creation and rules mechanical validation | SHOULD |
| **RF06** | Player attendance tracking and capacity management | SHOULD |
| **RF07** | Digital asset organization (adventures, homebrew) | NICE-TO-HAVE |

### Non-Functional Requirements

| Req. ID | Description | Standard |
|---------|-------------|----------|
| **RNF01** | All mechanical content based on D&D 5.1 SRD (Creative Commons) | Legal Compliance |
| **RNF02** | JWT authentication + BCrypt password hashing | Security |
| **RNF03** | Strict frontend/backend separation | Architecture |
| **RNF04** | < 2s response time for API endpoints (p95) | Performance |
| **RNF05** | Mobile-responsive design (iOS & Android) | UX |

---

## 🗺️ Roadmap

### Phase 1 (Multiplatform MVP - Completed ✅)
- [x] Backend API core endpoints (auth, players, sessions)
- [x] D&D 5e rules engine (character creation & stat calculations)
- [x] Frontend character builder & sheet dynamic sync
- [x] Basic GM dashboard (CRM and player database tracker)
- [x] JWT secure stateless authentication
- [x] **Native Mobile Compilation:** Android native app build (`.apk`) using Ionic + Capacitor wrapping
- [x] **Cloud Database Migration:** Supabase PostgreSQL setup with Hikari Connection Pooler
- [x] **Backend Cloud Deployment:** Render deployment using multi-stage Docker compilation
- [x] **Frontend Cloud Deployment:** GitHub Pages static host with SPA deep routing (`404.html` fallback) and `.nojekyll` pipeline
- [x] **E2E Auditing Validation:** Robust audit framework (`audit_runner.js`) ensuring zero stats/rules drift

### Phase 2 (Future Upgrades & AI Homebrew)
- [ ] **Rules Upgrades**: Implement Feats (Dotes), Conditions tracking, and physical inventory weight encumbrance
- [ ] **AI Assistant**: Secure LLM integration inside the Sandbox to guide co-creation narrative descriptions
- [ ] **AI Balance Auditor**: Automated numeric validation comparing custom assets properties against SRD 5.1 curves

---

## 📝 API Documentation

Once the backend is running, access the interactive Swagger UI:

```
http://localhost:8080/swagger-ui.html
```

### Key Endpoints (Examples)

```
POST   /api/users                 - User registration
POST   /api/auth/login            - User authentication (returns JWT)
GET    /api/characters/user/{id}  - Fetch characters owned by a user
GET    /api/characters/{id}       - Fetch details of a specific character
PUT    /api/characters/{id}/hp    - Update character current Hit Points
GET    /api/sessions              - List scheduled campaign sessions
POST   /api/sessions              - Schedule a new campaign session (DM only)
GET    /api/monsters              - Fetch system monsters with filter options
```

See full API documentation in the backend's OpenAPI spec.

---

## 🔒 Security Considerations

- **Authentication**: JWT tokens with configurable expiration
- **Password Security**: BCrypt hashing with salt (min. 12 rounds)
- **Authorization**: Role-based access control (RBAC) for Pro-GM vs. Player
- **Data Validation**: Input sanitization on all API endpoints
- **CORS**: Configured for frontend-backend communication
- **HTTPS**: Recommended for production deployments

---

## 🤝 Contributing

We welcome contributions from the community! To contribute:

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Commit changes**: `git commit -m "Add feature description"`
4. **Push to branch**: `git push origin feature/your-feature-name`
5. **Open a Pull Request** with a clear description

### Code Style

- **Kotlin**: Follow [Kotlin Style Guide](https://kotlinlang.org/docs/coding-conventions.html)
- **TypeScript/Angular**: Follow [Angular Style Guide](https://angular.io/guide/styleguide)
- **Commit Messages**: Use conventional commits (feat:, fix:, docs:, etc.)

---

## ⭐ Show Your Support

If you find MasterForge useful, please consider:
- ⭐ Starring this repository
- 🐛 Reporting bugs and suggesting features
- 💬 Joining our community discussions
- 🔄 Contributing code or documentation
