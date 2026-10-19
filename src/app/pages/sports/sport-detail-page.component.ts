import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { GoverningBody, Sport, canWriteCatalogue } from '../../core/models/catalogue.model';
import { AuthService, apiErrorMessage } from '../../core/services/auth.service';
import { CatalogueService } from '../../core/services/catalogue.service';
import { ShellStateService } from '../../core/services/shell-state.service';

@Component({
  selector: 'app-sport-detail-page',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './sport-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SportDetailPage {
  private readonly catalogue = inject(CatalogueService);
  private readonly auth = inject(AuthService);
  private readonly shell = inject(ShellStateService);
  private readonly formBuilder = inject(FormBuilder);
  readonly sportId = inject(ActivatedRoute).snapshot.paramMap.get('sportId') ?? '';

  readonly sport = signal<Sport | null>(null);
  readonly bodies = signal<GoverningBody[]>([]);
  readonly error = signal<string | null>(null);
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    country: [''],
  });

  constructor() {
    this.load();
  }

  get canWrite(): boolean {
    return canWriteCatalogue(this.auth.user()?.role);
  }

  save(dialog: HTMLDialogElement): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.catalogue
      .createGoverningBody({
        name: value.name.trim(),
        sportId: this.sportId,
        ...(value.country.trim() ? { country: value.country.trim() } : {}),
      })
      .subscribe({
        next: () => {
          dialog.close();
          this.form.reset({ name: '', country: '' });
          this.load();
        },
        error: (error: unknown) => this.error.set(apiErrorMessage(error, 'The governing body could not be added.')),
      });
  }

  private load(): void {
    forkJoin({
      sport: this.catalogue.getSport(this.sportId),
      listed: this.catalogue.listedSport(this.sportId),
      bodies: this.catalogue.listGoverningBodies({ sportId: this.sportId, limit: 50, page: 1 }),
    }).subscribe({
      next: ({ sport, listed, bodies }) => {
        this.sport.set(listed ? { ...sport, ...listed } : sport);
        this.bodies.set(bodies.data);
        this.shell.pageTitle.set(sport.name);
        this.error.set(null);
      },
      error: (error: unknown) => this.error.set(apiErrorMessage(error, 'This sport could not be loaded.')),
    });
  }
}
