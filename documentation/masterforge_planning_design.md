**1\. Project Objectives**

* **General Objective:** Develop "MasterForge", a management platform (ERP/CRM) and automated character creation engine, exclusive to the Dungeons & Dragons 5th Edition (D\&D 5e) system, oriented toward professional Game Masters (Pro-GMs) and their Players.  
* **Specific Objectives:**  
  * Implement a "Rules Engine" in the backend (Kotlin) capable of automatically calculating derived statistics (modifiers, AC, maximum HP, proficiency bonuses, spell slots) based on the character's race, class, and level, with flexible persistence.  
  * Develop a CRM module for the Game Master to manage campaigns, enrollment applications, and plan the session calendar connected to external notifications.  
  * Provide players with a mobile-first multiplataform application in Ionic for guided creation (Character Builder) and real-time interaction with their automated D\&D 5e sheets.  
  * Design a co-creative Homebrew Sandbox Workshop that allows forging new races, classes, spells, monsters, and items with automatic calculations, integrating Artificial Intelligence (LLM) assistance for narrative writing and mathematical balance audits.

**2\. Functional and Non-Functional Requirements**

* **Functional Requirements:**  
  * RF01: The system must distinguish between user roles (Pro-GM administrator and Player client).  
  * RF02: The system must allow the Pro-GM to plan sessions, associate clients/players, and automate payment tracking using a simulated virtual wallet.  
  * RF03: The system must allow Players to create D\&D 5e sheets by selecting base parameters from the SRD 5.1 or Homebrew content, automatically calculating the rest of the derived values (saves, skills, modifiers).  
  * RF04: The system must allow updating dynamic parameters in real-time during the game (current hit points, temporary hit points, currencies, and spent spell slots) with automatic triggers for rests (Short/Long Rest) and level-ups / multiclassing.  
  * RF05: The system must allow Homebrew content creators to receive interactive narrative assistance and mathematical balance validation assisted by an integrated AI in the creation Sandbox.  
* **Non-Functional Requirements:**  
  * RNF01 (Legality): Native pre-loaded mechanical content in the database will be strictly based on the D\&D SRD 5.1 Creative Commons license.  
  * RNF02 (Security): Authentication via JWT, secure password hashing using BCrypt, and native support for two-factor authentication (2FA / TOTP).  
  * RNF03 (Architecture): Strict separation between the multiplatform client (Ionic/Angular) and the business logic/mathematical calculations (Kotlin/Spring Boot) with PostgreSQL (`JSONB`) persistence.

**3\. Actor Identification**

* **Game Master (Pro-GM):** Campaign and session administrator. Manages confirmed players and utilizes the real-time tactical Combat Tracker.  
* **Player (Client):** Mobile app end-user. Creates and maintains their interactive D\&D 5e sheet using official or Homebrew content.  
* **Homebrew Creator:** User who designs custom mechanics in the Sandbox workshop with the help of the AI assistant.
* **LLM System (External Actor):** Artificial Intelligence that acts as an external service for narrative assistance and balance validation for the Homebrew Sandbox creations.

**4\. Main Use Cases / User Stories**

* **User Story 1 (Character Builder):** *As a Player, I want to select my class and race from a list, and enter my ability score rolls, so the app calculates my Armor Class and Modifiers automatically without using paper and pencil.*  
* **User Story 2 (Combat Management):** *As a Player, I want to be able to subtract my Hit Points in the mobile app when receiving damage and add temporary health, to keep control of my health in real-time during the session.*  
* **User Story 3 (Master's CRM):** *As a Pro-GM, I want to register a session in the calendar and see which players have confirmed their attendance and paid using the simulated virtual wallet.*  
* **User Story 4 (AI Assistant):** *As a Homebrew Creator, I want the AI to assist me in the narrative description of my original homebrew spell and validate that its numerical modifiers do not break the mathematical balance of the game.*

**5\. Project Scope (MVP Boundaries)**

* **Included in scope (MVP - Minimum Viable Product):**  
  * Mathematical engine of D\&D 5e rules compatible with the SRD 5.1 corpus.  
  * Modular co-creation Homebrew Sandbox workshop (create races, classes, subclasses, spells, monsters, and items with automatic calculations).  
  * Web and desktop management panel for the Pro-GM (campaign CRM, player enrollment, and tactical Combat Tracker).  
  * Responsive mobile app for the Player's interactive sheet with automatic triggers for rests (Long/Short Rest) and level-ups/multiclassing.  
  * Secure authentication via JWT, BCrypt, 2FA (TOTP), and integrated Discord notifications.  
  * Simulated electronic payment processor (closed virtual wallet and DM subscriptions).  
* **Definitively out of scope (To guarantee technical feasibility):**  
  * *Virtual Tabletop (VTT):* There will be no boards, real-time interactive maps, or 3D dice simulators.  
  * *Real payment gateway:* The payment gateway and wallet will be academic simulations for business model feasibility validation, without connecting real gateways like Stripe or PayPal.  
  * *Strict physical encumbrance weight manager:* The inventory allows noting and equipping items, but automated weight encumbrance calculation of D&D is postponed as a future work.