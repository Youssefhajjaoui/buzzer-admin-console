import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { MatchStatus } from '../models/match.model';
import { ApiConfigService } from './api-config.service';
import { AuthService } from './auth.service';

export interface LiveEventPayload {
  id: string;
  matchId: string;
  type: string;
  minute: number;
  teamId: string | null;
  playerId: string | null;
  detail: string | null;
}

export interface LiveScoreboardPayload {
  matchId: string;
  status: MatchStatus;
  home: { team: string; score: number };
  away: { team: string; score: number };
  startedAt?: string | null;
}

export interface LiveStatusPayload {
  id: string;
  status: MatchStatus;
}

@Injectable({ providedIn: 'root' })
export class MatchLiveService {
  private readonly api = inject(ApiConfigService);
  private readonly auth = inject(AuthService);

  readonly events$ = new Subject<LiveEventPayload>();
  readonly scoreboards$ = new Subject<LiveScoreboardPayload>();
  readonly statuses$ = new Subject<LiveStatusPayload>();
  readonly connectionError$ = new Subject<string>();

  private socket: Socket | null = null;
  private matchId: string | null = null;

  join(matchId: string): void {
    if (this.matchId === matchId && this.socket) {
      return;
    }

    this.leave();
    const token = this.auth.accessToken();
    if (!token) {
      this.connectionError$.next('Live updates could not connect.');
      return;
    }

    this.matchId = matchId;
    const socket = io(this.api.baseUrl, {
      auth: { token },
      transports: ['websocket'],
    });
    this.socket = socket;

    socket.on('connect', () => {
      if (this.matchId) {
        socket.emit('match:join', this.matchId);
      }
    });
    socket.on('connect_error', () => {
      this.connectionError$.next('Live updates could not connect.');
    });
    socket.on('match:event', (payload: LiveEventPayload) => this.events$.next(payload));
    socket.on('match:scoreboard', (payload: LiveScoreboardPayload) => this.scoreboards$.next(payload));
    socket.on('match:status', (payload: LiveStatusPayload) => this.statuses$.next(payload));
  }

  leave(): void {
    if (this.socket && this.matchId) {
      this.socket.emit('match:leave', this.matchId);
    }

    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.matchId = null;
  }
}
