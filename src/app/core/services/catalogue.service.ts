import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom, map } from 'rxjs';
import {
  ApiItem,
  ApiList,
  DirectoryUser,
  GoverningBody,
  ImportReport,
  Organisation,
  Player,
  Sport,
  SportDraft,
  SquadMember,
  StaffGroups,
  StaffMember,
  Team,
} from '../models/catalogue.model';
import { ApiConfigService } from './api-config.service';

@Injectable({ providedIn: 'root' })
export class CatalogueService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfigService);

  total(path: string, query: Record<string, string | number | undefined> = {}): Observable<number> {
    return this.list<unknown>(path, { ...query, limit: 1, page: 1 }).pipe(map((response) => response.meta.total));
  }

  listSports(query: ListQuery): Observable<ApiList<Sport>> {
    return this.list<Sport>('/api/organizations/sports', query);
  }

  getSport(id: string): Observable<Sport> {
    return this.item<Sport>(`/api/organizations/sports/${id}`);
  }

  listedSport(id: string): Observable<Sport | null> {
    return this.listSports({ page: 1, limit: 100 }).pipe(
      map((response) => response.data.find((sport) => sport.id === id) ?? null),
    );
  }

  createSport(draft: SportDraft): Observable<HttpResponse<ApiItem<Sport>>> {
    return this.http.post<ApiItem<Sport>>(this.api.endpoint('/api/organizations/sports'), draft, {
      observe: 'response',
    });
  }

  updateSport(id: string, draft: SportDraft): Observable<Sport> {
    return this.http
      .patch<ApiItem<Sport>>(this.api.endpoint(`/api/organizations/sports/${id}`), draft)
      .pipe(map((response) => response.data));
  }

  deleteSport(id: string): Observable<void> {
    return this.http
      .delete(this.api.endpoint(`/api/organizations/sports/${id}`))
      .pipe(map(() => undefined));
  }

  async importSports(drafts: SportDraft[]): Promise<ImportReport> {
    const report: ImportReport = { added: 0, skipped: 0, failed: 0, failures: [] };

    for (const draft of drafts) {
      if (!draft.name) {
        report.failed += 1;
        report.failures.push('A row is missing a name.');
        continue;
      }

      try {
        const response = await firstValueFrom(this.createSport(draft));
        if (response.status === 201 || response.status === 200) {
          report.added += 1;
        } else {
          report.failed += 1;
          report.failures.push(`${draft.name} returned HTTP ${response.status}.`);
        }
      } catch (error: unknown) {
        if (error instanceof HttpErrorResponse && error.status === 409) {
          report.skipped += 1;
        } else {
          report.failed += 1;
          report.failures.push(draft.name);
        }
      }
    }

    return report;
  }

  listGoverningBodies(query: ListQuery): Observable<ApiList<GoverningBody>> {
    return this.list<GoverningBody>('/api/organizations/governing-bodies', query);
  }

  getGoverningBody(id: string): Observable<GoverningBody> {
    return this.item<GoverningBody>(`/api/organizations/governing-bodies/${id}`);
  }

  createGoverningBody(body: { name: string; sportId: string; country?: string }): Observable<GoverningBody> {
    return this.create('/api/organizations/governing-bodies', body);
  }

  listOrganisations(query: ListQuery): Observable<ApiList<Organisation>> {
    return this.list<Organisation>('/api/organizations/organizations', query);
  }

  getOrganisation(id: string): Observable<Organisation> {
    return this.item<Organisation>(`/api/organizations/organizations/${id}`);
  }

  createOrganisation(body: {
    name: string;
    governingBodyId: string;
    city?: string;
  }): Observable<Organisation> {
    return this.create('/api/organizations/organizations', body);
  }

  listTeams(organizationId: string): Observable<Team[]> {
    return this.list<Team>('/api/organizations/teams', { organizationId, limit: 100, page: 1 }).pipe(
      map((response) => response.data),
    );
  }

  createTeam(body: { name: string; organizationId: string }): Observable<Team> {
    return this.create('/api/organizations/teams', body);
  }

  listPlayers(query: ListQuery): Observable<ApiList<Player>> {
    return this.list<Player>('/api/organizations/players', query);
  }

  getPlayer(id: string): Observable<Player> {
    return this.item<Player>(`/api/organizations/players/${id}`);
  }

  createPlayer(body: {
    firstName: string;
    lastName: string;
    teamId: string;
    position?: string;
    jerseyNumber?: number;
  }): Observable<Player> {
    return this.create('/api/organizations/players', body);
  }

  listSquad(organisationId: string): Observable<SquadMember[]> {
    return this.http
      .get<ApiItem<SquadMember[]>>(this.api.endpoint(`/api/organizations/${organisationId}/squad`))
      .pipe(map((response) => response.data ?? []));
  }

  addSquadMember(
    organisationId: string,
    body: { userId: string; position?: string; agreementEnd?: string },
  ): Observable<unknown> {
    return this.http.post(this.api.endpoint(`/api/organizations/${organisationId}/squad`), body);
  }

  updateSquadMember(
    squadMemberId: string,
    body: { position?: string; agreementEnd?: string },
  ): Observable<unknown> {
    return this.http.patch(this.api.endpoint(`/api/squad/${squadMemberId}`), body);
  }

  removeSquadMember(squadMemberId: string): Observable<void> {
    return this.http.delete(this.api.endpoint(`/api/squad/${squadMemberId}`)).pipe(map(() => undefined));
  }

  listStaff(organisationId: string): Observable<StaffGroups> {
    return this.http
      .get<ApiItem<StaffGroups>>(this.api.endpoint(`/api/organizations/${organisationId}/staff`))
      .pipe(map((response) => response.data));
  }

  addStaff(
    organisationId: string,
    body: {
      name: string;
      roleTitle: string;
      category: StaffMember['category'];
      nationality?: string;
      photoUrl?: string;
    },
  ): Observable<unknown> {
    return this.http.post(this.api.endpoint(`/api/organizations/${organisationId}/staff`), body);
  }

  updateStaff(staffId: string, body: Partial<Omit<StaffMember, 'id'>>): Observable<unknown> {
    return this.http.patch(this.api.endpoint(`/api/staff/${staffId}`), body);
  }

  removeStaff(staffId: string): Observable<void> {
    return this.http.delete(this.api.endpoint(`/api/staff/${staffId}`)).pipe(map(() => undefined));
  }

  listUsers(): Observable<DirectoryUser[]> {
    return this.list<DirectoryUser>('/api/users', { limit: 100, page: 1 }).pipe(map((response) => response.data));
  }

  private list<T>(path: string, query: ListQuery): Observable<ApiList<T>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    }

    return this.http.get<ApiList<T>>(this.api.endpoint(path), { params });
  }

  private item<T>(path: string): Observable<T> {
    return this.http.get<ApiItem<T>>(this.api.endpoint(path)).pipe(map((response) => response.data));
  }

  private create<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<ApiItem<T>>(this.api.endpoint(path), body).pipe(map((response) => response.data));
  }
}

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  sportId?: string;
  governingBodyId?: string;
  organizationId?: string;
  [key: string]: string | number | undefined;
}
