package com.masterforge.masterforge_backend.util

import com.masterforge.masterforge_backend.model.entity.Character
import com.masterforge.masterforge_backend.model.entity.ClassFeature

data class FeatureEffect(
    val type: String,
    val target: String,
    val value: Any,
    val condition: String? = null
)

object FeatureChoiceEngine {

    /**
     * Validates that the provided choices for a feature match its defined options.
     * Expects choices for this feature to be in choicesJson under the feature's ID or name.
     * Accepts choices as either:
     * - Choice IDs (strings matching the "id" field in choices)
     * - Choice labels (strings matching the "label" field in choices)
     * - Arrays of either for SELECT_MANY
     */
    fun validateChoices(feature: ClassFeature, userChoice: Any?): Boolean {
        val options = feature.options ?: return true // No choices required
        val type = options["type"] as? String ?: return true
        
        @Suppress("UNCHECKED_CAST")
        val choices = options["choices"] as? List<Map<String, Any>> ?: return true
        val validIds = choices.mapNotNull { it["id"] as? String }.toSet()
        val validLabels = choices.mapNotNull { it["label"] as? String }.toSet()

        // Normalize userChoice to a list of strings for consistent handling
        val selectedValues = when (userChoice) {
            is String -> listOf(userChoice)
            is List<*> -> userChoice.filterIsInstance<String>()
            else -> return false
        }

        return when (type) {
            "SELECT_ONE" -> {
                // Should have exactly 1 choice, and it should match either an ID or label
                selectedValues.size == 1 && (selectedValues[0] in validIds || selectedValues[0] in validLabels)
            }
            "SELECT_MANY" -> {
                val count = (options["count"] as? Number)?.toInt() ?: 1
                // Should have exactly 'count' choices, each matching either an ID or label
                selectedValues.size == count && selectedValues.all { it in validIds || it in validLabels }
            }
            "BOOLEAN" -> userChoice is Boolean
            else -> true
        }
    }

    /**
     * Extracts all active effects from a character based on their features and made choices.
     */
    fun getActiveEffects(character: Character): List<FeatureEffect> {
        val allEffects = mutableListOf<FeatureEffect>()
        val choicesJson = character.choicesJson ?: emptyMap()

        // 1. Get features from primary class
        character.dndClass.features.forEach { feature ->
            if (feature.levelRequired <= character.level) {
                allEffects.addAll(extractEffects(feature, choicesJson))
            }
        }

        // 2. Get features from subclass
        character.subclass?.features?.forEach { feature ->
            if (feature.levelRequired <= character.level) {
                allEffects.addAll(extractEffects(feature, choicesJson))
            }
        }

        // 3. Get features from multiclass levels
        character.classLevels.forEach { classLevel ->
            classLevel.dndClass.features.forEach { feature ->
                if (feature.levelRequired <= classLevel.level) {
                    allEffects.addAll(extractEffects(feature, choicesJson))
                }
            }
            classLevel.subclass?.features?.forEach { feature ->
                if (feature.levelRequired <= classLevel.level) {
                    allEffects.addAll(extractEffects(feature, choicesJson))
                }
            }
        }

        return allEffects
    }

    private fun extractEffects(feature: ClassFeature, choicesJson: Map<String, Any>): List<FeatureEffect> {
        val effects = mutableListOf<FeatureEffect>()

        // A. Extract global effects (from 'properties')
        feature.properties?.let { props ->
            (props["effects"] as? List<*>)?.filterIsInstance<Map<String, Any>>()?.forEach {
                effects.add(mapToEffect(it))
            }
        }

        // B. Extract choice-based effects
        val options = feature.options
        if (options != null) {
            val featureKey = feature.id?.toString() ?: feature.name
            val userChoice = choicesJson[featureKey]

            @Suppress("UNCHECKED_CAST")
            val availableChoices = options["choices"] as? List<Map<String, Any>> ?: emptyList()

            // Normalize userChoice to a list for consistent handling
            val selectedValues = when (userChoice) {
                is String -> listOf(userChoice)
                is List<*> -> userChoice.filterIsInstance<String>()
                else -> emptyList()
            }

            selectedValues.forEach { value ->
                // Try to find by ID first, then by label
                val choice = availableChoices.find { it["id"] == value }
                    ?: availableChoices.find { it["label"] == value }
                
                choice?.let {
                    (it["effects"] as? List<*>)?.filterIsInstance<Map<String, Any>>()?.forEach { effect ->
                        effects.add(mapToEffect(effect))
                    }
                }
            }
        }

        return effects
    }

    private fun mapToEffect(data: Map<String, Any>): FeatureEffect {
        return FeatureEffect(
            type = data["type"] as? String ?: "UNKNOWN",
            target = data["target"] as? String ?: "UNKNOWN",
            value = data["value"] ?: 0,
            condition = data["condition"] as? String
        )
    }
}
