import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { HeaderComponent } from '../common/components/header/header.component';
import { DASHBOARD_NAV, NAV_GROUPS } from '../common/constants/navigation';
import { SidebarComponent } from '../common/sidebar/sidebar.component';
import { filterNavGroups, firstVisibleNavItem } from '../common/utils/filter-nav-groups.util';
import { ShellStateService } from '../core/services/shell-state.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, HeaderComponent, SidebarComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  readonly shell = inject(ShellStateService);
  private readonly router = inject(Router);

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.syncTitle();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(() => this.syncTitle());
  }

  onSearchSubmit(): void {
    const query = this.shell.searchQuery().trim().toLowerCase();
    const dashboardMatches = !query || DASHBOARD_NAV.label.toLowerCase().includes(query);
    const target = firstVisibleNavItem(
      filterNavGroups(NAV_GROUPS, query),
      dashboardMatches,
      DASHBOARD_NAV,
    );

    if (target) {
      void this.router.navigateByUrl(target.path);
    }
  }

  private syncTitle(): void {
    let route = this.router.routerState.snapshot.root;
    let title = 'Dashboard';

    while (route.firstChild) {
      route = route.firstChild;
      const routeTitle = route.data['title'];
      if (typeof routeTitle === 'string') {
        title = routeTitle;
      }
    }

    this.shell.pageTitle.set(title);
  }
}
