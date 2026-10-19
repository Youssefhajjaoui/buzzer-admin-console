import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { DASHBOARD_NAV, NAV_GROUPS } from '../constants/navigation';
import { filterNavGroups } from '../utils/filter-nav-groups.util';
import { AuthService } from '../../core/services/auth.service';
import { ShellStateService } from '../../core/services/shell-state.service';
import { IconComponent } from '../components/icon/icon.component';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.sidebar--collapsed]': 'shell.collapsed()',
  },
})
export class SidebarComponent {
  readonly shell = inject(ShellStateService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly dashboard = DASHBOARD_NAV;

  readonly groups = computed(() => filterNavGroups(NAV_GROUPS, this.shell.searchQuery()));

  readonly dashboardVisible = computed(() => {
    const query = this.shell.searchQuery().trim().toLowerCase();
    return !query || this.dashboard.label.toLowerCase().includes(query);
  });

  readonly matchCount = computed(() => {
    const groupCount = this.groups().reduce((total, group) => total + group.items.length, 0);
    return groupCount + (this.dashboardVisible() ? 1 : 0);
  });

  onSelectPage(): void {
    if (window.matchMedia('(max-width: 840px)').matches) {
      this.shell.setCollapsed(true);
    }
  }

  initials(email: string): string {
    const local = email.split('@')[0] ?? '';
    const parts = local.split(/[._-]+/).filter(Boolean);
    const letters = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : local.slice(0, 2);
    return letters.toUpperCase();
  }

  roleLabel(role: string): string {
    const labels: Record<string, string> = {
      ADMIN: 'Admin',
      OPERATOR: 'Operator',
      VIEWER: 'Viewer',
      ORG: 'Organisation',
      ORGANISATION: 'Organisation',
      ORGANIZATION: 'Organisation',
    };
    return labels[role.toUpperCase()] ?? role;
  }

  signOut(): void {
    this.auth.clearSession();
    void this.router.navigateByUrl('/login');
  }
}
