import { Directive, Input, OnInit, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { PermissionService, PlanType } from '../../core/services/permission.service';

/** *appCan="'Customers.Create'" — renders only when the user holds the permission. */
@Directive({ selector: '[appCan]', standalone: true })
export class CanDirective implements OnInit {
  @Input('appCan') permission!: string;
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private perm = inject(PermissionService);

  ngOnInit(): void {
    if (this.perm.can(this.permission)) this.vcr.createEmbeddedView(this.tpl);
  }
}

/** *appCanAny="['Orders.Edit','Orders.Create']" — renders when ANY permission matches. */
@Directive({ selector: '[appCanAny]', standalone: true })
export class CanAnyDirective implements OnInit {
  @Input('appCanAny') permissions: string[] = [];
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private perm = inject(PermissionService);

  ngOnInit(): void {
    if (this.perm.canAny(...this.permissions)) this.vcr.createEmbeddedView(this.tpl);
  }
}

/** *appCanPlan="'Pro'" — renders only when the tenant's plan is at least the given tier. */
@Directive({ selector: '[appCanPlan]', standalone: true })
export class CanPlanDirective implements OnInit {
  @Input('appCanPlan') plan!: PlanType;
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private perm = inject(PermissionService);

  ngOnInit(): void {
    if (this.perm.hasPlan(this.plan)) this.vcr.createEmbeddedView(this.tpl);
  }
}
