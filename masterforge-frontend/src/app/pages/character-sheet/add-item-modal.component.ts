import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular/standalone';

export interface ItemWithOwnership {
  id: string;
  name: string;
  type: string;
  weight?: number;
  properties?: Record<string, any>;
  itemCategory?: 'official' | 'homebrew';
  authorName?: string;
}

@Component({
  selector: 'app-add-item-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onDismiss()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Añadir al Equipo</h2>
          <button class="close-btn" (click)="onDismiss()">✕</button>
        </div>

        <div class="search-section">
          <input
            type="text"
            class="search-input"
            [(ngModel)]="searchQuery"
            (input)="onSearchInput()"
            placeholder="Buscar items..."
          />
        </div>

        <div class="modal-body">
          <div *ngIf="filteredItems.length === 0" class="no-results">
            <p>No se encontraron items disponibles</p>
          </div>

          <div *ngIf="filteredItems.length > 0" class="items-grid">
            <div
              *ngFor="let item of filteredItems"
              class="item-card"
              [class.selected]="isSelected(item.id)"
              (click)="toggleItem(item)"
            >
              <div class="item-header">
                <div>
                  <div class="item-name">{{ item.name }}</div>
                  <span class="item-badge" [ngClass]="item.itemCategory === 'homebrew' ? 'homebrew' : 'official'">
                    {{ item.itemCategory === 'homebrew' ? 'Homebrew' : 'Oficial' }}
                  </span>
                </div>
                <div *ngIf="isSelected(item.id)" class="check-icon">✓</div>
              </div>

              <div class="item-details">
                <div class="item-type">{{ item.type }}</div>
                <div *ngIf="item.authorName" class="item-author">por {{ item.authorName }}</div>
                <div *ngIf="item.weight" class="item-weight">{{ item.weight }} kg</div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" (click)="onDismiss()">Cancelar</button>
          <button class="btn-add" [disabled]="!selectedItem" (click)="onAdd()">Añadir</button>
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
      background: rgba(0, 0, 0, 0.5);
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
      max-width: 600px;
      width: 90vw;
      max-height: 70vh;
      color: white;
      min-height: 0;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #333;
      flex-shrink: 0;

      h2 {
        margin: 0;
        color: #C5A059;
        font-size: 1.1rem;
        flex: 1;
        text-align: center;
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
    }

    .close-btn:hover {
      opacity: 0.8;
    }

    .search-section {
      padding: 10px 16px;
      border-bottom: 1px solid #333;
      flex-shrink: 0;
    }

    .search-input {
      width: 100%;
      padding: 10px 12px;
      background: #1a1a1a;
      border: 1px solid rgba(197, 160, 89, 0.2);
      border-radius: 8px;
      color: white;
      font-size: 0.95rem;
      box-sizing: border-box;
    }

    .search-input::placeholder {
      color: rgba(197, 160, 89, 0.6);
    }

    .search-input:focus {
      outline: none;
      border-color: #C5A059;
      box-shadow: 0 0 8px rgba(197, 160, 89, 0.2);
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
    }

    .no-results {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
      color: rgba(197, 160, 89, 0.6);
      font-size: 1rem;
    }

    .items-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
    }

    .item-card {
      background: #1a1a1a;
      border: 2px solid rgba(197, 160, 89, 0.2);
      border-radius: 8px;
      padding: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
    }

    .item-card:hover {
      border-color: #C5A059;
      box-shadow: 0 0 10px rgba(197, 160, 89, 0.2);
    }

    .item-card.selected {
      border-color: #C5A059;
      background-color: rgba(197, 160, 89, 0.1);
      box-shadow: 0 0 15px rgba(197, 160, 89, 0.3);
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 6px;
    }

    .item-name {
      font-weight: 600;
      font-size: 0.85rem;
      color: white;
      line-height: 1.2;
      word-break: break-word;
    }

    .item-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 600;
      margin-top: 4px;
      white-space: nowrap;
    }

    .item-badge.official {
      background: #0066CC;
      color: white;
    }

    .item-badge.homebrew {
      background: #C5A059;
      color: #121212;
    }

    .check-icon {
      background: #C5A059;
      color: #121212;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      flex-shrink: 0;
    }

    .item-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .item-type {
      font-size: 0.75rem;
      color: #C5A059;
      text-transform: uppercase;
    }

    .item-author {
      font-size: 0.7rem;
      color: rgba(197, 160, 89, 0.6);
      font-style: italic;
    }

    .item-weight {
      font-size: 0.7rem;
      color: rgba(197, 160, 89, 0.6);
    }

    .modal-footer {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid #333;
      flex-shrink: 0;
    }

    .btn-cancel,
    .btn-add {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }

    .btn-cancel {
      background: #2a2a2a;
      color: white;
    }

    .btn-cancel:hover {
      background: #333;
    }

    .btn-add {
      background: #C5A059;
      color: #121212;
    }

    .btn-add:hover:not(:disabled) {
      background: #d4b876;
    }

    .btn-add:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 600px) {
      .modal-content {
        max-width: 100vw;
        width: 100vw;
        height: 100vh;
        border-radius: 0;
      }

      .items-grid {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      }
    }

    @media (max-height: 600px) {
      .modal-content {
        max-height: 95vh;
      }

      .items-grid {
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      }
    }
  `]
})
export class AddItemModalComponent implements OnInit {
  @Input() items: ItemWithOwnership[] = [];

  searchQuery = '';
  filteredItems: ItemWithOwnership[] = [];
  selectedItem: ItemWithOwnership | null = null;
  private searchTimeout: any;

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    this.filteredItems = [...this.items];
  }

  onSearchInput() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.applyFilter();
    }, 300);
  }

  private applyFilter() {
    const query = this.searchQuery.toLowerCase().trim();

    if (!query) {
      this.filteredItems = [...this.items];
      return;
    }

    this.filteredItems = this.items.filter((item) => {
      const matchesName = item.name.toLowerCase().includes(query);
      const matchesType = item.type?.toLowerCase().includes(query);
      const matchesAuthor = item.authorName?.toLowerCase().includes(query);

      return matchesName || matchesType || matchesAuthor;
    });
  }

  toggleItem(item: ItemWithOwnership) {
    if (this.selectedItem?.id === item.id) {
      this.selectedItem = null;
    } else {
      this.selectedItem = item;
    }
  }

  isSelected(itemId: string): boolean {
    return this.selectedItem?.id === itemId;
  }

  onAdd() {
    if (this.selectedItem) {
      this.modalController.dismiss(this.selectedItem.id, 'confirm');
    }
  }

  onDismiss() {
    this.modalController.dismiss(null, 'canceled');
  }
}
