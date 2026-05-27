# MasterForge User Manual
## Comprehensive Platform Guide for Players and Dungeon Masters (DM)

Welcome to the **Official MasterForge User Manual**! This guide details the platform's features from an end-user perspective, splitting into the two core experiences: the **Player** and the **Dungeon Master (DM)**, along with a detailed overview of the co-creative **Homebrew Sandbox** ecosystem.

---

## 📌 1. Introduction and Roles in MasterForge

MasterForge is a comprehensive management platform (PWA) for D&D 5th Edition campaigns. The ecosystem divides core features based on your active account role:

*   **The Player:** Can forge interactive character sheets, join free or paid public tables in the *Campaign Guild*, manage equipment inventory, prepare spells, and automate level progression with verified formulas.
*   **The Dungeon Master (DM):** Has advanced tools to create campaigns, manage enrollment requests, schedule sessions with Discord notifications, browse an *interactive Bestiary*, and run live initiative grids with the *Combat Tracker*.

---

## 🔐 2. Account Configuration and Security

### 2.1 Registration and Login
1. Go to the **Register** screen and enter your name, email, and password.
2. Upon logging in, you will be redirected to the main **Dashboard** home screen.

### 2.2 Two-Factor Authentication (2FA)
To protect your characters and simulated billing details, MasterForge includes native support for **2FA (TOTP)**:
1. Navigate to **Settings** (`/config`).
2. Click **Enable 2FA**.
3. Scan the generated QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.).
4. Enter the temporary 6-digit code to validate activation.
5. **IMPORTANT:** Download and secure the **10 unique recovery codes**. These will allow account recovery if your mobile device is lost.

### 2.3 Discord Integration (OAuth2)
1. Under **Settings**, click the **Link Discord** button.
2. Authorize the application through the official Discord API portal.
3. **Result:** You will receive automated push notifications directly in your Discord client whenever session dates are scheduled or updated in your active campaigns.

---

## 🛡️ 3. Player's Guide

### 3.1 The Campaign Guild (Find Tables)
The **Campaign Guild** (`/search-campaigns`) allows players to search for open tables using 5 real, integrated query filters:
*   **Available Filters:**
    1.  *Text search*: Matches title, description, or DM name.
    2.  *Specific DM*: Search for campaigns organized by your favorite GMs.
    3.  *Price Range*: Filter for free tables or professional paid sessions.
    4.  *Player Capacity*: Filter by target party size limits.
    5.  *Availability*: Show only tables with open slots.
*   **Enrollment:**
    *   *Free Campaigns*: Clicking **Join** enrolls your character instantly if slots are vacant.
    *   *Paid Campaigns*: Enrolls your character after executing a secure simulated billing flow using your virtual wallet balance.

### 3.2 Character Forge (Step-by-Step Builder)
The **Forge Character** wizard (`/forge-character`) guides you through creating a mechanically compliant D&D 5e hero:
1.  **Race & Background:** Select official SRD 5.1 races (Human, Elf, Dwarf, etc.) or custom Homebrew races created by the community. Racial ability score increases apply automatically.
2.  **Class & Hit Points:** Select your starting class (Warrior, Wizard, Rogue, etc.). The engine computes maximum starting HP based on the class hit die and your Constitution modifier.
3.  **Ability Scores & Modifiers:** Distribute ability scores. Modifiers are updated instantly (e.g., Strength 16 $\rightarrow$ Modifier +3).

### 3.3 Interactive Character Sheet (`/character-sheet/:id`)
Open your character sheet to interact with your hero during active play:
*   **Health Tracking:**
    *   Edit your current hit points.
    *   Add **Temporary Hit Points** (tracked separately from maximum HP in accordance with 5e rules).
*   **Personal Ledger:** Track and update your currency pouches (Copper, Silver, Electrum, Gold, and Platinum).
*   **Inventory & Equipment:** Add weapons, armor, or magic items. Equipping armor recalculates your **Armor Class (AC)** and Initiative modifier instantly.
*   **Rules Engine & Long Rest:**
    *   Click **Long Rest** to trigger the backend rules engine.
    *   **Effect:** Automatically restores current HP to max, resets spent spell slots, clears temporary HP, and recovers 50% of your total Hit Dice pool.
*   **Level Up & Multiclassing:**
    *   Click **Level Up** to increase your character level.
    *   Choose to level your active class or select a new class (Multiclassing).
    *   The engine automatically computes combined multiclass caster slots and unlocks appropriate class traits.

---

## 📖 4. Dungeon Master's Guide

### 4.1 Campaign Creation and Control (`/my-campaigns`)
As a Dungeon Master, you maintain full structural control:
1.  **Create Campaign:** Set the title, narrative synopsis, price per session (for professional GMs), and maximum player capacity.
2.  **Player Management:** From the campaign detail view (`/campaigns/:id`), review and accept enrollment requests or remove (*kick*) players from the roster.
3.  **Schedule Sessions:** Set the date and time for the next adventure. The backend automatically fires notifications to all player Discord accounts.

### 4.2 Live Combat Tracker (`/campaigns/:id/combat-tracker`)
Run encounters smoothly without external tools:
1.  **Import Initiatives:** Select and load active player characters and add monsters from the *Bestiario*.
2.  **Roll Initiative:** Click sort initiative. The system executes virtual dice rolls, adds modifiers, and orders combatants from highest to lowest.
3.  **Turn Control:** Advance active turns, apply damage to targets, and review the live encounter timeline in the *Combat Log*.

---

## 🛠️ 5. Sandbox Homebrew Co-Creation (`/homebrew`)

The **Homebrew** editor (`/homebrew`) is MasterForge's sandbox. It allows you to expand the default D&D 5e rule set with custom content:

*   **Custom Races:** Set movement speed, ability score increases, and unique racial traits.
*   **Custom Classes & Subclasses:** Define starting hit dice and custom class traits unlocked level-by-level (from 1 to 20).
*   **Custom Spells:** Set casting time, range, components (V/S/M), school of magic, duration, and slot scaling properties.
*   **Custom Monsters:** Input CR, ability scores, action lists, resistances, and saving throw modifiers.
*   **Custom Items:** Configure armor, weapons, or wondrous magic items with active attribute modifiers (e.g. an amulet that sets Constitution to 19).

**Community Sharing:** Homebrew creations can be configured as *Private* (accessible only by you) or *Public* (shared in the global library for any campaign to import).

---

## 💳 6. Wallet and Premium Subscriptions

MasterForge simulates an academic commercial subscription model (academic mock billing):

*   **Virtual Wallet:** Simulate gold top-ups from your settings panel using test card credentials.
*   **DM Subscriptions:** Dungeon Masters can subscribe to the Premium Tier to unlock unlimited public campaigns and advanced combat tracker options.
*   **Mock Session Payments:** Enrolled players at paid campaigns pay session fees automatically from their virtual wallet.
*   > [!CAUTION]
    > **IMPORTANT SECURITY WARNING:** MasterForge's billing system is an **academic simulation for demonstration purposes only**. It does not connect to any real-world credit gateway (such as Stripe or PayPal). Under no circumstances should you enter real credit cards, bank details, or sensitive financial information. All balances and transactions are entirely fictitious.
