import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, FormArray } from '@angular/forms';
import { IonInput, IonCheckbox, IonItem, IonLabel, IonIcon, IonButton } from '@ionic/angular/standalone';
import { ABILITIES } from '../../pages/homebrew-class-form/homebrew-class-form.page';
import { addIcons } from 'ionicons';
import { shieldOutline, addOutline, flashOutline, trendingUpOutline, wifiOutline } from 'ionicons/icons';

@Component({
  selector: 'app-feature-mechanics',
  template: `
    <div [formGroup]="parentForm" class="mechanics-container">
      <div formGroupName="properties">

        <!-- TOGGLES -->
        <div class="mechanics-toggles">
          <label class="toggle-switch-mini">
            <input type="checkbox" [checked]="hasStats" (change)="toggleStats($event)">
            <span class="slider-mini"></span>
            <span class="toggle-label-mini">Atributos y Movimiento</span>
          </label>
          <label class="toggle-switch-mini">
            <input type="checkbox" [checked]="hasDefense" (change)="toggleDefense($event)">
            <span class="slider-mini"></span>
            <span class="toggle-label-mini">Defensa y Armadura</span>
          </label>
          <label class="toggle-switch-mini">
            <input type="checkbox" [checked]="hasResource" (change)="toggleResource($event)">
            <span class="slider-mini"></span>
            <span class="toggle-label-mini">Contador de Recursos</span>
          </label>
          <label class="toggle-switch-mini">
            <input type="checkbox" [checked]="hasAttunement" (change)="toggleAttunement($event)">
            <span class="slider-mini"></span>
            <span class="toggle-label-mini">Sintonización</span>
          </label>
        </div>
        
        <!-- STAT MODIFIERS & SPEED -->
        @if (hasStats) {
          <div class="mechanic-group-box">
            <header class="mechanic-box-header">
              <ion-icon name="trending-up-outline"></ion-icon>
              <h4>Atributos y Movimiento</h4>
            </header>
            <div class="mechanic-details">
              <div formGroupName="statModifiers" class="field-grid stat-mod-grid" style="margin-bottom: 16px;">
                <div class="field-group">
                  <label class="field-label">FU</label>
                  <ion-input type="number" formControlName="str" class="forge-input" placeholder="0"></ion-input>
                </div>
                <div class="field-group">
                  <label class="field-label">DES</label>
                  <ion-input type="number" formControlName="dex" class="forge-input" placeholder="0"></ion-input>
                </div>
                <div class="field-group">
                  <label class="field-label">CON</label>
                  <ion-input type="number" formControlName="con" class="forge-input" placeholder="0"></ion-input>
                </div>
                <div class="field-group">
                  <label class="field-label">INT</label>
                  <ion-input type="number" formControlName="int" class="forge-input" placeholder="0"></ion-input>
                </div>
                <div class="field-group">
                  <label class="field-label">SAB</label>
                  <ion-input type="number" formControlName="wis" class="forge-input" placeholder="0"></ion-input>
                </div>
                <div class="field-group">
                  <label class="field-label">CAR</label>
                  <ion-input type="number" formControlName="cha" class="forge-input" placeholder="0"></ion-input>
                </div>
              </div>

              <div class="field-grid">
                <div class="field-group">
                  <label class="field-label">Bono de Velocidad de Movimiento (ft)</label>
                  <ion-input type="number" formControlName="speedBonus" class="forge-input" placeholder="Ej: 10 o -5"></ion-input>
                </div>
                <div class="field-group">
                  <label class="field-label">Condición de Atributos/Velocidad</label>
                  <select formControlName="statsCondition" class="forge-select-native">
                    <option value="NONE">Ninguna (Siempre activo)</option>
                    <option value="UNARMORED">Sin Armadura (Unarmored)</option>
                    <option value="NO_SHIELD">Sin Escudo (No Shield)</option>
                    <option value="IS_WEARING_ARMOR">Con Armadura (Wearing Armor)</option>
                  </select>
                </div>
              </div>
              <p class="field-hint-mini">Usa estos modificadores para aumentar atributos básicos o la velocidad de movimiento.</p>
            </div>
          </div>
        }

        <!-- DEFENSE AND ARMOR -->
        @if (hasDefense) {
          <div class="mechanic-group-box">
            <header class="mechanic-box-header">
              <ion-icon name="shield-outline"></ion-icon>
              <h4>Defensa y Armadura</h4>
            </header>
            <div class="mechanic-details">
              
              <h5 class="sub-section-title">Cálculo de Base (Unarmored Defense)</h5>
              <div formGroupName="acCalculation" class="field-grid" style="margin-bottom: 16px;">
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
                <div class="field-group checkbox-group" style="grid-column: 1 / -1;">
                  <label class="toggle-switch-mini" style="margin-bottom: 8px;">
                    <input type="checkbox" formControlName="requiresNoArmor">
                    <span class="slider-mini"></span>
                    <span class="toggle-label-mini">Requiere NO llevar armadura</span>
                  </label>
                  <label class="toggle-switch-mini">
                    <input type="checkbox" formControlName="requiresNoShield">
                    <span class="slider-mini"></span>
                    <span class="toggle-label-mini">Requiere NO llevar escudo</span>
                  </label>
                </div>
              </div>

              <div class="divider"></div>

              <h5 class="sub-section-title">Bono de CA Pasivo (Estilo de Defensa)</h5>
              <div class="field-grid">
                <div class="field-group">
                  <label class="field-label">Bono</label>
                  <ion-input type="number" formControlName="acBonus" class="forge-input" placeholder="+1"></ion-input>
                </div>
                <div class="field-group">
                  <label class="field-label">Condición del Bono de CA</label>
                  <select formControlName="acCondition" class="forge-select-native">
                    <option value="NONE">Ninguna (Siempre activo)</option>
                    <option value="UNARMORED">Sin Armadura (Unarmored)</option>
                    <option value="NO_SHIELD">Sin Escudo (No Shield)</option>
                    <option value="IS_WEARING_ARMOR">Con Armadura (Wearing Armor)</option>
                  </select>
                </div>
              </div>

            </div>
          </div>
        }

        <!-- RESOURCE POOL -->
        @if (hasResource) {
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
        }

        <!-- ATTUNEMENT MODIFIER -->
        @if (hasAttunement) {
          <div class="mechanic-group-box">
            <header class="mechanic-box-header">
              <ion-icon name="wifi-outline"></ion-icon>
              <h4>Espacios de Sintonización</h4>
            </header>
            <div class="mechanic-details">
              <div class="field-grid">
                <div class="field-group">
                  <label class="field-label">Espacios Adicionales</label>
                  <ion-input type="number" formControlName="bonusAttunementSlots" class="forge-input" placeholder="+1"></ion-input>
                </div>
              </div>
              <p class="field-hint-mini">Esto aumentará el límite máximo de objetos mágicos sintonizados (Base 3) para el personaje.</p>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }
    .mechanics-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .mechanics-toggles {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 16px;
      padding: 10px;
      background: rgba(0,0,0,0.2);
      border-radius: 8px;
    }
    .sub-section-title {
      font-size: 0.75rem;
      color: #C5A059;
      text-transform: uppercase;
      margin-top: 0;
      margin-bottom: 12px;
    }
    .divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.05);
      margin: 16px 0;
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
    .stat-mod-grid {
      grid-template-columns: repeat(6, 1fr);
    }
    @media (max-width: 600px) {
      .stat-mod-grid {
        grid-template-columns: repeat(3, 1fr);
      }
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

  hasStats = false;
  hasDefense = false;
  hasResource = false;
  hasAttunement = false;

  constructor(private fb: FormBuilder) {
    addIcons({ shieldOutline, addOutline, flashOutline, trendingUpOutline, wifiOutline });
  }

  ngOnInit() {
    let props = this.parentForm.get('properties') as FormGroup;
    if (!props) {
      this.parentForm.addControl('properties', this.fb.group({}));
      props = this.parentForm.get('properties') as FormGroup;
    }

    // Check existing values to set toggles
    this.hasStats = !!props.get('statModifiers') || props.get('speedBonus') !== null || props.get('statsCondition') !== null;
    this.hasDefense = !!props.get('acCalculation') || props.get('acBonus') !== null || props.get('acCondition') !== null;
    this.hasResource = !!props.get('resourcePool');
    this.hasAttunement = props.get('bonusAttunementSlots') !== null;

    // Self-healing: if toggle is active but controls are missing (e.g. legacy loaded data),
    // dynamically add the missing controls so they are bound to the template without errors.
    if (this.hasStats) {
      if (!props.get('statModifiers')) {
        props.addControl('statModifiers', this.fb.group({
          str: [0], dex: [0], con: [0], int: [0], wis: [0], cha: [0]
        }));
      }
      if (!props.get('speedBonus')) {
        props.addControl('speedBonus', this.fb.control(0));
      }
      if (!props.get('statsCondition')) {
        props.addControl('statsCondition', this.fb.control('NONE'));
      }
    }

    if (this.hasDefense) {
      if (!props.get('acCalculation')) {
        props.addControl('acCalculation', this.fb.group({
          base: [10],
          stats: [[]],
          requiresNoArmor: [true],
          requiresNoShield: [true]
        }));
      }
      if (!props.get('acBonus')) {
        props.addControl('acBonus', this.fb.control(0));
      }
      if (!props.get('acCondition')) {
        props.addControl('acCondition', this.fb.control('NONE'));
      }
    }
  }

  toggleStats(event: any) {
    this.hasStats = event.target.checked;
    const props = this.parentForm.get('properties') as FormGroup;
    if (this.hasStats) {
      props.addControl('statModifiers', this.fb.group({
        str: [0], dex: [0], con: [0], int: [0], wis: [0], cha: [0]
      }));
      props.addControl('speedBonus', this.fb.control(0));
      props.addControl('statsCondition', this.fb.control('NONE'));
    } else {
      props.removeControl('statModifiers');
      props.removeControl('speedBonus');
      props.removeControl('statsCondition');
    }
  }

  toggleDefense(event: any) {
    this.hasDefense = event.target.checked;
    const props = this.parentForm.get('properties') as FormGroup;
    if (this.hasDefense) {
      props.addControl('acCalculation', this.fb.group({
        base: [10],
        stats: [[]],
        requiresNoArmor: [true],
        requiresNoShield: [true]
      }));
      props.addControl('acBonus', this.fb.control(0));
      props.addControl('acCondition', this.fb.control('NONE'));
    } else {
      props.removeControl('acCalculation');
      props.removeControl('acBonus');
      props.removeControl('acCondition');
    }
  }

  toggleResource(event: any) {
    this.hasResource = event.target.checked;
    const props = this.parentForm.get('properties') as FormGroup;
    if (this.hasResource) {
      props.addControl('resourcePool', this.fb.group({
        name: [''],
        max: ['level'],
        reset: ['LONG_REST']
      }));
    } else {
      props.removeControl('resourcePool');
    }
  }

  toggleAttunement(event: any) {
    this.hasAttunement = event.target.checked;
    const props = this.parentForm.get('properties') as FormGroup;
    if (this.hasAttunement) {
      props.addControl('bonusAttunementSlots', this.fb.control(1));
    } else {
      props.removeControl('bonusAttunementSlots');
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
