import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Fully themed dropdown to replace the native <select>, whose open option list
 * the browser renders with its own (unstyleable) OS chrome. This one matches the
 * app's dark/light theme, with custom hover, selection highlight and scrolling.
 *
 * Two-way bindable: [(value)].
 */
@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-select.component.html',
  styleUrl: './custom-select.component.css',
})
export class CustomSelectComponent {
  @Input() options: string[] = [];
  @Input() value = '';
  @Input() placeholder = 'Select…';
  @Input() ariaLabel = '';
  @Output() valueChange = new EventEmitter<string>();

  open = false;

  constructor(private el: ElementRef<HTMLElement>) {}

  toggle(): void {
    this.open = !this.open;
    if (this.open) this.scrollSelectedIntoView();
  }

  pick(option: string): void {
    this.value = option;
    this.valueChange.emit(option);
    this.open = false;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.open = false;
    }
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.open = false;
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && !this.open) {
      event.preventDefault();
      this.open = true;
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const i = this.options.indexOf(this.value);
      const next =
        event.key === 'ArrowDown'
          ? Math.min(this.options.length - 1, i + 1)
          : Math.max(0, i - 1);
      if (this.options[next]) this.pick(this.options[next]);
    }
  }

  private scrollSelectedIntoView(): void {
    // defer until the panel is in the DOM
    setTimeout(() => {
      const sel = this.el.nativeElement.querySelector('.opt.sel');
      sel?.scrollIntoView({ block: 'nearest' });
    });
  }
}
