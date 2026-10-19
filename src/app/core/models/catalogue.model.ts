export interface ApiFailure {
  success: false;
  error?: {
    message?: string;
    details?: Record<string, string[]>;
  };
}

export interface ApiItem<T> {
  success: boolean;
  data: T;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiList<T> {
  success: boolean;
  data: T[];
  meta: PageMeta;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface Sport {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  createdAt: string;
  updatedAt: string;
  governingBodyCount?: number;
  organizationCount?: number;
  participantCount?: number;
}

export interface SportDraft {
  name: string;
  description?: string;
  iconUrl?: string;
}

export interface GoverningBody {
  id: string;
  name: string;
  country: string | null;
  sportId: string;
  createdAt: string;
  updatedAt: string;
  logoUrl?: string | null;
  sport?: { id: string; name: string };
}

export interface Organisation {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  crestUrl: string | null;
  governingBodyId: string;
  createdAt: string;
  updatedAt: string;
  governingBody?: GoverningBody;
}

export interface Team {
  id: string;
  name: string;
  shortName: string | null;
  organizationId: string;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
  position: string | null;
  teamId: string;
  createdAt: string;
  updatedAt: string;
  team?: Team & { organization?: Organisation };
}

export interface SquadMember {
  id: string;
  userId?: string;
  position?: string | null;
  agreementEnd?: string | null;
  name?: string | null;
  displayName?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  age?: number | null;
  user?: {
    id?: string;
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  athlete?: {
    photoUrl?: string | null;
    age?: number | null;
    displayName?: string | null;
  };
}

export type StaffCategory =
  | 'club_president'
  | 'executive_management'
  | 'operations_administration';

export interface StaffMember {
  id: string;
  name: string;
  roleTitle: string;
  category: StaffCategory;
  nationality: string | null;
  photoUrl: string | null;
}

export interface StaffGroups {
  data: StaffMember[];
  groups: { category: StaffCategory; members: StaffMember[] }[];
}

export interface DirectoryUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface ImportReport {
  added: number;
  skipped: number;
  failed: number;
  failures: string[];
}

export const STAFF_CATEGORIES: { value: StaffCategory; label: string }[] = [
  { value: 'club_president', label: 'Club president' },
  { value: 'executive_management', label: 'Executive management' },
  { value: 'operations_administration', label: 'Operations and administration' },
];

export function canWriteCatalogue(role: string | null | undefined): boolean {
  const value = role?.toUpperCase() ?? '';
  return value === 'ADMIN' || value === 'ORG' || value.includes('ORGANIS');
}

export function squadName(member: SquadMember): string {
  const athleteName = member.athlete?.displayName?.trim();
  if (athleteName) {
    return athleteName;
  }

  const userName = [member.user?.firstName, member.user?.lastName].filter(Boolean).join(' ').trim();
  if (userName) {
    return userName;
  }

  return member.displayName?.trim() || member.name?.trim() || member.email || member.user?.email || 'Player';
}

export function squadPhoto(member: SquadMember): string | null {
  return member.athlete?.photoUrl ?? member.photoUrl ?? null;
}

export function squadAge(member: SquadMember): number | null {
  return member.athlete?.age ?? member.age ?? null;
}
