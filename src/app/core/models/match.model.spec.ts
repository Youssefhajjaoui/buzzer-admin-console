import { describe, expect, it } from 'vitest';
import { statusActions, teamsAreDifferent } from './match.model';

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

describe('teamsAreDifferent', () => {
  it('rejects the same team on both sides', () => {
    expect(teamsAreDifferent('team-1', 'team-1')).toBe(false);
  });

  it('accepts two different teams', () => {
    expect(teamsAreDifferent('team-1', 'team-2')).toBe(true);
  });
});
