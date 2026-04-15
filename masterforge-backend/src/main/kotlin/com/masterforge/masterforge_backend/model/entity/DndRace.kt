package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*

@Entity
@Table(name = "dnd_races")
data class DndRace(

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false, name = "bonus_str")
    val bonusStr: Int,

    @Column(nullable = false, name = "bonus_dex")
    val bonusDex: Int,

    @Column(nullable = false, name = "bonus_con")
    val bonusCon: Int,

    @Column(nullable = false, name = "bonus_int")
    val bonusInt: Int,

    @Column(nullable = false, name = "bonus_wis")
    val bonusWis: Int,

    @Column(nullable = false, name = "bonus_cha")
    val bonusCha: Int
)
