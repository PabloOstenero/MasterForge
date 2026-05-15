/**
 * HelpTooltipComponent — reusable in-app help tooltip.
 *
 * Displays a small "?" icon button. On click, toggles a tooltip bubble
 * showing the provided help text. Closes when clicking outside.
 *
 * Usage:
 *   <app-help-tooltip text="Your help text here"></app-help-tooltip>
 */

import {
  Component,
  Input,
  HostListener,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { helpCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-help-tooltip',
  templateUrl: './help-tooltip.component.html',
  styleUrls: ['./help-tooltip.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonIcon],
})
export class HelpTooltipComponent {
  /** The help text to display inside the tooltip bubble. */
  @Input() text = '';

  /** Whether the tooltip bubble is currently visible. */
  isOpen = false;

  constructor(
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({ helpCircleOutline });
  }

  /** Toggle the tooltip on button click. */
  toggle(event: Event): void {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
    this.cdr.markForCheck();
  }

  /** Close the tooltip when clicking outside this component. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.isOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
      this.cdr.markForCheck();
    }
  }
}
