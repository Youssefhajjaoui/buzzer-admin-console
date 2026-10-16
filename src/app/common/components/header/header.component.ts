import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { ShellStateService } from '../../../core/services/shell-state.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-header',
  imports: [IconComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  readonly shell = inject(ShellStateService);
  readonly searchSubmit = output<void>();

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.shell.setSearchQuery(value);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.searchSubmit.emit();
  }
}
