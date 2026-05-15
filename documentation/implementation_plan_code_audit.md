# MasterForge 5e System Comprehensiveness Audit Plan

To ensure the platform can handle *any* official content from the Player's Handbook, Dungeon Master's Guide, and Monster Manual without major workarounds, we need a rigorous audit and implementation of core engine mechanics. D&D 5e is complex, full of exceptions and intricate interactions. 

This plan details every system we must review, test, and potentially refactor to guarantee full compatibility and robust connectivity between Homebrew creation and the Character Sheet.

## User Review Required

> [!IMPORTANT]  
> This is a massive, multi-phase plan. Please review the categories. Does this align with your expectations for the engine's capability? Which phase do you want to tackle first?

## Phase 1: The Core Entity Models (Data Structure Audit)
We must ensure the backend and frontend data models can express complex 5e concepts.

### 1.1 Races & Subraces
- **Flexible ASI:** Support for flexible ability score increases (e.g., Half-Elf: +2 Cha, +1 to two other distinct stats).
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
- **Magic Items & Attunement:** Items granting stat overrides (e.g., Gauntlets of Ogre Power setting Str to 19), granting spells, or modifying AC/Saves.

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

## Next Steps

If this plan looks complete to you, please approve it, and tell me where we should begin. I recommend starting with **Phase 1.1 & 1.2 (Data Structure Audit)** to see if the current backend Kotlin models and frontend TypeScript models can represent the complex scenarios (like flexible ASIs or Unarmored Defense).
