import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, FormArray } from '@angular/forms';
import { IonInput, IonCheckbox, IonItem, IonLabel, IonIcon, IonButton } from '@ionic/angular/standalone';
import { ABILITIES } from '../../pages/homebrew-class-form/homebrew-class-form.page';
import { addIcons } from 'ionicons';
import { shieldOutline, addOutline, flashOutline } from 'ionicons/icons';

@Component({
  selector: 'app-feature-mechanics',
  template: `
    <div [formGroup]="parentForm" class="mechanics-container">
      <div formGroupName="properties">
        
        <!-- AC CALCULATION -->
        <div class="mechanic-group-box">
          <header class="mechanic-box-header">
            <ion-icon name="shield-outline"></ion-icon>
            <h4>Cálculo de Armadura Base</h4>
          </header>
          <div formGroupName="acCalculation" class="mechanic-details">
            <div class="field-grid">
              <div class="field-group">
                <label class="field-label">Base CA</label>
                <ion-input type="number" formControlName="base" class="forge-input" placeholder="10"></ion-input>
              </div>
              <div class="field-group">
                <label class="field-label">Modificadores (Atributos)</label>
                <div class="stat-chips">
                  @for (stat of abilities; track stat) {
                    <button type="button" class="chip" 
                      [class.chip--active]="isStatSelected(stat)"
                      (click)="toggleStat(stat)">
                      {{ stat.substring(0,3).toUpperCase() }}
                    </button>
                  }
                </div>
              </div>
            </div>
            <div class="field-group checkbox-group">
              <label class="toggle-switch-mini">
                <input type="checkbox" formControlName="requiresNoArmor">
                <span class="slider-mini"></span>
                <span class="toggle-label-mini">Requiere NO llevar armadura (Unarmored Defense)</span>
              </label>
            </div>
          </div>
        </div>

        <!-- AC BONUS -->
        <div class="mechanic-group-box">
          <header class="mechanic-box-header">
            <ion-icon name="add-outline"></ion-icon>
            <h4>Bono de CA Pasivo</h4>
          </header>
          <div class="mechanic-details">
            <div class="field-grid">
              <div class="field-group">
                <label class="field-label">Bono</label>
                <ion-input type="number" formControlName="acBonus" class="forge-input" placeholder="+1"></ion-input>
              </div>
              <div class="field-group" style="margin-top: 10px;">
                <label class="toggle-switch-mini">
                  <input type="checkbox" formControlName="acBonusArmorOnly">
                  <span class="slider-mini"></span>
                  <span class="toggle-label-mini">Solo si lleva Armadura (Ej: Estilo de Defensa)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- RESOURCE POOL -->
        <div class="mechanic-group-box">
          <header class="mechanic-box-header">
            <ion-icon name="flash-outline"></ion-icon>
            <h4>Contador de Recursos</h4>
          </header>
          <div formGroupName="resourcePool" class="mechanic-details">
            <div class="field-grid">
              <div class="field-group">
                <label class="field-label">Nombre del Recurso</label>
                <ion-input formControlName="name" class="forge-input" placeholder="Puntos de Ki"></ion-input>
              </div>
              <div class="field-group">
                <label class="field-label">Máximo (Nº o "level")</label>
                <ion-input formControlName="max" class="forge-input" placeholder="Ej: 5 o level"></ion-input>
              </div>
              <div class="field-group">
                <label class="field-label">Restauración</label>
                <select formControlName="reset" class="forge-select-native">
                  <option value="SHORT_REST">Descanso Corto</option>
                  <option value="LONG_REST">Descanso Largo</option>
                  <option value="DAWN">Al Amanecer</option>
                  <option value="NONE">Nunca (Manual)</option>
                </select>
              </div>
            </div>
            <p class="field-hint-mini">Usa "level" o "PB" (Bono Competencia) en Máximo para escalado dinámico.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mechanics-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .mechanic-group-box {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 1rem;
    }
    .mechanic-box-header {
      background: rgba(0, 0, 0, 0.1);
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      
      ion-icon { color: #C5A059; font-size: 1.1rem; }
      h4 { margin: 0; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; color: #f0e6d3; }
    }
    .mechanic-details { padding: 16px; }
    .field-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
    }
    .stat-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }
    .chip {
      background: #141414;
      border: 1px solid #383838;
      color: #888;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 0.7rem;
      cursor: pointer;
      transition: all 0.2s;
      &:hover { border-color: #C5A059; color: #f0e6d3; }
      &.chip--active { background: rgba(197, 160, 89, 0.15); border-color: #C5A059; color: #C5A059; font-weight: bold; }
    }
    .toggle-switch-mini {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      input { display: none; }
      .slider-mini {
        width: 28px;
        height: 16px;
        background: #333;
        border-radius: 10px;
        position: relative;
        transition: 0.3s;
        &::after {
          content: '';
          position: absolute;
          width: 10px;
          height: 10px;
          background: #888;
          border-radius: 50%;
          top: 3px;
          left: 3px;
          transition: 0.3s;
        }
      }
      input:checked + .slider-mini {
        background: rgba(197, 160, 89, 0.4);
        &::after { left: 15px; background: #C5A059; }
      }
      .toggle-label-mini { font-size: 0.8rem; color: #888; }
    }
    .field-hint-mini {
      margin-top: 8px;
      font-size: 0.7rem;
      color: #666;
      font-style: italic;
    }
    .field-label {
      display: block;
      color: #555;
      font-size: 0.65rem;
      text-transform: uppercase;
      font-weight: bold;
      margin-bottom: 6px;
    }
    .forge-input {
      --background: #141414;
      --color: #f0e6d3;
      border: 1px solid #383838;
      border-radius: 6px;
      font-size: 0.85rem;
    }
    .forge-select-native {
      background: #141414;
      color: #f0e6d3;
      border: 1px solid #383838;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 0.85rem;
      width: 100%;
      outline: none;
      &:focus { border-color: #C5A059; }
    }
  `],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonInput, IonCheckbox, IonItem, IonLabel, IonIcon, IonButton]
})
export class FeatureMechanicsComponent implements OnInit {
  @Input() parentForm!: FormGroup;
  
  abilities = ABILITIES;

  constructor(private fb: FormBuilder) {
    addIcons({ shieldOutline, addOutline, flashOutline });
  }

  ngOnInit() {
    const props = this.parentForm.get('properties') as FormGroup;
    if (!props) return;

    // Ensure all sub-groups exist for the UI to bind correctly
    if (!props.get('acCalculation')) {
      props.addControl('acCalculation', this.fb.group({
        base: [10],
        stats: [[]],
        requiresNoArmor: [true]
      }));
    }
    if (props.get('acBonus') === null || props.get('acBonus') === undefined) {
      props.addControl('acBonus', this.fb.control(0));
    }
    if (props.get('acBonusArmorOnly') === null || props.get('acBonusArmorOnly') === undefined) {
      props.addControl('acBonusArmorOnly', this.fb.control(false));
    }
    if (!props.get('resourcePool')) {
      props.addControl('resourcePool', this.fb.group({
        name: [''],
        max: ['level'],
        reset: ['LONG_REST']
      }));
    }
  }

  isStatSelected(stat: string): boolean {
    const stats = this.parentForm.get('properties.acCalculation.stats')?.value || [];
    return stats.includes(stat.toLowerCase());
  }

  toggleStat(stat: string) {
    const ctrl = this.parentForm.get('properties.acCalculation.stats');
    if (!ctrl) return;
    const current = [...ctrl.value];
    const s = stat.toLowerCase();
    const idx = current.indexOf(s);
    if (idx > -1) current.splice(idx, 1);
    else current.push(s);
    ctrl.setValue(current);
  }
}
