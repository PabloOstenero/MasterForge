import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormGroup, FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { addIcons } from 'ionicons';
import { 
  add, trash, list, optionsOutline, flashOutline, 
  shieldOutline, statsChartOutline, trendingUpOutline,
  trashOutline, listOutline
} from 'ionicons/icons';
import { FeatureEffectEditorComponent } from '../feature-effect-editor/feature-effect-editor.component';

@Component({
  selector: 'app-feature-choice-editor',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, FeatureEffectEditorComponent],
  templateUrl: './feature-choice-editor.component.html',
  styleUrls: ['./feature-choice-editor.component.scss']
})
export class FeatureChoiceEditorComponent {
  @Input() parentForm!: FormGroup; // The 'options' group in the feature form

  effectTypes = [
    { value: 'STAT_MODIFIER', label: 'Modificador de Atributo (AC, Speed, etc.)' },
    { value: 'PROFICIENCY', label: 'Competencia (Habilidad, Salvación, etc.)' },
    { value: 'RESOURCE_MAX', label: 'Aumento de Recurso (Ki, Rabia, etc.)' }
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
    { value: 'res_superiority', label: 'Recurso: Dados de Superioridad' }
  ];

  conditions = [
    { value: 'IS_WEARING_ARMOR', label: 'Con Armadura' },
    { value: 'UNARMORED', label: 'Sin Armadura' },
    { value: 'NO_SHIELD', label: 'Sin Escudo' }
  ];

  constructor(private fb: FormBuilder) {
    addIcons({ 
      add, trash, list, optionsOutline, flashOutline, 
      shieldOutline, statsChartOutline, trendingUpOutline,
      trashOutline, listOutline
    });
  }

  get choices(): FormArray {
    return this.parentForm.get('choices') as FormArray;
  }

  addChoice() {
    const choice = this.fb.group({
      id: [this.generateId(), Validators.required],
      label: ['', Validators.required],
      description: ['', Validators.required],
      effects: this.fb.array([]),
      properties: this.fb.group({
        statModifiers: this.fb.group({
          str: [0], dex: [0], con: [0], int: [0], wis: [0], cha: [0]
        }),
        speedBonus: [0],
        statsCondition: ['NONE'],
        acBonus: [null],
        acCondition: ['NONE']
      })
    });
    this.choices.push(choice);
  }

  removeChoice(index: number) {
    this.choices.removeAt(index);
  }

  getEffects(choiceIndex: number): FormArray {
    return this.choices.at(choiceIndex).get('effects') as FormArray;
  }

  addEffect(choiceIndex: number, initialData?: any) {
    const effect = this.fb.group({
      type: [initialData?.type ?? 'PROFICIENCY', Validators.required],
      target: [initialData?.target ?? '', Validators.required],
      customTarget: [initialData?.customTarget ?? ''],
      value: [initialData?.value ?? 1, Validators.required],
      useProficiencyBonus: [initialData?.useProficiencyBonus ?? false],
      condition: [initialData?.condition ?? null]
    });
    this.getEffects(choiceIndex).push(effect);
  }

  removeEffect(choiceIndex: number, effectIndex: number) {
    this.getEffects(choiceIndex).removeAt(effectIndex);
  }

  private generateId(): string {
    return 'choice_' + Math.random().toString(36).substr(2, 9);
  }
}
