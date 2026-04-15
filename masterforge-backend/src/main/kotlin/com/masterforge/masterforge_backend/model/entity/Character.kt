package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.util.UUID

import com.masterforge.masterforge_backend.model.entity.Client
import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.DndRace
import com.masterforge.masterforge_backend.model.entity.DndClass

@Entity
@Table(name = "characters")
data class Character(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    val client: Client,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    val campaign: Campaign,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false)
    val level: Int,

    @Column(nullable = false, name = "current_hp")
    val currentHp: Int,

    @Column(nullable = false, name = "base_str")
    val baseStr: Int,

    @Column(nullable = false, name = "base_dex")
    val baseDex: Int,

    @Column(nullable = false, name = "base_con")
    val baseCon: Int,

    @Column(nullable = false, name = "base_int")
    val baseInt: Int,

    @Column(nullable = false, name = "base_wis")
    val baseWis: Int,

    @Column(nullable = false, name = "base_cha")
    val baseCha: Int,

    @Column(nullable = false, columnDefinition = "jsonb", name = "skill_proficiencies")
    val skillProficiencies: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dnd_race_id", nullable = false)
    val dndRace: DndRace,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dnd_class_id", nullable = false)
    val dndClass: DndClass
)
