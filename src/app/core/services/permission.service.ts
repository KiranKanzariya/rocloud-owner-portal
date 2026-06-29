import { Injectable, computed, signal } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

export type PlanType = 'Basic' | 'Pro' | 'Enterprise';

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  tenant_id: string;
  tenant_sub: string;
  tenant_name: string;
  role_id: string;
  role_name: string;
  plan_type: PlanType;
  permissions: string;
  exp: number;
}

/**
 * Reactive, signal-based permission state derived from the JWT (guide §6). The token is the
 * single source of truth — permissions/plan are read from its claims, never fetched separately.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private _perms = signal<Set<string>>(new Set());
  private _plan = signal<PlanType>('Basic');
  private _userId = signal<string>('');
  private _tenantId = signal<string>('');
  private _name = signal<string>('');
  private _businessName = signal<string>('');
  private _roleName = signal<string>('');

  readonly plan = computed(() => this._plan());
  readonly name = computed(() => this._name());
  readonly tenantId = computed(() => this._tenantId());
  /** The tenant's business name (from the JWT) — shown in the sidebar. */
  readonly businessName = computed(() => this._businessName());
  /** The current user's role name (from the JWT). */
  readonly roleName = computed(() => this._roleName());
  /** True only for the tenant's Owner role — used to gate owner-only areas (e.g. Activity log). */
  readonly isOwner = computed(() => this._roleName() === 'Owner');

  private readonly PLAN_ORDER: Record<PlanType, number> = {
    Basic: 1,
    Pro: 2,
    Enterprise: 3,
  };

  loadFromToken(token: string): void {
    const p = jwtDecode<JwtPayload>(token);
    this._perms.set(new Set(p.permissions?.split(',').filter(Boolean) ?? []));
    this._plan.set(p.plan_type as PlanType);
    this._userId.set(p.sub);
    this._tenantId.set(p.tenant_id);
    this._name.set(p.name);
    this._businessName.set(p.tenant_name ?? '');
    this._roleName.set(p.role_name ?? '');
  }

  clear(): void {
    this._perms.set(new Set());
    this._plan.set('Basic');
    this._userId.set('');
    this._tenantId.set('');
    this._name.set('');
    this._businessName.set('');
    this._roleName.set('');
  }

  can(permission: string): boolean {
    return this._perms().has(permission);
  }

  canAny(...permissions: string[]): boolean {
    return permissions.some((p) => this.can(p));
  }

  hasPlan(required: PlanType): boolean {
    return this.PLAN_ORDER[this._plan()] >= this.PLAN_ORDER[required];
  }
}
