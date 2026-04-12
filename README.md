# MasterForge

**Professional ERP and Campaign Management Platform for Dungeon Masters**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Motivation](#motivation)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Architecture](#project-architecture)
- [Getting Started](#getting-started)
- [Project Scope](#project-scope)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## 🎭 Overview

**MasterForge** is a comprehensive, multiplataform management solution designed exclusively for professional Dungeon Masters (Pro-GMs), content creators, and players of Dungeons & Dragons 5th Edition (D&D 5e). It combines enterprise resource planning (ERP), customer relationship management (CRM), and AI-powered creative tools to streamline the operational and creative aspects of managing professional tabletop RPG campaigns.

The platform centralizes:
- **Business Management**: Player client databases, session scheduling, and revenue tracking
- **Creative Creation**: Dynamic character builder, NPC/monster generation, and homebrew asset management
- **Intelligent Assistance**: AI-driven procedural content generation for encounters and narratives

---

## 💡 Motivation

The tabletop RPG market has experienced exponential growth in recent years. Professional Game Masters and independent TTRPG creators are increasingly monetizing their campaigns, content assets, and gaming services through platforms like Patreon and pay-per-session models. 

However, this emerging professional niche lacks a **specialized software management system (SGE)** tailored to their unique operational and creative needs. Existing solutions either focus on casual players or are generic business management tools that don't understand the intricacies of D&D 5e rules mechanics.

**MasterForge** fills this gap by providing:
- A lightweight ERP/CRM built specifically for managing player clients and session schedules
- Automated calculation of D&D 5e character statistics and mechanics
- AI-assisted procedural generation of balanced, narratively-rich encounters
- A mobile-first experience for both GMs and players
- A SaaS business model scalable to a growing professional community

---

## ✨ Key Features

### For Dungeon Masters (Pro-GMs)

| Feature | Description |
|---------|-------------|
| **Player Client Management** | Maintain a comprehensive database of players with contact info, session history, and payment status |
| **Session Scheduling & Control** | Plan campaigns, manage player attendance, set capacity limits, and track session states (pending/paid/completed) |
| **Digital Asset Inventory** | Organize and manage custom adventures, homebrew rules, and proprietary content packages |
| **Remote Player Monitoring** | View key statistics and character information of your players in real-time |
| **AI Encounter Generator** | Generate balanced D&D 5e-compliant enemies with complete stat blocks and narratives via natural language prompts |
| **Dashboard & Analytics** | Track campaign metrics, player engagement, and revenue at a glance |

### For Players

| Feature | Description |
|---------|-------------|
| **Character Builder** | Create and customize D&D 5e characters by selecting race, class, level, and ability scores |
| **Automated Calculations** | System automatically computes AC, saving throws, skill bonuses, HP, and spell slots |
| **Interactive Character Sheet** | Mobile-friendly, interactive sheet that updates in real-time during gameplay |
| **Combat Tracking** | Track hit points, spell slots, and temporary conditions during active play |
| **Campaign Access** | View scheduled sessions, campaign details, and communicate with your Game Master |

### AI-Powered Innovation

- **Forge Assistant**: Intelligent content generation powered by large language models (OpenAI/Gemini)
- **Procedural Balance**: AI generates statistically valid D&D 5e encounters aligned with SRD 5.1 rules
- **Narrative Integration**: Each generated creature includes mechanical stats and thematic background hooks

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
│   │   └── com/masterforge/
│   │       ├── controllers/          # REST endpoints
│   │       ├── services/             # Business logic & rules engine
│   │       ├── repositories/         # Data access layer
│   │       ├── models/               # Entity models
│   │       ├── security/             # JWT & authentication
│   │       ├── ai/                   # LLM integration
│   │       └── MasterforgeBackendApplication.kt
│   ├── src/main/resources/
│   │   └── application.properties    # Configuration
│   ├── build.gradle.kts              # Dependencies
│   └── ...
│
├── masterforge-frontend/             # Ionic + Angular App
│   ├── src/
│   │   ├── app/
│   │   │   ├── home/                 # Landing/dashboard
│   │   │   ├── auth/                 # Login/registration
│   │   │   ├── player/               # Player features
│   │   │   │   └── character-builder/
│   │   │   ├── gm/                   # GM admin features
│   │   │   │   ├── player-management/
│   │   │   │   ├── session-scheduling/
│   │   │   │   └── ai-generator/
│   │   │   └── app.routes.ts
│   │   ├── services/                 # HTTP & business logic
│   │   ├── models/                   # TypeScript interfaces
│   │   ├── theme/                    # Styling & variables
│   │   └── main.ts
│   ├── package.json
│   ├── ionic.config.json
│   └── ...
│
└── README.md                         # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ (for frontend development)
- **npm** or **yarn** (package manager)
- **Java 11+** (for backend)
- **Gradle** 7.0+ (included with wrapper)
- **PostgreSQL** 13+ (database)
- **Git** (version control)

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd masterforge-backend
   ```

2. **Configure PostgreSQL connection** in `src/main/resources/application.properties`:
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/masterforge
   spring.datasource.username=your_db_user
   spring.datasource.password=your_db_password
   spring.jpa.hibernate.ddl-auto=update
   ```

3. **Build and run:**
   ```bash
   ./gradlew build
   ./gradlew bootRun
   ```

4. **Verify the API is running:**
   ```bash
   curl http://localhost:8080/api/health
   ```

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd masterforge-frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure API endpoint** in `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     apiUrl: 'http://localhost:8080/api'
   };
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```

5. **Open in browser:**
   ```
   http://localhost:4200
   ```

### Docker (Optional)

*(Coming soon: Docker compose configuration for full-stack deployment)*

---

## 📦 Project Scope

### MVP (Minimum Viable Product) - Included

- ✅ D&D 5e rules engine for characters limited to SRD 5.1 content
- ✅ Web-based dashboard for Pro-GMs (CRM and session management)
- ✅ Mobile-first character builder app for players
- ✅ Real-time character stat calculations
- ✅ Basic AI integration for monster generation
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
| **RF05** | AI-assisted monster generation via natural language prompts | SHOULD |
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

### Phase 1 (MVP - Q2-Q3 2026)
- [ ] Backend API core endpoints (auth, players, sessions)
- [ ] D&D 5e rules engine (character creation & stat calculations)
- [ ] Frontend character builder
- [ ] Basic GM dashboard
- [ ] JWT authentication

### Phase 2 (AI Integration - Q4 2026)
- [ ] OpenAI/Gemini API integration
- [ ] Encounter generator (monsters/NPCs)
- [ ] Narrative generation for loot/quests
- [ ] Prompt engineering & response validation

### Phase 3 (Mobile Optimization - Q1 2027)
- [ ] Ionic native app build (Android/iOS)
- [ ] Offline character sheet support
- [ ] Push notifications for session reminders
- [ ] Mobile UI optimization

### Phase 4+ (Extended Features)
- [ ] Expansion book content (Xanathar's, Tasha's, etc.)
- [ ] Homebrew module marketplace
- [ ] Payment gateway integration
- [ ] Advanced analytics & reporting

---

## 📝 API Documentation

Once the backend is running, access the interactive Swagger UI:

```
http://localhost:8080/swagger-ui.html
```

### Key Endpoints (Examples)

```
POST   /api/auth/register         - Player registration
POST   /api/auth/login            - User login (returns JWT)
GET    /api/players/{id}          - Fetch player character
PATCH  /api/players/{id}/stats    - Update character stats
GET    /api/gm/sessions           - List GM's sessions
POST   /api/gm/sessions           - Create new session
POST   /api/ai/generate-monster   - Generate D&D 5e monster
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

## 📄 License

MasterForge is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

**Important**: All D&D 5e mechanical content in the database is based on the **D&D 5.1 System Reference Document (SRD)**, which is licensed under the **Creative Commons Attribution 4.0 International License**.

---

## 📞 Contact & Support

- **Project Lead**: [Your Name/Team]
- **Email**: contact@masterforge.dev
- **Discord Community**: [Link Coming Soon]
- **Issue Tracker**: [GitHub Issues](../../issues)

---

## 🙏 Acknowledgments

- Wizards of the Coast for D&D 5e and the SRD 5.1
- The Kotlin and Angular communities for exceptional frameworks
- Ionic for mobile development excellence
- The TTRPG professional community for inspiring this project

---

## ⭐ Show Your Support

If you find MasterForge useful, please consider:
- ⭐ Starring this repository
- 🐛 Reporting bugs and suggesting features
- 💬 Joining our community discussions
- 🔄 Contributing code or documentation

---

**Happy Forging, Masters!** 🔨🐉

*Last Updated: April 2026*
