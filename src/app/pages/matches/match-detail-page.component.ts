import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, forkJoin, merge, switchMap } from 'rxjs';
import {
  Match,
  MatchEvent,
  MatchStats,
  MatchStatus,
  Scoreboard,
  StatusAction,
  canManageMatches,
  eventLabel,
  playerName,
  statusActions,
  statusLabel,
} from '../../core/models/match.model';
import { AuthService, apiErrorMessage } from '../../core/services/auth.service';
import { MatchService } from '../../core/services/match.service';

@Component({
  selector: 'app-match-detail-page',
  imports: [RouterLink, DatePipe],
  templateUrl: './match-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchDetailPage {
  private readonly matchesApi = inject(MatchService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly match = signal<Match | null>(null);
  readonly events = signal<MatchEvent[]>([]);
  readonly stats = signal<MatchStats | null>(null);
  readonly scoreboard = signal<Scoreboard | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);
  readonly pending = signal<StatusAction | null>(null);
  readonly returnQuery = signal<Record<string, string>>({});
  private readonly refresh = new Subject<void>();

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
      });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const query: Record<string, string> = {};
      for (const key of ['status', 'page', 'search', 'sortBy', 'sortOrder']) {
        const value = params.get(key);
        if (value) {
          query[key] = value;
        }
      }
      this.returnQuery.set(query);
    });
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

  counts(events: Record<string, number>): Array<{ type: string; count: number }> {
    return Object.entries(events).map(([type, count]) => ({ type: eventLabel(type), count }));
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
}
