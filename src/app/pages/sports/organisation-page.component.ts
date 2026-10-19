import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  DirectoryUser,
  Organisation,
  Player,
  Sport,
  STAFF_CATEGORIES,
  SquadMember,
  StaffCategory,
  StaffGroups,
  Team,
  canWriteCatalogue,
  squadAge,
  squadName,
  squadPhoto,
} from '../../core/models/catalogue.model';
import { AuthService, apiErrorMessage } from '../../core/services/auth.service';
import { CatalogueService } from '../../core/services/catalogue.service';
import { ShellStateService } from '../../core/services/shell-state.service';

@Component({
  selector: 'app-organisation-page',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './organisation-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganisationPage {
  private readonly catalogue = inject(CatalogueService);
  private readonly auth = inject(AuthService);
  private readonly shell = inject(ShellStateService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly params = inject(ActivatedRoute).snapshot.paramMap;
  readonly sportId = this.params.get('sportId') ?? '';
  readonly bodyId = this.params.get('bodyId') ?? '';
  readonly organisationId = this.params.get('organisationId') ?? '';
  readonly categories = STAFF_CATEGORIES;
  readonly squadName = squadName;
  readonly squadPhoto = squadPhoto;
  readonly squadAge = squadAge;

  readonly organisation = signal<Organisation | null>(null);
  readonly sport = signal<Sport | null>(null);
  readonly players = signal<Player[]>([]);
  readonly teams = signal<Team[]>([]);
  readonly squad = signal<SquadMember[]>([]);
  readonly staff = signal<StaffGroups | null>(null);
  readonly users = signal<DirectoryUser[]>([]);
  readonly error = signal<string | null>(null);
  readonly editingSquad = signal<SquadMember | null>(null);
  readonly editingStaffId = signal<string | null>(null);

  readonly playerForm = this.formBuilder.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    position: [''],
    jerseyNumber: [''],
    teamId: [''],
    teamName: [''],
  });

  readonly squadForm = this.formBuilder.nonNullable.group({
    userId: ['', Validators.required],
    position: [''],
    agreementEnd: [''],
  });

  readonly staffForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    roleTitle: ['', Validators.required],
    category: ['club_president' as StaffCategory, Validators.required],
    nationality: [''],
    photoUrl: [''],
  });

  constructor() {
    this.load();
  }

  get canWrite(): boolean {
    return canWriteCatalogue(this.auth.user()?.role);
  }

  categoryLabel(category: string): string {
    return this.categories.find((item) => item.value === category)?.label ?? category;
  }

  savePlayer(dialog: HTMLDialogElement): void {
    if (this.playerForm.invalid) {
      this.playerForm.markAllAsTouched();
      return;
    }

    const value = this.playerForm.getRawValue();
    const create = (teamId: string) => {
      this.catalogue
        .createPlayer({
          firstName: value.firstName.trim(),
          lastName: value.lastName.trim(),
          teamId,
          ...(value.position.trim() ? { position: value.position.trim() } : {}),
          ...(value.jerseyNumber ? { jerseyNumber: Number(value.jerseyNumber) } : {}),
        })
        .subscribe({
          next: () => {
            dialog.close();
            this.playerForm.reset({ firstName: '', lastName: '', position: '', jerseyNumber: '', teamId: '', teamName: '' });
            this.load();
          },
          error: (error: unknown) => this.error.set(apiErrorMessage(error, 'The participant could not be added.')),
        });
    };

    if (value.teamId) {
      create(value.teamId);
      return;
    }

    if (!value.teamName.trim()) {
      this.error.set('Choose a team or enter a new team name.');
      return;
    }

    this.catalogue.createTeam({ name: value.teamName.trim(), organizationId: this.organisationId }).subscribe({
      next: (team) => create(team.id),
      error: (error: unknown) => this.error.set(apiErrorMessage(error, 'The team could not be created.')),
    });
  }

  saveSquad(dialog: HTMLDialogElement): void {
    if (this.squadForm.invalid) {
      this.squadForm.markAllAsTouched();
      return;
    }

    const value = this.squadForm.getRawValue();
    const body = {
      ...(value.position.trim() ? { position: value.position.trim() } : {}),
      ...(value.agreementEnd ? { agreementEnd: value.agreementEnd } : {}),
    };
    const current = this.editingSquad();
    const request = current
      ? this.catalogue.updateSquadMember(current.id, body)
      : this.catalogue.addSquadMember(this.organisationId, { userId: value.userId, ...body });

    request.subscribe({
      next: () => {
        dialog.close();
        this.editingSquad.set(null);
        this.load();
      },
      error: (error: unknown) => this.error.set(apiErrorMessage(error, 'The squad member could not be saved.')),
    });
  }

  removeSquad(member: SquadMember): void {
    this.catalogue.removeSquadMember(member.id).subscribe({
      next: () => this.squad.update((rows) => rows.filter((row) => row.id !== member.id)),
      error: (error: unknown) => this.error.set(apiErrorMessage(error, 'The squad member could not be removed.')),
    });
  }

  openStaff(member: { id: string; name: string; roleTitle: string; category: StaffCategory; nationality: string | null; photoUrl: string | null } | null, dialog: HTMLDialogElement): void {
    this.editingStaffId.set(member?.id ?? null);
    this.staffForm.reset({
      name: member?.name ?? '',
      roleTitle: member?.roleTitle ?? '',
      category: member?.category ?? 'club_president',
      nationality: member?.nationality ?? '',
      photoUrl: member?.photoUrl ?? '',
    });
    dialog.showModal();
  }

  saveStaff(dialog: HTMLDialogElement): void {
    if (this.staffForm.invalid) {
      this.staffForm.markAllAsTouched();
      return;
    }

    const value = this.staffForm.getRawValue();
    const body = {
      name: value.name.trim(),
      roleTitle: value.roleTitle.trim(),
      category: value.category,
      ...(value.nationality.trim() ? { nationality: value.nationality.trim() } : {}),
      ...(value.photoUrl.trim() ? { photoUrl: value.photoUrl.trim() } : {}),
    };
    const current = this.editingStaffId();
    const request = current
      ? this.catalogue.updateStaff(current, body)
      : this.catalogue.addStaff(this.organisationId, body);

    request.subscribe({
      next: () => {
        dialog.close();
        this.load();
      },
      error: (error: unknown) => this.error.set(apiErrorMessage(error, 'The staff member could not be saved.')),
    });
  }

  removeStaff(staffId: string): void {
    this.catalogue.removeStaff(staffId).subscribe({
      next: () => this.load(),
      error: (error: unknown) => this.error.set(apiErrorMessage(error, 'The staff member could not be removed.')),
    });
  }

  openSquad(member: SquadMember | null, dialog: HTMLDialogElement): void {
    this.editingSquad.set(member);
    this.squadForm.reset({
      userId: member?.userId ?? '',
      position: member?.position ?? '',
      agreementEnd: member?.agreementEnd?.slice(0, 10) ?? '',
    });
    dialog.showModal();
  }

  private load(): void {
    forkJoin({
      sport: this.catalogue.getSport(this.sportId),
      organisation: this.catalogue.getOrganisation(this.organisationId),
      players: this.catalogue.listPlayers({ organizationId: this.organisationId, limit: 50, page: 1 }),
      teams: this.catalogue.listTeams(this.organisationId),
      squad: this.catalogue.listSquad(this.organisationId),
      staff: this.catalogue.listStaff(this.organisationId),
    }).subscribe({
      next: ({ sport, organisation, players, teams, squad, staff }) => {
        this.sport.set(sport);
        this.organisation.set(organisation);
        this.players.set(players.data);
        this.teams.set(teams);
        this.squad.set(squad);
        this.staff.set(staff);
        this.shell.pageTitle.set(organisation.name);
        if (this.canWrite) {
          this.catalogue.listUsers().subscribe({
            next: (users) => this.users.set(users),
          });
        }
      },
      error: (error: unknown) => this.error.set(apiErrorMessage(error, 'This organisation could not be loaded.')),
    });
  }
}
