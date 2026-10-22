import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiItem, ApiList, Sport, Team } from '../models/catalogue.model';
import { Match, MatchEvent, MatchStats, MatchStatus, Scoreboard } from '../models/match.model';
import { ApiConfigService } from './api-config.service';

export interface MatchListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: MatchStatus;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class MatchService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfigService);

  list(query: MatchListQuery): Observable<ApiList<Match>> {
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

    return this.http.get<ApiList<Match>>(this.api.endpoint('/api/matches'), { params });
  }

  get(id: string): Observable<Match> {
    return this.item<Match>(`/api/matches/${id}`);
  }

  create(body: {
    sportId: string;
    homeTeamId: string;
    awayTeamId: string;
    scheduledAt: string;
    venue?: string;
  }): Observable<Match> {
    return this.http
      .post<ApiItem<Match>>(this.api.endpoint('/api/matches'), body)
      .pipe(map((response) => response.data));
  }

  update(id: string, body: { scheduledAt: string; venue: string | null }): Observable<Match> {
    return this.http
      .patch<ApiItem<Match>>(this.api.endpoint(`/api/matches/${id}`), body)
      .pipe(map((response) => response.data));
  }

  updateStatus(id: string, status: MatchStatus): Observable<Match> {
    return this.http
      .patch<ApiItem<Match>>(this.api.endpoint(`/api/matches/${id}/status`), { status })
      .pipe(map((response) => response.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete(this.api.endpoint(`/api/matches/${id}`)).pipe(map(() => undefined));
  }

  timeline(id: string): Observable<MatchEvent[]> {
    return this.item<MatchEvent[]>(`/api/matches/${id}/timeline`);
  }

  stats(id: string): Observable<MatchStats> {
    return this.item<MatchStats>(`/api/matches/${id}/stats`);
  }

  scoreboard(id: string): Observable<Scoreboard> {
    return this.item<Scoreboard>(`/api/matches/${id}/scoreboard`);
  }

  sports(): Observable<Sport[]> {
    return this.http
      .get<ApiList<Sport>>(this.api.endpoint('/api/organizations/sports'), {
        params: new HttpParams().set('limit', '100').set('sortBy', 'name').set('sortOrder', 'asc'),
      })
      .pipe(map((response) => response.data));
  }

  teams(sportId: string): Observable<Team[]> {
    return this.http
      .get<ApiList<Team>>(this.api.endpoint('/api/organizations/teams'), {
        params: new HttpParams().set('sportId', sportId).set('limit', '100'),
      })
      .pipe(map((response) => response.data));
  }

  private item<T>(path: string): Observable<T> {
    return this.http.get<ApiItem<T>>(this.api.endpoint(path)).pipe(map((response) => response.data));
  }
}
