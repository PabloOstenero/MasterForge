import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, FormArray } from '@angular/forms';
import { IonInput, IonCheckbox, IonItem, IonLabel, IonIcon, IonButton } from '@ionic/angular/standalone';
import { ABILITIES } from '../../pages/homebrew-class-form/homebrew-class-form.page';

@Component({
  selector: 'app-feature-mechanics',
  template: `
    <div [formGroup]="parentForm" class="mechanics-container">
      <div formGroupName="properties">
        
        <!-- AC CALCULATION -->
        <div class="mechanic-section">
          <label class="spellcasting-toggle-label">
            <input type="checkbox" (change)="toggleAcCalculation($event)" [checked]="hasAcCalculation">
            <span>Configurar Cálculo de CA (como Defensa sin Armadura)</span>
          </label>

          @if (hasAcCalculation) {
            <div formGroupName="acCalculation" class="mechanic-details">
              <div class="field-grid">
                <div class="field-group">
                  <label class="field-label">Base CA</label>
                  <ion-input type="number" formControlName="base" class="forge-input" placeholder="10"></ion-input>
                </div>
                <div class="field-group">
                  <label class="field-label">Stats a añadir</label>
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
                <label class="spellcasting-toggle-label">
                  <input type="checkbox" formControlName="requiresNoArmor">
                  <span>Requiere NO llevar armadura</span>
                </label>
              </div>
            </div>
          }
        </div>

        <!-- AC BONUS -->
        <div class="mechanic-section">
          <label class="spellcasting-toggle-label">
            <input type="checkbox" (change)="toggleAcBonus($event)" [checked]="hasAcBonus">
            <span>Bono de CA (como Defensa de Guerrero)</span>
          </label>

          @if (hasAcBonus) {
            <div class="mechanic-details">
              <div class="field-grid">
                <div class="field-group">
                  <label class="field-label">Bono</label>
                  <ion-input type="number" formControlName="acBonus" class="forge-input" placeholder="+1"></ion-input>
                </div>
                <div class="field-group checkbox-group" style="margin-top: 24px;">
                  <label class="spellcasting-toggle-label">
                    <input type="checkbox" formControlName="acBonusArmorOnly">
                    <span>Solo con Armadura</span>
                  </label>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- RESOURCE POOL -->
        <div class="mechanic-section">
          <label class="spellcasting-toggle-label">
            <input type="checkbox" (change)="toggleResourcePool($event)" [checked]="hasResourcePool">
            <span>Contador de Usos (como Ki o Furias)</span>
          </label>

          @if (hasResourcePool) {
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
                  <label class="field-label">Se recupera en</label>
                  <select formControlName="reset" class="forge-select-native">
                    <option value="SHORT_REST">Descanso Corto</option>
                    <option value="LONG_REST">Descanso Largo</option>
                  </select>
                </div>
              </div>
            </div>
          }
        </div>

      </div>
    </div>
  `,
  styles: [`
    .mechanics-container {
      margin-top: 1rem;
      padding: 1rem;
      background: rgba(0,0,0,0.2);
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .mechanic-section {
      margin-bottom: 1rem;
      &:last-child { margin-bottom: 0; }
    }
    .mechanic-details {
      margin-top: 0.5rem;
      padding: 0.75rem;
      background: rgba(255,255,255,0.03);
      border-radius: 8px;
      border-left: 3px solid #C5A059;
    }
    .field-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;
    }
    .stat-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .chip {
      background: #1a1a1a;
      color: #888;
      border: 1px solid #383838;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 0.7rem;
      cursor: pointer;
      &--active {
        background: rgba(197, 160, 89, 0.15);
        color: #C5A059;
        border-color: #C5A059;
      }
    }
    .spellcasting-toggle-label {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f0e6d3;
      font-size: 0.85rem;
      cursor: pointer;
      input { accent-color: #C5A059; }
    }
    .field-label {
      display: block;
      color: #888;
      font-size: 0.7rem;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .forge-input {
      --background: #141414;
      --color: #f0e6d3;
      border: 1px solid #383838;
      border-radius: 4px;
      font-size: 0.85rem;
    }
    .forge-select-native {
      background: #141414;
      color: #f0e6d3;
      border: 1px solid #383838;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 0.85rem;
      width: 100%;
    }
    .checkbox-group { margin-top: 8px; }
  `],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonInput, IonCheckbox, IonItem, IonLabel, IonIcon, IonButton]
})
export class FeatureMechanicsComponent implements OnInit {
  @Input() parentForm!: FormGroup;
  
  abilities = ABILITIES;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    // Ensure properties group exists
    if (!this.parentForm.get('properties')) {
      this.parentForm.addControl('properties', this.fb.group({}));
    }
  }

  get hasAcCalculation() { return !!this.parentForm.get('properties.acCalculation'); }
  get hasAcBonus() { return this.parentForm.get('properties.acBonus')?.value !== undefined && this.parentForm.get('properties.acBonus')?.value !== null; }
  get hasResourcePool() { return !!this.parentForm.get('properties.resourcePool'); }

  toggleAcCalculation(event: any) {
    const props = this.parentForm.get('properties') as FormGroup;
    if (event.target.checked) {
      props.addControl('acCalculation', this.fb.group({
        base: [10],
        stats: [[]],
        requiresNoArmor: [true]
      }));
    } else {
      props.removeControl('acCalculation');
    }
  }

  toggleAcBonus(event: any) {
    const props = this.parentForm.get('properties') as FormGroup;
    if (event.target.checked) {
      props.addControl('acBonus', this.fb.control(0));
      props.addControl('acBonusArmorOnly', this.fb.control(false));
    } else {
      props.removeControl('acBonus');
      props.removeControl('acBonusArmorOnly');
    }
  }

  toggleResourcePool(event: any) {
    const props = this.parentForm.get('properties') as FormGroup;
    if (event.target.checked) {
      props.addControl('resourcePool', this.fb.group({
        name: [''],
        max: ['level'],
        reset: ['LONG_REST']
      }));
    } else {
      props.removeControl('resourcePool');
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
