import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DASHBOARD_NAV, NAV_GROUPS } from '../constants/navigation';
import { filterNavGroups } from '../utils/filter-nav-groups.util';
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
}
