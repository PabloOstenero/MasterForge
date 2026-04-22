**1. Project Objectives**

* **General Objective:** Develop "MasterForge", a management platform (ERP/CRM) and automated character creation engine, exclusive to the Dungeons & Dragons 5th Edition (D&D 5e) system, oriented toward professional Game Masters (Pro-GMs) and their Players.
* **Specific Objectives:**
  * Implement a "Rules Engine" in the backend (Kotlin) capable of automatically calculating derived statistics (modifiers, AC, maximum HP, proficiency bonuses) based on the character's race, class, and level.
  * Develop a CRM module for the Game Master to manage their player base and plan the session calendar for their campaigns.
  * Provide players with a mobile-first application in Ionic for guided creation (Character Builder style) and consultation of their automated D&D 5e sheets.
  * Integrate an Artificial Intelligence (LLM) API in the backend to generate narrative backgrounds and monsters compatible with the 5e system at the Director's request.

**2. Functional and Non-Functional Requirements**

* **Functional Requirements:**
  * RF01: The system must distinguish between user roles (Pro-GM administrator and Player client).
  * RF02: The system must allow the Pro-GM to plan sessions, associate clients/players, and maintain status control (pending/paid).
  * RF03: The system must allow Players to create D&D 5e sheets by selecting base parameters (race, class, level, ability scores), and the system must automatically calculate the rest of the derived values (saves, skills, modifiers).
  * RF04: The system must allow updating dynamic parameters in real-time during the game (current hit points, spent spell slots).
  * RF05: The system must allow the Pro-GM to generate monsters with valid D&D 5e statistics through text requests to an integrated AI.
* **Non-Functional Requirements:**
  * RNF01 (Legality): Mechanical content pre-loaded in the database will be based on the D&D SRD 5.1 (Creative Commons).
  * RNF02 (Security): Authentication via JWT and password encryption (BCrypt).
  * RNF03 (Architecture): Strict separation between the multiplatform client (Ionic/Angular) and the business logic/mathematical calculations (Kotlin/Spring Boot).

**3. Actor Identification**

* **Game Master (Pro-GM):** Campaign administrator. Manages the business side (CRM, sessions) and generates content (AI monsters). Can remotely view the key statistics of their players' sheets.
* **Player (Client):** End-user of the mobile app. Creates and maintains their interactive D&D 5e sheet.
* **LLM System (External Actor):** Artificial Intelligence (e.g., OpenAI/Gemini) that acts as an external service for the procedural generation of enemies and narratives.

**4. Main Use Cases / User Stories**

* **User Story 1 (Character Builder):** *As a Player, I want to select my class and race from a list, and enter my ability score rolls, so the app calculates my Armor Class and Modifiers automatically without using paper and pencil.*
* **User Story 2 (Combat Management):** *As a Player, I want to be able to subtract my Hit Points in the mobile app when receiving damage, to keep control of my health in real-time during the session.*
* **User Story 3 (Master's CRM):** *As a Pro-GM, I want to register a session in the calendar and see which players have confirmed their attendance and paid for the session.*
* **User Story 4 (AI Assistant):** *As a Pro-GM, I want to ask the AI to "Create a level 3 goblin boss," so the system automatically fills its sheet with legal D&D 5e statistics.*

**5. Project Scope (Final Degree Project Boundaries)**

* **Included in scope (MVP - Minimum Viable Product):**
  * D&D 5e rules mathematical engine initially limited to SRD 5.1 content (base races, classes, and spells).
  * Web management panel for the Pro-GM (player and event CRM).
  * Mobile app for the Player's interactive sheet.
* **Extended Objectives (Desirable, subject to time availability):**
  * *Support for Expansions and complex Homebrew:* We will attempt to design the database architecture with sufficient flexibility to allow the inclusion of mechanics from expansion books or the creation of custom classes/races (Homebrew) that require automation, if the main development progress permits.
* **Definitively out of scope (To guarantee technical feasibility):**
  * *Inventory Manager with automatic weight:* The app will allow noting items, but it will not calculate weight encumbrance or currency exchange automatically.
  * *Virtual Tabletop (VTT):* There will be no boards, real-time interactive maps, or 3D dice simulators.
  * *Real payment gateway:* Payment control will be for internal manual registration, without integration with real payment gateways like Stripe or PayPal in this phase.