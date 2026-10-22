export type RoleType = 'super_admin' | 'tenant_manager' | 'professional';

export interface CustomUserClaims {
  role: RoleType;
  tenant_id?: string;
  professional_id?: string;
  email?: string;
  name?: string;
  issuedAt?: number;
  assignedAt?: number;
}

export interface AuthSessionState {
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified: boolean;
  } | null;
  claims: CustomUserClaims | null;
  idToken: string | null;
  role: RoleType | null;
  tenantId: string | null;
  professionalId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type AppRouteScope = 'public' | 'super_admin' | 'tenant_manager' | 'professional';

export interface RoutePermissionConfig {
  path: string;
  scope: AppRouteScope;
  allowedRoles: RoleType[];
  requiresTenant?: boolean;
}
