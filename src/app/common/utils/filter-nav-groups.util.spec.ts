import { DASHBOARD_NAV, NAV_GROUPS } from '../constants/navigation';
import { filterNavGroups, firstVisibleNavItem } from './filter-nav-groups.util';

describe('filterNavGroups', () => {
  it('returns every group when the query is blank', () => {
    expect(filterNavGroups(NAV_GROUPS, '  ')).toHaveLength(NAV_GROUPS.length);
  });

  it('keeps a whole group when the group label matches', () => {
    const groups = filterNavGroups(NAV_GROUPS, 'finance');
    expect(groups.map((group) => group.label)).toEqual(['Finance']);
    expect(groups[0].items).toHaveLength(3);
  });

  it('filters items by label', () => {
    const groups = filterNavGroups(NAV_GROUPS, 'invoice');
    expect(groups).toEqual([
      {
        label: 'Finance',
        items: [NAV_GROUPS[2].items[1]],
      },
    ]);
  });

  it('picks the first visible destination for search submit', () => {
    const groups = filterNavGroups(NAV_GROUPS, 'invoice');
    expect(firstVisibleNavItem(groups, false, DASHBOARD_NAV)?.path).toBe('/invoices');
  });
});
