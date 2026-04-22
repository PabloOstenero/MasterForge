### **Final Degree Project Proposal (Multiplatform Application Development)**

**Title** MasterForge: ERP Platform and Campaign Manager for Professional Game Masters (Pro-GMs).

**Justification** The purpose of the project is to develop a multiplatform software solution that centralizes content creation and business management for professional Game Masters (Pro-GMs) and independent tabletop RPG (TTRPG) creators.

The justification for this project lies in the exponential growth of the RPG market, where more and more creators are monetizing their games, campaigns, and resources (monsters, maps, objects) through platforms like Patreon or pay-per-session services. Currently, these professionals lack management software (SGE) adapted to their niche. The project will fill this need by integrating customer management tools (CRM for players), event calendar (sessions), and digital asset inventory, thus complying with Business Management System requirements. At the same time, a SaaS (Software as a Service) business model will be proposed, ideal for the entrepreneurship module, all backed by a robust and modern technical architecture typical of multiplatform development.

**Technology and tools** Development will be based on a client-server architecture, clearly separating the *frontend* from the *backend*, using the following technologies:

* **Frontend (Multiplatform Client):** **Ionic Framework and Angular**. A full web administration panel will be developed for the Game Master's management, also exportable as a native mobile application (Android/iOS) for quick consultations or for the players' view.
* **Backend (Business Logic and API):** A RESTful API will be built using **Kotlin** (with frameworks like Spring Boot or Ktor). This server will manage security (JWT tokens), business logic, session reservations, and the calculation of RPG entity statistics.
* **Database:** A relational database (**PostgreSQL or MySQL**) will be used to efficiently structure corporate information (users, clients/players, billing) and game information (campaigns, dynamic sheets, bestiary).
* **Artificial Intelligence:** An API of a language model (OpenAI or Gemini) will be integrated into the backend to assist in procedural content generation.
* **Support tools:** Git/GitHub (version control), Postman (API testing), and Figma (interface design).

**Description** "MasterForge" is an integral management system divided into two main areas: business and creative.

In the **business area (SGE)**, the platform acts as a lightweight CRM and ERP. The user (Game Master) has a panel to manage their player database (clients), organize the session calendar with capacity control, and manage their "digital inventory" (adventure packs, proprietary rule systems, or *Homebrew*), allowing them to keep track of their services.

In the **creative area**, the application offers a powerful creator of entities (monsters, NPCs, spells, and character sheets) with dynamic statistics. The great added value and technological innovation of the project reside in the integration of Artificial Intelligence in the Kotlin backend. Through a "Forge Assistant", the user can enter a simple prompt (e.g., "Create a level 8 vampire final boss adapted to D&D"), and the server will return a fully generated technical sheet, balanced and with its own narrative story, saving hours of preparation for the professional.