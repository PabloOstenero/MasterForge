# D&D 5e Core Rule Support Analysis

This document evaluates the current architecture of **MasterForge** against the standard rules found in the *Player's Handbook (PHB)*, *Dungeon Master's Guide (DMG)*, and *Monster Manual (MM)*.

## 1. Classes and Subclasses
### PHB Support Status: **90% Structural / 40% Automated**

| Feature | Support Level | Technical Implementation |
| :--- | :--- | :--- |
| **Multiclassing** | Full | Handled via `CharacterClassLevel` entities and `calculateMulticlassSlots`. |
| **Proficiencies** | Full | Class-based proficiencies are mapped to the character on creation/level-up. |
| **Spellcasting** | High | Supports Known (Bard) vs Prepared (Cleric) vs All-List (Wizard) styles. |
| **Subclasses** | Full | Supported via `DndSubclass` entity linked to `DndClass`. |
| **Complex Resources** | Full | Ki, Sorcery Points, and Rages have dynamic counters synced with the backend. |

**Gaps & Edge Cases:**
- **Wild Shape:** Requires a "Form Switcher" that temporary overrides physical stats while keeping mental ones.
- **Uncanny Dodge / Evasion:** Mostly text-based reminders for now.

---

## 2. Races and Subraces
### PHB Support Status: **95% Structural / 80% Automated**

| Feature | Support Level | Technical Implementation |
| :--- | :--- | :--- |
| **Stat Bonuses** | Full | `DndRace` includes fields for all 6 ability score bonuses. |
| **Speed/Size** | Full | Hardcoded in `DndRace` and `pj` data mapping. |
| **Traits** | High | `RaceTrait` entities store description and can include JSON properties for logic. |
| **Subraces** | Medium | Currently handled as separate races or via trait text. |

**Gaps & Edge Cases:**
- **Halfling Luck:** Requires a hook in the (future) rolling engine to trigger on a natural 1.
- **Relentless Endurance:** Requires a "once per long rest" checkbox/tracker logic.

---

## 3. Spells and Magic
### PHB Support Status: **100% Structural / 50% Automated**

| Feature | Support Level | Technical Implementation |
| :--- | :--- | :--- |
| **Spell Data** | Full | `Spell` entity contains School, Components, Level, Range, Duration, etc. |
| **Spell Slots** | Full | Multiclass-aware slot calculation based on standard 5e progression. |
| **Preparation** | Full | Logic exists to limit prepared spells based on `Level + Mod`. |
| **Automation** | Low | No "Cast" button to roll damage or force saving throws. |

**Gaps & Edge Cases:**
- **Upcasting:** The UI displays `higherLevelDescription` but doesn't dynamically scale damage dice based on the slot used.
- **Warlock Pact Magic:** Handled as a specific case in `getAutoSpellSlots`, but mixing with standard slots (Multiclassing) needs verification.

---

## 4. Equipment and Magic Items
### DMG Support Status: **100% Structural / 70% Automated**

| Feature | Support Level | Technical Implementation |
| :--- | :--- | :--- |
| **Base Items** | Full | Supports Weight, Type, and Cost. |
| **Weapons** | High | Automated Attack/Damage strings based on `properties` JSON. |
| **Armor** | High | Supports `baseAc`, `dexLimit`, and `noDex` (Heavy Armor) flags. |
| **Stat Buffs** | High | Supports `bonus[Stat]` and `override[Stat]` in item properties. |

**Gaps & Edge Cases:**
- **Attunement:** No limit check (max 3) or "Attuned" toggle is currently enforced.
- **Charged Items:** "Staff of the Magi" style items need a way to track and spend charges.

---

## 5. Monsters and NPCs
### MM Support Status: **100% Structural / 20% Automated**

| Feature | Support Level | Technical Implementation |
| :--- | :--- | :--- |
| **Stat Blocks** | Full | `Monster` entity covers all base stats, size, and type. |
| **Mechanics** | High | `combat_mechanics` JSON stores actions, reactions, and legendary actions. |
| **Combat Use** | Low | Currently acts as a digital bestiary. Needs a "Combat Tracker" to be interactive. |

---

## Final Verdict
**MasterForge** is highly capable of *representing* the entirety of the D&D 5e core books due to its **JSON-first architecture**. 

- **Can it make every class/race?** YES. You can create the data structures for any PHB content today.
- **Is every ability automated?** NO. Many complex "passive" or "reactive" abilities (like *Uncanny Dodge* or *Aura of Protection*) are currently supported as **Text Reminders** rather than **Calculated Logic Hooks**.

### Recommended Roadmap for "Full Automation":
1. [x] **AC Engine Refactor**: Dynamic calculation supporting Unarmored Defense and specialized overrides.
2. [x] **Resource Tracker**: Generic `resourceCounters` system for Ki, Rages, and Feature charges.
3. **Roll Engine Integration**: Link the "Features" and "Spells" to a dice roller that understands `{damageDice}` and `{statMod}` variables.
4. **Active Effects / Conditions**: A system to track "Prone", "Restrained", or spells like "Haste" that modify stats in real-time.
