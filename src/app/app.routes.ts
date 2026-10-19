import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { ShellComponent } from './shell/shell.component';

const section = (path: string, title: string, group: string) => ({
  path,
  loadComponent: () =>
    import('./pages/section/section-page.component').then((module) => module.SectionPage),
  data: { title, group },
});

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login-page.component').then((module) => module.LoginPage),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard-page.component').then(
            (module) => module.DashboardPage,
          ),
        data: { title: 'Dashboard' },
      },
      section('matches', 'Matches', 'Match Management'),
      section('competitions', 'Competitions', 'Match Management'),
      {
        path: 'sports',
        loadComponent: () =>
          import('./pages/sports/sports-page.component').then((module) => module.SportsPage),
        data: { title: 'Sports', group: 'Match Management' },
      },
      {
        path: 'sports/:sportId',
        loadComponent: () =>
          import('./pages/sports/sport-detail-page.component').then((module) => module.SportDetailPage),
        data: { title: 'Sport', group: 'Match Management' },
      },
      {
        path: 'sports/:sportId/governing-bodies/:bodyId',
        loadComponent: () =>
          import('./pages/sports/governing-body-page.component').then((module) => module.GoverningBodyPage),
        data: { title: 'Governing body', group: 'Match Management' },
      },
      {
        path: 'sports/:sportId/governing-bodies/:bodyId/organisations/:organisationId',
        loadComponent: () =>
          import('./pages/sports/organisation-page.component').then((module) => module.OrganisationPage),
        data: { title: 'Organisation', group: 'Match Management' },
      },
      {
        path: 'sports/:sportId/governing-bodies/:bodyId/organisations/:organisationId/participants/:playerId',
        loadComponent: () =>
          import('./pages/sports/participant-page.component').then((module) => module.ParticipantPage),
        data: { title: 'Participant', group: 'Match Management' },
      },
      section('venues', 'Venues', 'Match Management'),
      section('articles', 'Articles', 'Publishing'),
      section('media', 'Media', 'Publishing'),
      section('notifications', 'Notifications', 'Publishing'),
      section('payments', 'Payments', 'Finance'),
      section('invoices', 'Invoices', 'Finance'),
      section('reports', 'Reports', 'Finance'),
      section('users', 'Users', 'System'),
      section('settings', 'Settings', 'System'),
      section('audit-log', 'Audit log', 'System'),
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
