import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { Organisation, Player, Sport } from '../../core/models/catalogue.model';
import { apiErrorMessage } from '../../core/services/auth.service';
import { CatalogueService } from '../../core/services/catalogue.service';
import { ShellStateService } from '../../core/services/shell-state.service';

@Component({
  selector: 'app-participant-page',
  imports: [RouterLink],
  templateUrl: './participant-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipantPage {
  private readonly catalogue = inject(CatalogueService);
  private readonly shell = inject(ShellStateService);
  private readonly params = inject(ActivatedRoute).snapshot.paramMap;
  readonly sportId = this.params.get('sportId') ?? '';
  readonly bodyId = this.params.get('bodyId') ?? '';
  readonly organisationId = this.params.get('organisationId') ?? '';

  readonly player = signal<Player | null>(null);
  readonly organisation = signal<Organisation | null>(null);
  readonly sport = signal<Sport | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    this.catalogue
      .getPlayer(this.params.get('playerId') ?? '')
      .pipe(
        switchMap((player) =>
          forkJoin({
            player: of(player),
            organisation: this.catalogue.getOrganisation(this.organisationId),
            sport: this.catalogue.getSport(this.sportId),
          }),
        ),
      )
      .subscribe({
        next: ({ player, organisation, sport }) => {
          this.player.set(player);
          this.organisation.set(organisation);
          this.sport.set(sport);
          this.shell.pageTitle.set(`${player.firstName} ${player.lastName}`);
        },
        error: (error: unknown) => this.error.set(apiErrorMessage(error, 'This participant could not be loaded.')),
      });
  }
}
