import { describe, expect, it } from 'vitest';
import { goalNeedsTeam, statusActions, teamsAreDifferent, withEventNames } from './match.model';

describe('statusActions', () => {
  it('lets a scheduled match go live or be cancelled', () => {
    expect(statusActions('SCHEDULED').map((action) => action.status)).toEqual(['LIVE', 'CANCELLED']);
  });

  it('lets a live match finish or be cancelled', () => {
    expect(statusActions('LIVE').map((action) => action.status)).toEqual(['FINISHED', 'CANCELLED']);
  });

  it('offers no further status once a match is finished or cancelled', () => {
    expect(statusActions('FINISHED')).toEqual([]);
    expect(statusActions('CANCELLED')).toEqual([]);
  });

  it('asks for confirmation before finish and cancel, and not before go live', () => {
    expect(statusActions('SCHEDULED').find((action) => action.status === 'LIVE')?.confirm).toBe(false);
    expect(statusActions('SCHEDULED').find((action) => action.status === 'CANCELLED')?.confirm).toBe(true);
    expect(statusActions('LIVE').find((action) => action.status === 'FINISHED')?.confirm).toBe(true);
  });
});

describe('goalNeedsTeam', () => {
  it('requires a team for a goal and not for other events', () => {
    expect(goalNeedsTeam('GOAL', '')).toBe(false);
    expect(goalNeedsTeam('GOAL', 'home')).toBe(true);
    expect(goalNeedsTeam('FOUL', '')).toBe(true);
  });
});

describe('withEventNames', () => {
  it('fills team and player names from the loaded roster', () => {
    const named = withEventNames(
      { id: '1', type: 'GOAL', minute: 4, detail: null, teamId: 'home', playerId: 'p1', team: null, player: null },
      { home: 'Clip Demo FC' },
      { p1: { firstName: 'Demo', lastName: 'User Clip' } },
    );

    expect(named.team?.name).toBe('Clip Demo FC');
    expect(named.player?.lastName).toBe('User Clip');
  });
});

describe('teamsAreDifferent', () => {
  it('rejects the same team on both sides', () => {
    expect(teamsAreDifferent('team-1', 'team-1')).toBe(false);
  });

  it('accepts two different teams', () => {
    expect(teamsAreDifferent('team-1', 'team-2')).toBe(true);
  });
});
