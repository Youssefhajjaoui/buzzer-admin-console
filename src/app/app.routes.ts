import { Routes } from '@angular/router';
import { ShellComponent } from './shell/shell.component';

const section = (path: string, title: string, group: string) => ({
  path,
  loadComponent: () =>
    import('./pages/section/section-page.component').then((module) => module.SectionPage),
  data: { title, group },
});

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
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
      section('sports', 'Sports', 'Match Management'),
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
