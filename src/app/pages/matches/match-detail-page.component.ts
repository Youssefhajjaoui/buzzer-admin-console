import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, forkJoin, merge, switchMap } from 'rxjs';
import { Player } from '../../core/models/catalogue.model';
import {
  EVENT_TYPES,
  Match,
  MatchEvent,
  MatchStats,
  MatchStatus,
  Scoreboard,
  StatusAction,
  canManageMatches,
  eventLabel,
  goalNeedsTeam,
  playerName,
  statusActions,
  statusLabel,
  withEventNames,
} from '../../core/models/match.model';
import { AuthService, apiErrorMessage } from '../../core/services/auth.service';
import { MatchLiveService } from '../../core/services/match-live.service';
import { MatchService } from '../../core/services/match.service';

@Component({
  selector: 'app-match-detail-page',
  imports: [RouterLink, DatePipe, ReactiveFormsModule],
  templateUrl: './match-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchDetailPage {
  private readonly matchesApi = inject(MatchService);
  private readonly live = inject(MatchLiveService);
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refresh = new Subject<void>();

  readonly match = signal<Match | null>(null);
  readonly events = signal<MatchEvent[]>([]);
  readonly stats = signal<MatchStats | null>(null);
  readonly scoreboard = signal<Scoreboard | null>(null);
  readonly players = signal<Player[]>([]);
  readonly error = signal<string | null>(null);
  readonly eventError = signal<string | null>(null);
  readonly liveError = signal<string | null>(null);
  readonly loading = signal(true);
  readonly pending = signal<StatusAction | null>(null);
  readonly returnQuery = signal<Record<string, string>>({});
  readonly eventTypes = EVENT_TYPES;
  private readonly teamNames = signal<Record<string, string>>({});
  private readonly playerNames = signal<Record<string, Player>>({});

  readonly eventForm = this.formBuilder.nonNullable.group({
    type: ['GOAL', Validators.required],
    minute: [0, [Validators.required, Validators.min(0)]],
    teamId: [''],
    playerId: [''],
    detail: [''],
  });

  constructor() {
    merge(this.route.paramMap, this.refresh)
      .pipe(
        switchMap(() => {
          const matchId = this.route.snapshot.paramMap.get('matchId');
          if (!matchId) {
            return EMPTY;
          }

          this.loading.set(true);
          return forkJoin({
            match: this.matchesApi.get(matchId),
            events: this.matchesApi.timeline(matchId),
            stats: this.matchesApi.stats(matchId),
            scoreboard: this.matchesApi.scoreboard(matchId),
          }).pipe(
            catchError((error: unknown) => {
              this.loading.set(false);
              this.error.set(apiErrorMessage(error, 'The match could not be loaded.'));
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ match, events, stats, scoreboard }) => {
        this.match.set(match);
        this.events.set(events);
        this.stats.set(stats);
        this.scoreboard.set(scoreboard);
        this.loading.set(false);
        this.error.set(null);
        this.rememberTeams(match);
        this.loadRoster(match);
        this.live.join(match.id);
      });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const query: Record<string, string> = {};
      for (const key of ['status', 'page', 'search', 'sortBy', 'sortOrder']) {
        const value = params.get(key);
        if (value) {
          query[key] = value;
        }
      }
      this.returnQuery.set(query);
    });

    this.live.events$.pipe(takeUntilDestroyed()).subscribe((payload) => {
      if (payload.matchId !== this.match()?.id) {
        return;
      }
      this.remember({
        id: payload.id,
        type: payload.type,
        minute: payload.minute,
        detail: payload.detail,
        teamId: payload.teamId,
        playerId: payload.playerId,
        team: null,
        player: null,
      });
    });

    this.live.scoreboards$.pipe(takeUntilDestroyed()).subscribe((payload) => {
      const current = this.match();
      if (!current || payload.matchId !== current.id) {
        return;
      }
      this.scoreboard.set({
        home: payload.home,
        away: payload.away,
        status: payload.status,
        startedAt: payload.startedAt,
      });
      this.match.set({
        ...current,
        status: payload.status,
        startedAt: payload.startedAt ?? current.startedAt,
        homeScore: payload.home.score,
        awayScore: payload.away.score,
      });
    });

    this.live.statuses$.pipe(takeUntilDestroyed()).subscribe((payload) => {
      const current = this.match();
      if (!current || payload.id !== current.id) {
        return;
      }
      this.match.set({ ...current, status: payload.status });
      this.matchesApi.get(current.id).subscribe((match) => {
        this.match.update((latest) =>
          latest && latest.id === match.id
            ? { ...latest, status: match.status, startedAt: match.startedAt, finishedAt: match.finishedAt }
            : latest,
        );
      });
    });

    this.live.connectionError$.pipe(takeUntilDestroyed()).subscribe((message) => this.liveError.set(message));
    this.destroyRef.onDestroy(() => this.live.leave());
  }

  get canManage(): boolean {
    return canManageMatches(this.auth.user()?.role);
  }

  actions(): StatusAction[] {
    const match = this.match();
    return match ? statusActions(match.status) : [];
  }

  label(status: MatchStatus): string {
    return statusLabel(status);
  }

  eventType(type: string): string {
    return eventLabel(type);
  }

  player(event: MatchEvent): string {
    return playerName(event.player);
  }

  playerOption(player: Player): string {
    const name = [player.firstName, player.lastName].filter(Boolean).join(' ');
    return player.jerseyNumber == null ? name : `${player.jerseyNumber} ${name}`;
  }

  counts(events: Record<string, number>): Array<{ type: string; count: number }> {
    return Object.entries(events).map(([type, count]) => ({ type: eventLabel(type), count }));
  }

  onEventTeam(): void {
    const match = this.match();
    const teamId = this.eventForm.controls.teamId.value;
    this.eventForm.controls.playerId.setValue('');
    if (!match || !teamId) {
      this.players.set([]);
      return;
    }
    this.matchesApi.players(teamId).subscribe({
      next: (players) => {
        this.players.set(players);
        this.playerNames.update((current) => {
          const next = { ...current };
          for (const player of players) {
            next[player.id] = player;
          }
          return next;
        });
      },
      error: (error: unknown) => this.eventError.set(apiErrorMessage(error, 'Players could not be loaded.')),
    });
  }

  addEvent(): void {
    const match = this.match();
    if (!match || match.status !== 'LIVE') {
      return;
    }

    const value = this.eventForm.getRawValue();
    if (!goalNeedsTeam(value.type, value.teamId)) {
      this.eventForm.controls.teamId.setErrors({ required: true });
      return;
    }
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }

    this.matchesApi
      .addEvent(match.id, {
        type: value.type,
        minute: Number(value.minute),
        ...(value.teamId ? { teamId: value.teamId } : {}),
        ...(value.playerId ? { playerId: value.playerId } : {}),
        ...(value.detail.trim() ? { detail: value.detail.trim() } : {}),
      })
      .subscribe({
        next: (event) => {
          this.remember(event);
          this.eventError.set(null);
          this.eventForm.controls.detail.setValue('');
        },
        error: (error: unknown) => this.eventError.set(apiErrorMessage(error, 'The event could not be added.')),
      });
  }

  request(action: StatusAction, dialog: HTMLDialogElement): void {
    if (action.confirm) {
      this.pending.set(action);
      dialog.showModal();
      return;
    }

    this.apply(action.status);
  }

  confirm(dialog: HTMLDialogElement): void {
    const action = this.pending();
    if (!action) {
      return;
    }

    dialog.close();
    this.apply(action.status);
  }

  private apply(status: MatchStatus): void {
    const match = this.match();
    if (!match) {
      return;
    }

    this.matchesApi.updateStatus(match.id, status).subscribe({
      next: () => this.refresh.next(),
      error: (error: unknown) => this.error.set(apiErrorMessage(error, 'The status could not be changed.')),
    });
  }

  private remember(event: MatchEvent): void {
    const named = withEventNames(event, this.teamNames(), this.playerNames());
    let added = false;
    this.events.update((events) => {
      if (events.some((item) => item.id === named.id)) {
        return events.map((item) =>
          item.id === named.id ? withEventNames({ ...item, ...named }, this.teamNames(), this.playerNames()) : item,
        );
      }
      added = true;
      return [...events, named];
    });
    if (added) {
      this.bumpStats(named);
    }
  }

  private bumpStats(event: MatchEvent): void {
    const stats = this.stats();
    const match = this.match();
    if (!stats || !match || !event.teamId) {
      return;
    }

    const side = event.teamId === match.homeTeamId ? 'home' : event.teamId === match.awayTeamId ? 'away' : null;
    if (!side) {
      return;
    }

    const count = stats[side].events[event.type] ?? 0;
    this.stats.set({
      ...stats,
      [side]: {
        ...stats[side],
        events: { ...stats[side].events, [event.type]: count + 1 },
      },
    });
  }

  private rememberTeams(match: Match): void {
    this.teamNames.set({
      [match.homeTeamId]: match.homeTeam?.name || 'Home',
      [match.awayTeamId]: match.awayTeam?.name || 'Away',
    });
  }

  private loadRoster(match: Match): void {
    forkJoin([this.matchesApi.players(match.homeTeamId), this.matchesApi.players(match.awayTeamId)]).subscribe({
      next: ([home, away]) => {
        const names: Record<string, Player> = {};
        for (const player of [...home, ...away]) {
          names[player.id] = player;
        }
        this.playerNames.set(names);
        this.events.update((events) => events.map((event) => withEventNames(event, this.teamNames(), names)));
        const selected = this.eventForm.controls.teamId.value;
        this.players.set(selected === match.awayTeamId ? away : selected === match.homeTeamId ? home : this.players());
      },
    });
  }
}
