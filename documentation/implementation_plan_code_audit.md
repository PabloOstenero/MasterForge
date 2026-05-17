# MasterForge 5e System Comprehensiveness Audit Plan

To ensure the platform can handle *any* official content from the Player's Handbook, Dungeon Master's Guide, and Monster Manual without major workarounds, we need a rigorous audit and implementation of core engine mechanics. D&D 5e is complex, full of exceptions and intricate interactions. 

This plan details every system we must review, test, and potentially refactor to guarantee full compatibility and robust connectivity between Homebrew creation and the Character Sheet.

## User Review Required

> [!IMPORTANT]  
> This is a massive, multi-phase plan. Please review the categories. Does this align with your expectations for the engine's capability? Which phase do you want to tackle first?

## Phase 1: The Core Entity Models (Data Structure Audit)
We must ensure the backend and frontend data models can express complex 5e concepts.

### 1.1 Races & Subraces
- **Flexible ASI [COMPLETED]:** Support for customizable ability score choices during character creation (e.g., Half-Elf +2 Cha / +1 to two distinct stats; Variant Human +1 to two distinct stats) with strict D&D 5e overlap validation, persistent JSONB storage, and dedicated homebrew form ASI configuration card.
- **Subrace Inheritance:** Ensure subraces inherit parent race traits correctly while adding or overriding others.
- **Innate Spellcasting:** Support for spells gained at specific levels with specific casting abilities (e.g., Tiefling Infernal Legacy).
- **Conditional Speeds:** Climbing, swimming, flying speeds.
- **Size Variations:** Support for non-Medium/Small sizes.

### 1.2 Classes & Subclasses
- **Class Features Matrix:** Ensure features can grant proficiencies, spells, resources, AC calculations, and specialized scaling dice (e.g., Sneak Attack, Martial Arts).
- **Subclass Feature Injection:** Subclass features must seamlessly integrate into the main class progression.
- **Spellcasting Variations:** Full Caster, Half Caster (rounded down vs Artificer rounded up), Third Caster (Eldritch Knight), Pact Magic (Warlock). Multiclassing spell slot calculation engine.
- **Equipment Choices:** The starting equipment picker must handle complex "A or (B and C)" logic accurately.
- **Multiclassing Rules:** Verify prerequisite stats and specific proficiencies gained when multiclassing into a class (not the same as starting proficiencies).

### 1.3 Spells & Magic
- **Components:** Tracking V, S, M (and material costs/consumption).
- **Scaling:** Logic for upcasting spells ("At Higher Levels").
- **Class Spell Lists:** Mapping spells to classes for the character creator spell picker.

### 1.4 Items & Equipment
- **Weapon Properties:** Finesse, heavy, light, reach, thrown, versatile, loading, ammunition. The character sheet must respect these (e.g., using Dex for Finesse, applying disadvantage for Heavy if Small).
- **Armor Logic:** Base AC, Max Dex bonus (Medium armor), Stealth disadvantage, Strength requirements for Heavy armor.
- **Magic Items & Attunement [COMPLETED]:** Limit attunement to 3 active slots (plus customizable bonus slots from subclass/race features), backend attunement validation with 400 error responses, and dynamic passive stat overrides (e.g., setting Strength to a flat 19, or taking the natural score if higher) computed in the effective stats pipeline.

### 1.5 Spellcasting & Magic Management [NEW]
- **Concentration Tracking [OPTIONAL FUTURE CONTENT]:** Visual indicator for active concentration spells on the sheet, with a confirmation warning when trying to cast a second concentration spell.
- **Pact Magic vs. Spellcasting [COMPLETED]:** Separation of Warlock slots from other casters with visual purple design and rest recharge separation.
- **Prepared vs. Known [OPTIONAL FUTURE CONTENT]:** Enforcement and visual counter of spell preparation limits based on Level + Ability Modifier.

### 1.6 Rest & Recovery Engine [NEW]
- **Short Rest [COMPLETED]:** Healing via Hit Dice consumption and resource recovery (Ki, Fighter features, Pact slots).
- **Long Rest [COMPLETED]:** Full HP/Spell Slot recovery and Half-Max Hit Dice restoration (complying with D&D 5e minimum 1 recovery rules).
- **Recharge Mechanics [COMPLETED]:** Random recharge formulas for magic items (e.g., rolling `"1d4 + 1"` charges recovered on a Short or Long Rest) is fully integrated into the Rest & Recovery flow on the frontend.

### 1.7 Resources & Custom Counters [NEW]
- **Dynamic Scaling:** Resource max values that scale with `level` or `mod` (e.g., Bardic Inspiration).
- **Custom Tracking:** Support for user-defined counters in the Homebrew features.

### 1.8 Feats & Custom Feat Engine [FUTURE CONTENT]
- **ASI vs. Feat Selection**: Model choices at level 4/8/12/16/19, allowing custom/homebrew feats.
- **Dynamic Feature Injection**: Support feats that grant spells (e.g., Fey Touched), ASIs (e.g., Resilient), or resource counters (e.g., Martial Adept).

### 1.9 Backgrounds & Starting Assets [FUTURE CONTENT]
- **Standard & Custom Backgrounds**: Database schema and creation form for D&D backgrounds.
- **Initial Proficiencies**: Granting skill/tool proficiencies, languages, and starting gold/equipment.
- **Background Features**: Embedding unique background actions/properties (e.g., Shelter of the Faithful).

### 1.10 Multiclass Spellcasting Slot Consolidation [COMPLETED]
- **Aggregated Spellcaster Levels**: Implement standard 5e multiclass caster slot math based on combined levels of Full Casters, Half Casters, and Third Casters.
- **Pact Magic Isolation**: Keep Warlock Pact slots visually distinct and tracked separately, while allowing cross-casting with regular spell slots.

---

## 🛠️ Phase 1 Backlog: Technical Designs

### A. Flexible Ability Score Increases (ASI) [COMPLETED]
* **Goal**: Enable races like Half-Elves (+2 Cha, +1 to two distinct stats) or Variant Humans (+1 to two distinct stats) to select their custom stat choices.
* **Final Implementation**:
  1. **JSONB Persistence Schema**: Configured `bonusStr` ... `bonusCha` to serialize directly inside the dynamic JSONB map `raceFeatures` under both flat static bonuses and the optional `flexibleAsi` key:
     ```json
     "flexibleAsi": {
       "choicesCount": 2,
       "bonusValue": 1,
       "allowAbilityOverlap": false
     }
     ```
  2. **Unified ASI Form Card**: Built a stunning full-width **"Mejoras de Característica (ASI)"** section card inside the Homebrew Race Form to configure flat static stats and flexible choices side-by-side.
  3. **Character Forge UI**: Displays styled dropdown selectors using gold-accented visual tokens with high readability in the dark theme.
  4. **Proactive & Reactive Validation**: Options that conflict with the race's fixed static modifiers (or result in duplicate choices if disallowing overlaps) are automatically grayed out and disabled. Step transition is strictly blocked, preventing the player from advancing to subsequent steps if any overlap validation fails.
  5. **Serialization**: Saved chosen stats inside `choicesJson.selectedRacialAsis` on character submission.

### B. Spell Preparation Limits & Concentration Tracking
* **Goal**: Keep spellcasting honest on the sheet by limiting active spell choices and showing concentration states.
* **Proposed Implementation**:
  1. **Prep Limit Formula**: In `character-sheet.page.ts`, compute the preparation capacity dynamically per casting class:
     $$\text{Prep Capacity} = \text{Class Level} + \text{Spellcasting Ability Modifier}$$
  2. **Visual Counter**: Show `Prepared Spells: X / Y` under the spell list. If the user tries to prepare more than `Y` spells, display an friendly warning toast.
  3. **Concentration state**: Add a green/yellow eye icon next to spells requiring concentration. When one is cast, set an `isConcentratingOn: SpellId` state on the character. If they click to cast another concentration spell, prompt them: *"This will end concentration on [Previous Spell]. Proceed?"*
### 1.8 Feats & Custom Feat Engine [FUTURE CONTENT]
- **ASI vs. Feat Selection**: Model choices at level 4/8/12/16/19, allowing custom/homebrew feats.
- **Dynamic Feature Injection**: Support feats that grant spells (e.g., Fey Touched), ASIs (e.g., Resilient), or resource counters (e.g., Martial Adept).

### 1.9 Backgrounds & Starting Assets [FUTURE CONTENT]
- **Standard & Custom Backgrounds**: Database schema and creation form for D&D backgrounds.
- **Initial Proficiencies**: Granting skill/tool proficiencies, languages, and starting gold/equipment.
- **Background Features**: Embedding unique background actions/properties (e.g., Shelter of the Faithful).

## Phase 2: The Automated Effects Engine (The Glue)
The `calculateAutomatedEffects` logic in the Character Sheet is the heart of the app. It must process the data models into character stats.

### 2.1 AC Calculation Pipeline
- Handle standard Armor + Dex.
- Handle Unarmored Defense (Barbarian: 10 + Dex + Con; Monk: 10 + Dex + Wis).
- Handle Natural Armor (e.g., Lizardfolk: 13 + Dex).
- Handle flat AC overrides (e.g., Barkskin: minimum AC 16).
- Handle Shield bonuses and Magic Item bonuses.
- **Rule:** The engine must automatically select the *highest* valid AC calculation formula.

### 2.2 Stat & Modifier Pipeline
- Base Stats -> Racial ASI -> Feat ASI -> Class Feature Overrides -> Magic Item Overrides.
- **Expertise:** Support for double proficiency bonus in skills/tools (Rogue/Bard).
- **Jack of All Trades:** Half proficiency to non-proficient ability checks (including Initiative).

### 2.3 Resources & Actions
- **Resource Pools:** Ensure max values can scale dynamically based on Level or Ability Modifiers (e.g., Bardic Inspiration = Cha modifier, Ki = Monk Level).
- **Action Economy Sorting:** Correctly categorize features into Action, Bonus Action, Reaction, Special, and Passive in the UI.

## Phase 3: Character Creation & Progression Flow (UX/UI)
The Forge must guide the user smoothly through complex choices.

### 3.1 Choice Engine Refinement
- **Cascading Choices:** Ensure picking a subclass at level 3 unlocks the specific subclass features in the builder immediately.
- **Validation:** Prevent moving to the next step if mandatory choices (spells, skills, feature options) are pending.

### 3.2 Leveling Up
- **HP Management:** Rolling vs taking the average for HP upon level up.
- **Feature Options:** Prompting the user to make choices when a feature grants them at a new level (e.g., picking a new Eldritch Invocation or Metamagic option).

## Phase 4: Integration Testing Plan

To prove the system works, we will implement "Test Case Entities" using the Homebrew tools:

1. **The Barbarian Test:** Tests Unarmored Defense (AC calc), Rage (resource pool scaling, damage resistance effects), and Reckless Attack.
2. **The Warlock Test:** Tests Pact Magic (unique spell slots), Eldritch Invocations (dynamic feature choices), and Subclass spell lists.
3. **The Half-Elf Rogue Test:** Tests flexible ASIs, Expertise (skill calculation), and Sneak Attack (scaling dice).
4. **The Multiclass Paladin/Sorcerer (Sorcadin) Test:** Tests multiclass spell slot aggregation, fighting styles, and prerequisite enforcement.
