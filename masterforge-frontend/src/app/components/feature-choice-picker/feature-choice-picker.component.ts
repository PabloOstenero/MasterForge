import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { checkmarkCircle, radioButtonOff, radioButtonOn, checkboxOutline, squareOutline } from 'ionicons/icons';

@Component({
  selector: 'app-feature-choice-picker',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './feature-choice-picker.component.html',
  styleUrls: ['./feature-choice-picker.component.scss']
})
export class FeatureChoicePickerComponent implements OnInit {
  @Input() feature!: any; // ClassFeatureDto
  @Output() selectionChange = new EventEmitter<any>();

  selectedIds: string[] = [];
  booleanVal = false;
  
  // Helpers for template
  type: string = 'SELECT_ONE';
  choices: any[] = [];
  count: number = 1;

  constructor() {
    addIcons({ checkmarkCircle, radioButtonOff, radioButtonOn, checkboxOutline, squareOutline });
  }

  ngOnInit() {
    if (this.feature?.options) {
      this.type = this.feature.options.type || 'SELECT_ONE';
      this.choices = this.feature.options.choices || [];
      this.count = this.feature.options.count || 1;
    }
  }

  toggleChoice(id: string) {
    if (this.type === 'SELECT_ONE') {
      this.selectedIds = [id];
    } else if (this.type === 'SELECT_MANY') {
      const idx = this.selectedIds.indexOf(id);
      if (idx > -1) {
        this.selectedIds.splice(idx, 1);
      } else if (this.selectedIds.length < this.count) {
        this.selectedIds.push(id);
      }
    }
    this.emitChange();
  }

  onBooleanChange() {
    this.emitChange();
  }

  isSelected(id: string): boolean {
    return this.selectedIds.includes(id);
  }

  private emitChange() {
    if (this.type === 'BOOLEAN') {
      this.selectionChange.emit(this.booleanVal);
    } else if (this.type === 'SELECT_ONE') {
      this.selectionChange.emit(this.selectedIds[0] || null);
    } else {
      this.selectionChange.emit(this.selectedIds);
    }
  }
}
