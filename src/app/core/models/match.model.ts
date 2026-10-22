export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';

export interface MatchTeam {
  id: string;
  name: string;
  shortName?: string | null;
}

export interface MatchSport {
  id: string;
  name: string;
  iconUrl?: string | null;
}

export interface Match {
  id: string;
  sportId: string;
  homeTeamId: string;
  awayTeamId: string;
  status: MatchStatus;
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  homeScore: number;
  awayScore: number;
  venue: string | null;
  homeTeam?: MatchTeam;
  awayTeam?: MatchTeam;
  sport?: MatchSport;
}

export interface MatchEvent {
  id: string;
  type: string;
  minute: number;
  detail: string | null;
  team?: { name: string } | null;
  player?: { firstName?: string | null; lastName?: string | null } | null;
}

export interface MatchStats {
  home: { team: string; events: Record<string, number> };
  away: { team: string; events: Record<string, number> };
}

export interface Scoreboard {
  home: { team: string; score: number };
  away: { team: string; score: number };
  status: MatchStatus;
  startedAt?: string | null;
}

export interface StatusAction {
  status: MatchStatus;
  label: string;
  confirm: boolean;
}

export const MATCH_STATUSES: MatchStatus[] = ['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED'];

export function statusActions(status: MatchStatus): StatusAction[] {
  if (status === 'SCHEDULED') {
    return [
      { status: 'LIVE', label: 'Go live', confirm: false },
      { status: 'CANCELLED', label: 'Cancel match', confirm: true },
    ];
  }

  if (status === 'LIVE') {
    return [
      { status: 'FINISHED', label: 'Finish', confirm: true },
      { status: 'CANCELLED', label: 'Cancel match', confirm: true },
    ];
  }

  return [];
}

export function teamsAreDifferent(homeTeamId: string, awayTeamId: string): boolean {
  return homeTeamId.length > 0 && homeTeamId !== awayTeamId;
}

export function canManageMatches(role: string | null | undefined): boolean {
  const value = role?.toUpperCase() ?? '';
  return value === 'ADMIN' || value === 'OPERATOR';
}

export function statusLabel(status: MatchStatus): string {
  const labels: Record<MatchStatus, string> = {
    SCHEDULED: 'Scheduled',
    LIVE: 'Live',
    FINISHED: 'Finished',
    CANCELLED: 'Cancelled',
  };
  return labels[status];
}

export function eventLabel(type: string): string {
  return type
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function playerName(player: MatchEvent['player']): string {
  const name = [player?.firstName, player?.lastName].filter(Boolean).join(' ').trim();
  return name || '—';
}
