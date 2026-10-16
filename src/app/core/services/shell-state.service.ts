import { Injectable, signal } from '@angular/core';

const COLLAPSED_KEY = 'buzzer.sidebar.collapsed';

@Injectable({ providedIn: 'root' })
export class ShellStateService {
  readonly collapsed = signal(this.readCollapsed());
  readonly searchQuery = signal('');
  readonly pageTitle = signal('Dashboard');

  toggleCollapsed(): void {
    this.collapsed.update((value) => !value);
    this.persistCollapsed();
  }

  setCollapsed(value: boolean): void {
    this.collapsed.set(value);
    this.persistCollapsed();
  }

  setSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  private readCollapsed(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  }

  private persistCollapsed(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(COLLAPSED_KEY, String(this.collapsed()));
  }
}
