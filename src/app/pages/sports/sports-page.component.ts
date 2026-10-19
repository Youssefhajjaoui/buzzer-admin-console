import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, forkJoin, Subject } from 'rxjs';
import { parseSportsImport } from '../../common/utils/import-sports.util';
import { Sport, SportDraft, canWriteCatalogue } from '../../core/models/catalogue.model';
import { AuthService, apiErrorMessage } from '../../core/services/auth.service';
import { CatalogueService } from '../../core/services/catalogue.service';

@Component({
  selector: 'app-sports-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './sports-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SportsPage {
  private readonly catalogue = inject(CatalogueService);
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges = new Subject<string>();

  readonly sports = signal<Sport[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly counts = signal({ sports: 0, bodies: 0, organisations: 0, participants: 0 });
  readonly editing = signal<Sport | null>(null);
  readonly deleting = signal<Sport | null>(null);
  readonly importReport = signal<string | null>(null);
  readonly importing = signal(false);
  readonly limit = 8;

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    iconUrl: [''],
  });

  constructor() {
    this.searchChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        this.search = query;
        this.page.set(1);
        this.load();
      });
    this.load();
    this.loadCounts();
  }

  private search = '';

  get canWrite(): boolean {
    return canWriteCatalogue(this.auth.user()?.role);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.limit));
  }

  onSearch(event: Event): void {
    this.searchChanges.next((event.target as HTMLInputElement).value.trim());
  }

  changePage(next: number): void {
    this.page.set(next);
    this.load();
  }

  accent(index: number): string {
    return ['#ffb414', '#2ed368', '#ec193c', '#ffffff'][index % 4];
  }

  openCreate(dialog: HTMLDialogElement): void {
    this.editing.set(null);
    this.form.reset({ name: '', description: '', iconUrl: '' });
    dialog.showModal();
  }

  openEdit(sport: Sport, dialog: HTMLDialogElement): void {
    this.editing.set(sport);
    this.form.reset({
      name: sport.name,
      description: sport.description ?? '',
      iconUrl: sport.iconUrl ?? '',
    });
    dialog.showModal();
  }

  save(dialog: HTMLDialogElement): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const draft = this.draft();
    const current = this.editing();
    const saved = () => {
      dialog.close();
      this.load();
      this.loadCounts();
    };
    const failed = (error: unknown) => {
      this.error.set(apiErrorMessage(error, 'The sport could not be saved.'));
      dialog.close();
    };

    if (current) {
      this.catalogue.updateSport(current.id, draft).subscribe({ next: saved, error: failed });
      return;
    }

    this.catalogue.createSport(draft).subscribe({ next: saved, error: failed });
  }

  confirmDelete(dialog: HTMLDialogElement): void {
    const sport = this.deleting();
    if (!sport) {
      return;
    }

    this.catalogue.deleteSport(sport.id).subscribe({
      next: () => {
        this.deleting.set(null);
        dialog.close();
        this.load();
        this.loadCounts();
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error, 'The sport could not be deleted.'));
        dialog.close();
      },
    });
  }

  async onImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.importing.set(true);
    this.importReport.set(null);
    try {
      const drafts = parseSportsImport(file.name, await file.text());
      const report = await this.catalogue.importSports(drafts);
      this.importReport.set(
        `Added ${report.added}, skipped ${report.skipped}, failed ${report.failed}.`,
      );
      this.load();
      this.loadCounts();
    } catch {
      this.importReport.set('That file could not be read. Use CSV or JSON.');
    } finally {
      this.importing.set(false);
    }
  }

  private load(): void {
    this.loading.set(true);
    this.catalogue
      .listSports({
        search: this.search,
        page: this.page(),
        limit: this.limit,
        sortBy: 'name',
        sortOrder: 'asc',
      })
      .subscribe({
        next: (response) => {
          this.sports.set(response.data);
          this.total.set(response.meta.total);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'The sports catalogue could not be loaded.'));
        },
      });
  }

  private loadCounts(): void {
    forkJoin({
      sports: this.catalogue.total('/api/organizations/sports'),
      bodies: this.catalogue.total('/api/organizations/governing-bodies'),
      organisations: this.catalogue.total('/api/organizations/organizations'),
      participants: this.catalogue.total('/api/organizations/players'),
    }).subscribe({
      next: (counts) => this.counts.set(counts),
    });
  }

  private draft(): SportDraft {
    const value = this.form.getRawValue();
    const draft: SportDraft = { name: value.name.trim() };
    if (value.description.trim()) {
      draft.description = value.description.trim();
    }
    if (value.iconUrl.trim()) {
      draft.iconUrl = value.iconUrl.trim();
    }
    return draft;
  }
}
