package com.masterforge.masterforge_backend.util

import com.masterforge.masterforge_backend.model.entity.Character
import com.masterforge.masterforge_backend.model.entity.CharacterClassLevel

object SpellcastingUtils {

    /**
     * Multiclass Spellcaster Table (Slots per level)
     * Index 0 = Level 1, ..., Index 19 = Level 20
     */
    private val MULTICLASS_TABLE = listOf(
        listOf(2, 0, 0, 0, 0, 0, 0, 0, 0), // Lvl 1
        listOf(3, 0, 0, 0, 0, 0, 0, 0, 0), // Lvl 2
        listOf(4, 2, 0, 0, 0, 0, 0, 0, 0), // Lvl 3
        listOf(4, 3, 0, 0, 0, 0, 0, 0, 0), // Lvl 4
        listOf(4, 3, 2, 0, 0, 0, 0, 0, 0), // Lvl 5
        listOf(4, 3, 3, 0, 0, 0, 0, 0, 0), // Lvl 6
        listOf(4, 3, 3, 1, 0, 0, 0, 0, 0), // Lvl 7
        listOf(4, 3, 3, 2, 0, 0, 0, 0, 0), // Lvl 8
        listOf(4, 3, 3, 3, 1, 0, 0, 0, 0), // Lvl 9
        listOf(4, 3, 3, 3, 2, 0, 0, 0, 0), // Lvl 10
        listOf(4, 3, 3, 3, 2, 1, 0, 0, 0), // Lvl 11
        listOf(4, 3, 3, 3, 2, 1, 0, 0, 0), // Lvl 12
        listOf(4, 3, 3, 3, 2, 1, 1, 0, 0), // Lvl 13
        listOf(4, 3, 3, 3, 2, 1, 1, 0, 0), // Lvl 14
        listOf(4, 3, 3, 3, 2, 1, 1, 1, 0), // Lvl 15
        listOf(4, 3, 3, 3, 2, 1, 1, 1, 0), // Lvl 16
        listOf(4, 3, 3, 3, 2, 1, 1, 1, 1), // Lvl 17
        listOf(4, 3, 3, 3, 3, 1, 1, 1, 1), // Lvl 18
        listOf(4, 3, 3, 3, 3, 2, 1, 1, 1), // Lvl 19
        listOf(4, 3, 3, 3, 3, 2, 2, 1, 1)  // Lvl 20
    )

    fun calculateMulticlassSlots(character: Character): Map<String, Any> {
        val classLevels = character.classLevels
        if (classLevels.isEmpty()) return emptyMap()

        // If only one class, use its own table if available
        if (classLevels.size == 1) {
            return calculateSingleClassSlots(classLevels[0])
        }

        var totalEffectiveLevel = 0.0
        val pactMagicSlots = mutableMapOf<Int, Int>() // Level -> Max Slots

        for (cl in classLevels) {
            val classFeatures = cl.dndClass.classFeatures
            val subclassFeatures = cl.subclass?.subclassFeatures
            val spellcasting = (subclassFeatures?.get("spellcasting") as? Map<*, *>)
                ?: (classFeatures?.get("spellcasting") as? Map<*, *>)

            if (spellcasting != null) {
                val type = spellcasting["spellcastingType"] as? String ?: "None"
                when (type) {
                    "Full Caster" -> totalEffectiveLevel += cl.level
                    "Half Caster" -> totalEffectiveLevel += Math.floor(cl.level / 2.0)
                    "Third Caster" -> totalEffectiveLevel += Math.floor(cl.level / 3.0)
                    "Pact Magic" -> {
                        val slots = calculatePactMagicSlots(cl)
                        slots.forEach { (lvl, count) ->
                            pactMagicSlots[lvl] = (pactMagicSlots[lvl] ?: 0) + count
                        }
                    }
                }
            }
        }

        val effectiveLevel = Math.max(1, totalEffectiveLevel.toInt())
        val slotsTableIdx = Math.min(19, effectiveLevel - 1)
        val multiclassSlots = MULTICLASS_TABLE[slotsTableIdx]

        val result = mutableMapOf<String, Any>()
        
        // Add Multiclass Slots
        multiclassSlots.forEachIndexed { i, max ->
            if (max > 0) {
                result["level_${i + 1}"] = mapOf("max" to max, "available" to max)
            }
        }

        // Merge Pact Magic Slots
        pactMagicSlots.forEach { (lvl, count) ->
            val key = "level_$lvl"
            val existing = result[key] as? Map<String, Int>
            val currentMax = existing?.get("max") ?: 0
            val newMax = currentMax + count
            result[key] = mapOf("max" to newMax, "available" to newMax)
        }

        return result
    }

    private fun calculateSingleClassSlots(cl: CharacterClassLevel): Map<String, Any> {
        val classFeatures = cl.dndClass.classFeatures
        val subclassFeatures = cl.subclass?.subclassFeatures
        val spellcasting = (subclassFeatures?.get("spellcasting") as? Map<*, *>)
            ?: (classFeatures?.get("spellcasting") as? Map<*, *>)

        if (spellcasting == null) return emptyMap()

        val table = (spellcasting["spellSlots"] as? Map<*, *>) ?: (spellcasting["spell_slots"] as? Map<*, *>)
        val slotsTable = table?.get("slots") as? List<List<Int>>

        if (slotsTable != null && slotsTable.size >= cl.level) {
            val row = slotsTable[cl.level - 1]
            val result = mutableMapOf<String, Any>()
            row.forEachIndexed { i, max ->
                if (max > 0) {
                    result["level_${i + 1}"] = mapOf("max" to max, "available" to max)
                }
            }
            return result
        }

        // Fallback for official types if table is missing
        val type = spellcasting["spellcastingType"] as? String ?: "None"
        return when (type) {
            "Full Caster" -> generateStandardSlots(cl.level, 1)
            "Half Caster" -> generateStandardSlots(cl.level, 2)
            "Third Caster" -> generateStandardSlots(cl.level, 3)
            "Pact Magic" -> calculatePactMagicSlotsAsMap(cl)
            else -> emptyMap()
        }
    }

    private fun generateStandardSlots(level: Int, factor: Int): Map<String, Any> {
        val effectiveLevel = Math.max(1, Math.ceil(level.toDouble() / factor).toInt())
        val slotsTableIdx = Math.min(19, effectiveLevel - 1)
        val multiclassSlots = MULTICLASS_TABLE[slotsTableIdx]
        val result = mutableMapOf<String, Any>()
        multiclassSlots.forEachIndexed { i, max ->
            if (max > 0) {
                result["level_${i + 1}"] = mapOf("max" to max, "available" to max)
            }
        }
        return result
    }

    private fun calculatePactMagicSlots(cl: CharacterClassLevel): Map<Int, Int> {
        val level = cl.level
        return when {
            level >= 9 -> mapOf(5 to when {
                level >= 17 -> 4
                else -> when {
                    level >= 11 -> 3
                    else -> 2
                }
            })
            level >= 7 -> mapOf(4 to 2)
            level >= 5 -> mapOf(3 to 2)
            level >= 3 -> mapOf(2 to 2)
            else -> mapOf(1 to 1)
        }
    }

    private fun calculatePactMagicSlotsAsMap(cl: CharacterClassLevel): Map<String, Any> {
        val slots = calculatePactMagicSlots(cl)
        val result = mutableMapOf<String, Any>()
        slots.forEach { (lvl, count) ->
            result["level_$lvl"] = mapOf("max" to count, "available" to count)
        }
        return result
    }
}
