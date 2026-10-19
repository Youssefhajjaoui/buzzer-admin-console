import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { GoverningBody, Organisation, canWriteCatalogue } from '../../core/models/catalogue.model';
import { AuthService, apiErrorMessage } from '../../core/services/auth.service';
import { CatalogueService } from '../../core/services/catalogue.service';
import { ShellStateService } from '../../core/services/shell-state.service';

@Component({
  selector: 'app-governing-body-page',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './governing-body-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoverningBodyPage {
  private readonly catalogue = inject(CatalogueService);
  private readonly auth = inject(AuthService);
  private readonly shell = inject(ShellStateService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly params = inject(ActivatedRoute).snapshot.paramMap;
  readonly sportId = this.params.get('sportId') ?? '';
  readonly bodyId = this.params.get('bodyId') ?? '';

  readonly body = signal<GoverningBody | null>(null);
  readonly organisations = signal<Organisation[]>([]);
  readonly total = signal(0);
  readonly error = signal<string | null>(null);
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    city: [''],
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
      .createOrganisation({
        name: value.name.trim(),
        governingBodyId: this.bodyId,
        ...(value.city.trim() ? { city: value.city.trim() } : {}),
      })
      .subscribe({
        next: () => {
          dialog.close();
          this.form.reset({ name: '', city: '' });
          this.load();
        },
        error: (error: unknown) =>
          this.error.set(apiErrorMessage(error, 'The organisation could not be added.')),
      });
  }

  private load(): void {
    forkJoin({
      body: this.catalogue.getGoverningBody(this.bodyId),
      organisations: this.catalogue.listOrganisations({
        governingBodyId: this.bodyId,
        limit: 50,
        page: 1,
      }),
    }).subscribe({
      next: ({ body, organisations }) => {
        this.body.set(body);
        this.organisations.set(organisations.data);
        this.total.set(organisations.meta.total);
        this.shell.pageTitle.set(body.name);
      },
      error: (error: unknown) => this.error.set(apiErrorMessage(error, 'This governing body could not be loaded.')),
    });
  }
}
