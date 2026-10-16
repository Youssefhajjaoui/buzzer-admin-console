import { NavGroup } from '../models/navigation.model';

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Match Management',
    items: [
      { label: 'Matches', path: '/matches', icon: 'matches' },
      { label: 'Competitions', path: '/competitions', icon: 'competitions' },
      { label: 'Sports', path: '/sports', icon: 'sports' },
      { label: 'Venues', path: '/venues', icon: 'venues' },
    ],
  },
  {
    label: 'Publishing',
    items: [
      { label: 'Articles', path: '/articles', icon: 'articles' },
      { label: 'Media', path: '/media', icon: 'media' },
      { label: 'Notifications', path: '/notifications', icon: 'notifications' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Payments', path: '/payments', icon: 'payments' },
      { label: 'Invoices', path: '/invoices', icon: 'invoices' },
      { label: 'Reports', path: '/reports', icon: 'reports' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Users', path: '/users', icon: 'users' },
      { label: 'Settings', path: '/settings', icon: 'settings' },
      { label: 'Audit log', path: '/audit-log', icon: 'audit' },
    ],
  },
];

export const DASHBOARD_NAV = {
  label: 'Dashboard',
  path: '/dashboard',
  icon: 'dashboard',
} as const;
