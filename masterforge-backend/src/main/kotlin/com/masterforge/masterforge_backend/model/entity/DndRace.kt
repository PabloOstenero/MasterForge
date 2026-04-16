package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.util.UUID

@Entity
@Table(name = "dnd_races")
data class DndRace(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int = 0,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false)
    val price: BigDecimal,

    @Column(name = "bonus_str", nullable = false)
    val bonusStr: Int,

    @Column(name = "bonus_dex", nullable = false)
    val bonusDex: Int,

    @Column(name = "bonus_con", nullable = false)
    val bonusCon: Int,

    @Column(name = "bonus_int", nullable = false)
    val bonusInt: Int,

    @Column(name = "bonus_wis", nullable = false)
    val bonusWis: Int,

    @Column(name = "bonus_cha", nullable = false)
    val bonusCha: Int,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    val author: User
)