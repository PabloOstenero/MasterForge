import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { shieldOutline, ribbonOutline, flashOutline, trash } from 'ionicons/icons';

@Component({
  selector: 'app-feature-effect-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
  templateUrl: './feature-effect-editor.component.html',
  styleUrls: ['./feature-effect-editor.component.scss']
})
export class FeatureEffectEditorComponent {
  constructor() {
    addIcons({ shieldOutline, ribbonOutline, flashOutline, trash });
  }
  @Input() effectsArray!: FormArray;
  @Input() label: string = 'Efectos Automatizados';

  effectTypes = [
    { value: 'STAT_MODIFIER', label: 'Modificador de Atributo (Suma)' },
    { value: 'PROFICIENCY', label: 'Competencia (Habilidad/Salvación)' },
    { value: 'SENSE', label: 'Sentido (Ej: Visión en la Oscuridad)' },
    { value: 'DAMAGE_RESISTANCE', label: 'Resistencia a Daño' },
    { value: 'DAMAGE_IMMUNITY', label: 'Inmunidad a Daño' },
    { value: 'CONDITION_IMMUNITY', label: 'Inmunidad a Condición' }
  ];

  statTargets = [
    // Stats
    { value: 'armorClass', label: 'Clase de Armadura (AC)' },
    { value: 'speed', label: 'Velocidad' },
    { value: 'baseStr', label: 'Fuerza' },
    { value: 'baseDex', label: 'Destreza' },
    { value: 'baseCon', label: 'Constitución' },
    { value: 'baseInt', label: 'Inteligencia' },
    { value: 'baseWis', label: 'Sabiduría' },
    { value: 'baseCha', label: 'Carisma' },
    // Saving Throws
    { value: 'save_str', label: 'Salvación: Fuerza' },
    { value: 'save_dex', label: 'Salvación: Destreza' },
    { value: 'save_con', label: 'Salvación: Constitución' },
    { value: 'save_int', label: 'Salvación: Inteligencia' },
    { value: 'save_wis', label: 'Salvación: Sabiduría' },
    { value: 'save_cha', label: 'Salvación: Carisma' },
    // Skills
    { value: 'skill_athletics', label: 'Habilidad: Atletismo' },
    { value: 'skill_acrobatics', label: 'Habilidad: Acrobacias' },
    { value: 'skill_sleight_of_hand', label: 'Habilidad: Juego de Manos' },
    { value: 'skill_stealth', label: 'Habilidad: Sigilo' },
    { value: 'skill_arcana', label: 'Habilidad: Arcanos' },
    { value: 'skill_history', label: 'Habilidad: Historia' },
    { value: 'skill_investigation', label: 'Habilidad: Investigación' },
    { value: 'skill_nature', label: 'Habilidad: Naturaleza' },
    { value: 'skill_religion', label: 'Habilidad: Religión' },
    { value: 'skill_animal_handling', label: 'Habilidad: Trato con Animales' },
    { value: 'skill_insight', label: 'Habilidad: Perspicacia' },
    { value: 'skill_medicine', label: 'Habilidad: Medicina' },
    { value: 'skill_perception', label: 'Habilidad: Percepción' },
    { value: 'skill_survival', label: 'Habilidad: Supervivencia' },
    { value: 'skill_deception', label: 'Habilidad: Engaño' },
    { value: 'skill_intimidation', label: 'Habilidad: Intimidación' },
    { value: 'skill_performance', label: 'Habilidad: Interpretación' },
    { value: 'skill_persuasion', label: 'Habilidad: Persuasión' },
    // Resources
    { value: 'res_ki', label: 'Recurso: Ki' },
    { value: 'res_rage', label: 'Recurso: Rabia' },
    { value: 'res_sorcery', label: 'Recurso: Puntos de Hechicería' },
    { value: 'res_superiority', label: 'Recurso: Dados de Superioridad' },
    { value: 'res_custom', label: 'Recurso Personalizado...' },
    // Senses
    { value: 'sense_darkvision', label: 'Sentido: Visión en la Oscuridad' },
    { value: 'sense_blindsight', label: 'Sentido: Vista Ciega' },
    { value: 'sense_tremorsense', label: 'Sentido: Sentido de la Vibración' },
    { value: 'sense_truesight', label: 'Sentido: Vista Verdadera' },
    // Damage Types
    { value: 'dmg_acid', label: 'Daño: Ácido' },
    { value: 'dmg_bludgeoning', label: 'Daño: Contundente' },
    { value: 'dmg_cold', label: 'Daño: Frío' },
    { value: 'dmg_fire', label: 'Daño: Fuego' },
    { value: 'dmg_force', label: 'Daño: Fuerza' },
    { value: 'dmg_lightning', label: 'Daño: Relámpago' },
    { value: 'dmg_necrotic', label: 'Daño: Necrótico' },
    { value: 'dmg_piercing', label: 'Daño: Perforante' },
    { value: 'dmg_poison', label: 'Daño: Veneno' },
    { value: 'dmg_psychic', label: 'Daño: Psíquico' },
    { value: 'dmg_radiant', label: 'Daño: Radiante' },
    { value: 'dmg_slashing', label: 'Daño: Cortante' },
    { value: 'dmg_thunder', label: 'Daño: Trueno' },
    // Conditions
    { value: 'cond_blinded', label: 'Condición: Cegado' },
    { value: 'cond_charmed', label: 'Condición: Hechizado' },
    { value: 'cond_deafened', label: 'Condición: Ensordecido' },
    { value: 'cond_frightened', label: 'Condición: Asustado' },
    { value: 'cond_grappled', label: 'Condición: Agarrado' },
    { value: 'cond_incapacitated', label: 'Condición: Incapacitado' },
    { value: 'cond_invisible', label: 'Condición: Invisible' },
    { value: 'cond_paralyzed', label: 'Condición: Paralizado' },
    { value: 'cond_petrified', label: 'Condición: Petrificado' },
    { value: 'cond_poisoned', label: 'Condición: Envenenado' },
    { value: 'cond_prone', label: 'Condición: Derribado' },
    { value: 'cond_restrained', label: 'Condición: Apresado' },
    { value: 'cond_stunned', label: 'Condición: Aturdido' },
    { value: 'cond_unconscious', label: 'Condición: Inconsciente' }
  ];

  conditions = [
    { value: 'IS_WEARING_ARMOR', label: 'Si lleva armadura' },
    { value: 'IS_NOT_WEARING_ARMOR', label: 'Si NO lleva armadura' },
    { value: 'IS_USING_SHIELD', label: 'Si usa escudo' },
    { value: 'IS_USING_MELEE_WEAPON', label: 'Si usa arma cuerpo a cuerpo' }
  ];

  getFilteredTargets(type: string) {
    if (!type) return [];
    
    switch (type) {
      case 'STAT_MODIFIER':
        return this.statTargets.filter(t => 
          ['armorClass', 'speed', 'baseStr', 'baseDex', 'baseCon', 'baseInt', 'baseWis', 'baseCha'].includes(t.value)
        );
      case 'PROFICIENCY':
        return this.statTargets.filter(t => t.value.startsWith('save_') || t.value.startsWith('skill_'));
      case 'SENSE':
        return this.statTargets.filter(t => t.value.startsWith('sense_'));
      case 'DAMAGE_RESISTANCE':
      case 'DAMAGE_IMMUNITY':
        return this.statTargets.filter(t => t.value.startsWith('dmg_'));
      case 'CONDITION_IMMUNITY':
        return this.statTargets.filter(t => t.value.startsWith('cond_'));
      default:
        return this.statTargets;
    }
  }

  onTypeChange(index: number) {
    const effect = this.effectsArray.at(index);
    effect.get('target')?.setValue('');
  }

  @Output() onAddEffect = new EventEmitter<void>();
  @Output() onRemoveEffect = new EventEmitter<number>();

  removeEffect(index: number) {
    this.onRemoveEffect.emit(index);
  }
}
