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
     */
    fun validateChoices(feature: ClassFeature, userChoice: Any?): Boolean {
        val options = feature.options ?: return true // No choices required
        val type = options["type"] as? String ?: return true
        
        @Suppress("UNCHECKED_CAST")
        val choices = options["choices"] as? List<Map<String, Any>> ?: return true
        val validIds = choices.mapNotNull { it["id"] as? String }.toSet()

        return when (type) {
            "SELECT_ONE" -> {
                val selectedId = userChoice as? String
                selectedId != null && selectedId in validIds
            }
            "SELECT_MANY" -> {
                val selectedIds = userChoice as? List<*>
                val count = (options["count"] as? Number)?.toInt() ?: 1
                selectedIds != null && selectedIds.size == count && selectedIds.all { it in validIds }
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

            when (userChoice) {
                is String -> {
                    // SELECT_ONE
                    availableChoices.find { it["id"] == userChoice }?.let { choice ->
                        (choice["effects"] as? List<*>)?.filterIsInstance<Map<String, Any>>()?.forEach {
                            effects.add(mapToEffect(it))
                        }
                    }
                }
                is List<*> -> {
                    // SELECT_MANY
                    userChoice.filterIsInstance<String>().forEach { choiceId ->
                        availableChoices.find { it["id"] == choiceId }?.let { choice ->
                            (choice["effects"] as? List<*>)?.filterIsInstance<Map<String, Any>>()?.forEach {
                                effects.add(mapToEffect(it))
                            }
                        }
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
