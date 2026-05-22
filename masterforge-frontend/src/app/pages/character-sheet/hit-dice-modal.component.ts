import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-hit-dice-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onDismiss()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Dados de Golpe</h2>
          <button class="close-btn" (click)="onDismiss()">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="pools-section">
            <div class="pool-row" *ngFor="let pool of pools; let i = index">
              <div class="pool-input-wrapper">
                <label class="pool-label">{{ pool.className }} (d{{ pool.dieType }})</label>
                <input
                  type="number"
                  class="pool-input"
                  [value]="poolValues[i]"
                  (change)="poolValues[i] = +$event.target.value"
                  [min]="0"
                  [max]="pool.total"
                  placeholder="Available"
                />
              </div>
              <button 
                class="roll-btn"
                (click)="onRoll(i)"
                [disabled]="pool.total - pool.spent <= 0"
              >
                🎲 {{ pool.className.split(' ')[0] }}
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" (click)="onDismiss()">Cancelar</button>
          <button class="btn-save" (click)="onSave()">Guardar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(1px);
    }

    .modal-content {
      background: #121212;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      max-width: 90vw;
      width: 100%;
      max-height: 90vh;
      color: white;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #333;
      
      h2 {
        margin: 0;
        color: #C5A059;
        font-size: 1.2rem;
        flex: 1;
      }
    }

    .close-btn {
      background: none;
      border: none;
      color: #C5A059;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-left: 16px;
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .pools-section {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .pool-row {
      display: flex;
      gap: 12px;
      align-items: flex-end;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #333;

      &:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
      }
    }

    .pool-input-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .pool-label {
      color: #888;
      font-size: 0.7rem;
      text-transform: uppercase;
      font-weight: bold;
      letter-spacing: 0.05em;
    }

    .pool-input {
      color: white;
      font-size: 1rem;
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 4px;
      padding: 8px 10px;
      font-family: inherit;

      &::placeholder {
        color: #666;
      }

      &:focus {
        outline: none;
        border-color: #C5A059;
      }
    }

    .roll-btn {
      background: #C5A059;
      color: #121212;
      border: none;
      border-radius: 6px;
      font-weight: bold;
      font-size: 0.85rem;
      min-width: 100px;
      height: 42px;
      padding: 0 12px;
      flex-shrink: 0;
      cursor: pointer;
      transition: opacity 0.2s;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &:not(:disabled):active {
        opacity: 0.8;
      }
    }

    .modal-footer {
      display: flex;
      gap: 12px;
      padding: 16px;
      border-top: 1px solid #333;
      background: #1a1a1a;
    }

    button {
      flex: 1;
      border-radius: 6px;
      font-weight: bold;
      font-size: 0.9rem;
      height: 44px;
      border: none;
      cursor: pointer;
      transition: opacity 0.2s;
      font-family: inherit;

      &:active {
        opacity: 0.8;
      }
    }

    .btn-cancel {
      background: #333;
      color: white;
    }

    .btn-save {
      background: #C5A059;
      color: #121212;
    }
  `]
})
export class HitDiceModalComponent {
  @Input() pools: any[] = [];
  @Input() onRollDice?: (poolIndex: number) => void;
  @Input() onSaveCallback?: (values: number[]) => void;
  @Input() onDismissCallback?: () => void;
  
  poolValues: (string | number)[] = [];

  ngOnInit() {
    this.poolValues = this.pools.map(pool => pool.total - pool.spent);
  }

  onRoll(index: number) {
    if (this.onRollDice) {
      this.onRollDice(index);
      setTimeout(() => {
        this.poolValues[index] = this.pools[index].total - this.pools[index].spent;
      }, 100);
    }
  }

  onSave() {
    if (this.onSaveCallback) {
      this.onSaveCallback(this.poolValues.map(v => +v));
    }
  }

  onDismiss() {
    if (this.onDismissCallback) {
      this.onDismissCallback();
    }
  }
}
