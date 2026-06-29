import { TestBed } from '@angular/core/testing';
import { LogoComponent } from './logo.component';

describe('LogoComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LogoComponent] }).compileComponents();
  });

  it('renders the two-tone wordmark by default', async () => {
    const fixture = TestBed.createComponent(LogoComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('svg')).toBeTruthy();          // icon present
    expect(el.textContent).toContain('RO');
    expect(el.textContent).toContain('Cloud');
  });

  it('icon-only variant drops the wordmark text', async () => {
    const fixture = TestBed.createComponent(LogoComponent);
    fixture.componentRef.setInput('variant', 'icon-only');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('svg')).toBeTruthy();
    expect(el.textContent?.trim()).toBe('');
  });

  it('wordmark-only variant drops the svg icon', async () => {
    const fixture = TestBed.createComponent(LogoComponent);
    fixture.componentRef.setInput('variant', 'wordmark-only');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('svg')).toBeNull();
    expect(el.textContent).toContain('Cloud');
  });

  it('maps size to icon px (sm=20, lg=44)', () => {
    const fixture = TestBed.createComponent(LogoComponent);
    fixture.componentRef.setInput('size', 'sm');
    expect(fixture.componentInstance.px()).toBe(20);
    fixture.componentRef.setInput('size', 'lg');
    expect(fixture.componentInstance.px()).toBe(44);
  });
});
