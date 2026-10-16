import { NavGroup, NavItem } from '../models/navigation.model';

export function filterNavGroups(groups: readonly NavGroup[], query: string): NavGroup[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return groups.map((group) => ({ ...group, items: [...group.items] }));
  }

  return groups
    .map((group) => {
      if (group.label.toLowerCase().includes(normalized)) {
        return { ...group, items: [...group.items] };
      }

      const items = group.items.filter((item) => item.label.toLowerCase().includes(normalized));
      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);
}

export function firstVisibleNavItem(
  groups: readonly NavGroup[],
  dashboardMatches: boolean,
  dashboard: NavItem,
): NavItem | null {
  if (dashboardMatches) {
    return dashboard;
  }

  return groups[0]?.items[0] ?? null;
}
