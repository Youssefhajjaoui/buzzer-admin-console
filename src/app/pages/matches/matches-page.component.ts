import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { Sport, Team } from '../../core/models/catalogue.model';
import {
  MATCH_STATUSES,
  Match,
  MatchStatus,
  canManageMatches,
  statusLabel,
  teamsAreDifferent,
} from '../../core/models/match.model';
import { AuthService, apiErrorMessage } from '../../core/services/auth.service';
import { MatchService } from '../../core/services/match.service';

@Component({
  selector: 'app-matches-page',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './matches-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchesPage {
  private readonly matchesApi = inject(MatchService);
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges = new Subject<string>();
  private readonly venueSearch = viewChild<ElementRef<HTMLInputElement>>('venueSearch');

  readonly matches = signal<Match[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly status = signal<MatchStatus | 'ALL'>('ALL');
  readonly searchText = signal('');
  readonly sortOrder = signal<'asc' | 'desc'>('desc');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly sports = signal<Sport[]>([]);
  readonly teams = signal<Team[]>([]);
  readonly editing = signal<Match | null>(null);
  readonly deleting = signal<Match | null>(null);
  readonly limit = 8;
  readonly tabs: Array<MatchStatus | 'ALL'> = ['ALL', ...MATCH_STATUSES];

  readonly scheduleForm = this.formBuilder.nonNullable.group({
    sportId: ['', Validators.required],
    homeTeamId: ['', Validators.required],
    awayTeamId: ['', Validators.required],
    scheduledAt: ['', Validators.required],
    venue: [''],
  });

  readonly editForm = this.formBuilder.nonNullable.group({
    scheduledAt: ['', Validators.required],
    venue: [''],
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.readQuery(params);
      this.load();
    });

    this.searchChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.navigate({ search: value, page: '1' }));
  }

  get canManage(): boolean {
    return canManageMatches(this.auth.user()?.role);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.limit));
  }

  label(status: MatchStatus): string {
    return statusLabel(status);
  }

  tabLabel(tab: MatchStatus | 'ALL'): string {
    return tab === 'ALL' ? 'All' : statusLabel(tab);
  }

  listQuery(): Record<string, string> {
    const query: Record<string, string> = {
      page: String(this.page()),
      sortBy: 'scheduledAt',
      sortOrder: this.sortOrder(),
    };
    if (this.status() !== 'ALL') {
      query['status'] = this.status();
    }
    if (this.searchText()) {
      query['search'] = this.searchText();
    }
    return query;
  }

  onSearch(event: Event): void {
    this.searchChanges.next((event.target as HTMLInputElement).value.trim());
  }

  selectStatus(status: MatchStatus | 'ALL'): void {
    this.navigate({ status: status === 'ALL' ? null : status, page: '1' });
  }

  changePage(next: number): void {
    this.navigate({ page: String(next) });
  }

  toggleSort(): void {
    this.navigate({ sortOrder: this.sortOrder() === 'asc' ? 'desc' : 'asc', page: '1' });
  }

  openCreate(dialog: HTMLDialogElement): void {
    this.formError.set(null);
    this.editing.set(null);
    this.teams.set([]);
    this.scheduleForm.reset({ sportId: '', homeTeamId: '', awayTeamId: '', scheduledAt: '', venue: '' });
    this.matchesApi.sports().subscribe({
      next: (sports) => this.sports.set(sports),
      error: (error: unknown) => this.formError.set(apiErrorMessage(error, 'Sports could not be loaded.')),
    });
    dialog.showModal();
  }

  onSportChange(): void {
    const sportId = this.scheduleForm.controls.sportId.value;
    this.scheduleForm.patchValue({ homeTeamId: '', awayTeamId: '' });
    this.teams.set([]);
    if (!sportId) {
      return;
    }

    this.matchesApi.teams(sportId).subscribe({
      next: (teams) => this.teams.set(teams),
      error: (error: unknown) => this.formError.set(apiErrorMessage(error, 'Teams could not be loaded.')),
    });
  }

  openEdit(match: Match, dialog: HTMLDialogElement): void {
    this.formError.set(null);
    this.editing.set(match);
    this.editForm.reset({
      scheduledAt: toLocalInput(match.scheduledAt),
      venue: match.venue ?? '',
    });
    dialog.showModal();
  }

  schedule(dialog: HTMLDialogElement): void {
    this.formError.set(null);
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }

    const value = this.scheduleForm.getRawValue();
    if (!teamsAreDifferent(value.homeTeamId, value.awayTeamId)) {
      this.scheduleForm.controls.awayTeamId.setErrors({ sameTeam: true });
      return;
    }

    this.matchesApi
      .create({
        sportId: value.sportId,
        homeTeamId: value.homeTeamId,
        awayTeamId: value.awayTeamId,
        scheduledAt: new Date(value.scheduledAt).toISOString(),
        ...(value.venue.trim() ? { venue: value.venue.trim() } : {}),
      })
      .subscribe({
        next: () => {
          dialog.close();
          this.navigate({ status: 'SCHEDULED', page: '1', search: '' });
          this.load();
        },
        error: (error: unknown) => this.formError.set(apiErrorMessage(error, 'The match could not be scheduled.')),
      });
  }

  saveEdit(dialog: HTMLDialogElement): void {
    const match = this.editing();
    if (!match) {
      return;
    }
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const value = this.editForm.getRawValue();
    this.matchesApi
      .update(match.id, {
        scheduledAt: new Date(value.scheduledAt).toISOString(),
        venue: value.venue.trim() || null,
      })
      .subscribe({
        next: () => {
          dialog.close();
          this.load();
        },
        error: (error: unknown) => this.formError.set(apiErrorMessage(error, 'The match could not be updated.')),
      });
  }

  confirmDelete(dialog: HTMLDialogElement): void {
    const match = this.deleting();
    if (!match) {
      return;
    }

    this.matchesApi.delete(match.id).subscribe({
      next: () => {
        dialog.close();
        this.deleting.set(null);
        this.load();
      },
      error: (error: unknown) => {
        dialog.close();
        this.error.set(apiErrorMessage(error, 'The match could not be deleted.'));
      },
    });
  }

  private readQuery(params: ParamMap): void {
    const status = params.get('status');
    this.status.set(MATCH_STATUSES.includes(status as MatchStatus) ? (status as MatchStatus) : 'ALL');
    this.page.set(Math.max(1, Number(params.get('page') ?? '1') || 1));
    this.searchText.set(params.get('search') ?? '');
    this.sortOrder.set(params.get('sortOrder') === 'asc' ? 'asc' : 'desc');
    queueMicrotask(() => {
      const input = this.venueSearch()?.nativeElement;
      if (input && document.activeElement !== input) {
        input.value = this.searchText();
      }
    });
  }

  private navigate(patch: {
    status?: MatchStatus | null;
    page?: string;
    search?: string;
    sortOrder?: 'asc' | 'desc';
  }): void {
    const status = patch.status === undefined ? (this.status() === 'ALL' ? null : this.status()) : patch.status;
    const search = patch.search === undefined ? this.searchText() : patch.search;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status,
        page: patch.page ?? String(this.page()),
        search: search || null,
        sortBy: 'scheduledAt',
        sortOrder: patch.sortOrder ?? this.sortOrder(),
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    const status = this.status();
    this.matchesApi
      .list({
        page: this.page(),
        limit: this.limit,
        search: this.searchText() || undefined,
        status: status === 'ALL' ? undefined : status,
        sortBy: 'scheduledAt',
        sortOrder: this.sortOrder(),
      })
      .subscribe({
        next: (response) => {
          this.matches.set(response.data);
          this.total.set(response.meta.total);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Matches could not be loaded.'));
        },
      });
  }
}

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
