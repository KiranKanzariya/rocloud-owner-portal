import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { PermissionService } from '../../../core/services/permission.service';

function makeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(payload)}.`;
}

describe('SidebarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('shows only nav items the user has permission for', async () => {
    // Basic plan, only Customers + Orders view.
    TestBed.inject(PermissionService).loadFromToken(
      makeJwt({ permissions: 'Customers.View,Orders.View', plan_type: 'Basic', name: 'Ravi' }),
    );

    const fixture = TestBed.createComponent(SidebarComponent);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Customers');
    expect(text).toContain('Orders');
    expect(text).toContain('Dashboard'); // no permission required
    expect(text).not.toContain('Inventory'); // Inventory.View missing
    expect(text).not.toContain('Reports'); // needs Reports.View + Pro plan
    expect(text).not.toContain('Roles'); // needs Roles.Manage
  });

  it('hides a whole section when no items are visible', () => {
    TestBed.inject(PermissionService).loadFromToken(makeJwt({ permissions: '', plan_type: 'Basic' }));
    const fixture = TestBed.createComponent(SidebarComponent);
    const finance = fixture.componentInstance['sections'].find((s) => s.heading === 'Finance')!;
    expect(fixture.componentInstance.hasVisible(finance)).toBe(false);
  });
});
