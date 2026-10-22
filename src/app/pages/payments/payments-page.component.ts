import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import {
  PAYMENT_CURRENCIES,
  PAYMENT_STATUSES,
  PaymentStatus,
  PaymentSummary,
  Transaction,
  canManagePayments,
  paymentStatusLabel,
  summaryFor,
} from '../../core/models/payment.model';
import { AuthService, apiErrorMessage } from '../../core/services/auth.service';
import { PaymentService } from '../../core/services/payment.service';

@Component({
  selector: 'app-payments-page',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './payments-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentsPage {
  private readonly payments = inject(PaymentService);
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges = new Subject<string>();
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('paymentSearch');
  private readonly currencySelect = viewChild<ElementRef<HTMLSelectElement>>('currencySelect');

  readonly summary = signal<PaymentSummary | null>(null);
  readonly transactions = signal<Transaction[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly status = signal<PaymentStatus | 'ALL'>('ALL');
  readonly currency = signal<string>('ALL');
  readonly searchText = signal('');
  readonly sortOrder = signal<'asc' | 'desc'>('desc');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly selected = signal<Transaction | null>(null);
  readonly limit = 8;
  readonly tabs: Array<PaymentStatus | 'ALL'> = ['ALL', ...PAYMENT_STATUSES];
  readonly currencies = PAYMENT_CURRENCIES;
  readonly statuses = PAYMENT_STATUSES;

  readonly statusForm = this.formBuilder.nonNullable.group({
    status: ['PENDING' as PaymentStatus, Validators.required],
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
    return canManagePayments(this.auth.user()?.role);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.limit));
  }

  label(status: PaymentStatus): string {
    return paymentStatusLabel(status);
  }

  tabLabel(tab: PaymentStatus | 'ALL'): string {
    return tab === 'ALL' ? 'All' : paymentStatusLabel(tab);
  }

  card(status: PaymentStatus): { count: number; total: string } {
    const row = summaryFor(this.summary(), status);
    return { count: row?.count ?? 0, total: row?.total ?? '—' };
  }

  onSearch(event: Event): void {
    this.searchChanges.next((event.target as HTMLInputElement).value.trim());
  }

  selectStatus(status: PaymentStatus | 'ALL'): void {
    this.navigate({ status: status === 'ALL' ? null : status, page: '1' });
  }

  selectCurrency(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.navigate({ currency: value === 'ALL' ? null : value, page: '1' });
  }

  changePage(next: number): void {
    this.navigate({ page: String(next) });
  }

  toggleSort(): void {
    this.navigate({ sortOrder: this.sortOrder() === 'asc' ? 'desc' : 'asc', page: '1' });
  }

  openDetail(transaction: Transaction, dialog: HTMLDialogElement): void {
    this.selected.set(transaction);
    this.formError.set(null);
    dialog.showModal();
    this.payments.get(transaction.id).subscribe({
      next: (detail) => this.selected.set(detail),
      error: (error: unknown) => this.formError.set(apiErrorMessage(error, 'The transaction could not be loaded.')),
    });
  }

  openStatus(transaction: Transaction, dialog: HTMLDialogElement): void {
    this.selected.set(transaction);
    this.formError.set(null);
    this.statusForm.reset({ status: transaction.status });
    dialog.showModal();
  }

  saveStatus(dialog: HTMLDialogElement): void {
    const transaction = this.selected();
    if (!transaction) {
      return;
    }

    const status = this.statusForm.controls.status.value;
    if (status === transaction.status) {
      this.formError.set('Choose a different status.');
      return;
    }

    this.payments.updateStatus(transaction.id, status).subscribe({
      next: () => {
        dialog.close();
        this.load();
      },
      error: (error: unknown) => this.formError.set(apiErrorMessage(error, 'The status could not be changed.')),
    });
  }

  private readQuery(params: ParamMap): void {
    const status = params.get('status');
    const currency = params.get('currency');
    this.status.set(PAYMENT_STATUSES.includes(status as PaymentStatus) ? (status as PaymentStatus) : 'ALL');
    this.currency.set(currency || 'ALL');
    this.page.set(Math.max(1, Number(params.get('page') ?? '1') || 1));
    this.searchText.set(params.get('search') ?? '');
    this.sortOrder.set(params.get('sortOrder') === 'asc' ? 'asc' : 'desc');
    queueMicrotask(() => {
      const input = this.searchInput()?.nativeElement;
      if (input && document.activeElement !== input) {
        input.value = this.searchText();
      }
      const select = this.currencySelect()?.nativeElement;
      if (select) {
        select.value = this.currency();
      }
    });
  }

  private navigate(patch: {
    status?: PaymentStatus | null;
    currency?: string | null;
    page?: string;
    search?: string;
    sortOrder?: 'asc' | 'desc';
  }): void {
    const status = patch.status === undefined ? (this.status() === 'ALL' ? null : this.status()) : patch.status;
    const currency = patch.currency === undefined ? (this.currency() === 'ALL' ? null : this.currency()) : patch.currency;
    const search = patch.search === undefined ? this.searchText() : patch.search;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status,
        currency,
        page: patch.page ?? String(this.page()),
        search: search || null,
        sortBy: 'createdAt',
        sortOrder: patch.sortOrder ?? this.sortOrder(),
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    const status = this.status();
    const currency = this.currency();
    this.payments.summary().subscribe({
      next: (summary) => this.summary.set(summary),
      error: (error: unknown) => this.error.set(apiErrorMessage(error, 'The payment summary could not be loaded.')),
    });
    this.payments
      .list({
        page: this.page(),
        limit: this.limit,
        search: this.searchText() || undefined,
        status: status === 'ALL' ? undefined : status,
        currency: currency === 'ALL' ? undefined : currency,
        sortBy: 'createdAt',
        sortOrder: this.sortOrder(),
      })
      .subscribe({
        next: (response) => {
          this.transactions.set(response.data);
          this.total.set(response.meta.total);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Transactions could not be loaded.'));
        },
      });
  }
}
