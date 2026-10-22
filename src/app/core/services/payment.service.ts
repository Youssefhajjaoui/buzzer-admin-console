import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiItem, ApiList } from '../models/catalogue.model';
import { PaymentStatus, PaymentSummary, Transaction } from '../models/payment.model';
import { ApiConfigService } from './api-config.service';

export interface TransactionQuery {
  page: number;
  limit: number;
  search?: string;
  status?: PaymentStatus;
  currency?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfigService);

  summary(): Observable<PaymentSummary> {
    return this.http
      .get<ApiItem<PaymentSummary>>(this.api.endpoint('/api/payments/summary'))
      .pipe(map((response) => response.data));
  }

  list(query: TransactionQuery): Observable<ApiList<Transaction>> {
    let params = new HttpParams()
      .set('page', String(query.page))
      .set('limit', String(query.limit))
      .set('sortBy', query.sortBy)
      .set('sortOrder', query.sortOrder);

    if (query.search) {
      params = params.set('search', query.search);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.currency) {
      params = params.set('currency', query.currency);
    }

    return this.http.get<ApiList<Transaction>>(this.api.endpoint('/api/payments/transactions'), { params });
  }

  get(id: string): Observable<Transaction> {
    return this.http
      .get<ApiItem<Transaction>>(this.api.endpoint(`/api/payments/transactions/${id}`))
      .pipe(map((response) => response.data));
  }

  updateStatus(id: string, status: PaymentStatus): Observable<Transaction> {
    return this.http
      .patch<ApiItem<Transaction>>(this.api.endpoint(`/api/payments/transactions/${id}/status`), { status })
      .pipe(map((response) => response.data));
  }
}
