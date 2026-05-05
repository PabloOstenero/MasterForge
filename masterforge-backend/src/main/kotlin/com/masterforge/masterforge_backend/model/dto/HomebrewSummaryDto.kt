package com.masterforge.masterforge_backend.model.dto

data class HomebrewSummaryDto(
    val classes: List<HomebrewItemDto>,
    val subclasses: List<HomebrewItemDto>,
    val races: List<HomebrewItemDto>,
    val monsters: List<HomebrewItemDto>,
    val spells: List<HomebrewItemDto>,
    val items: List<HomebrewItemDto>
)
