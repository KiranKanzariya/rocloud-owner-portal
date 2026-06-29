import { TestBed } from '@angular/core/testing';
import { BottleBadgeComponent } from './bottle-badge.component';

describe('BottleBadgeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BottleBadgeComponent] }).compileComponents();
  });

  it('renders 20L with the navy bottle-20l class', async () => {
    const fixture = TestBed.createComponent(BottleBadgeComponent);
    fixture.componentRef.setInput('size', '20L');
    await fixture.whenStable();
    const span = (fixture.nativeElement as HTMLElement).querySelector('span')!;
    expect(span.className).toBe('bottle-20l');
    expect(span.textContent).toBe('20L');
  });

  it('renders 18L with the teal bottle-18l class', async () => {
    const fixture = TestBed.createComponent(BottleBadgeComponent);
    fixture.componentRef.setInput('size', '18L');
    await fixture.whenStable();
    const span = (fixture.nativeElement as HTMLElement).querySelector('span')!;
    expect(span.className).toBe('bottle-18l');
  });

  it('renders other sizes in gray', async () => {
    const fixture = TestBed.createComponent(BottleBadgeComponent);
    fixture.componentRef.setInput('size', '1L');
    await fixture.whenStable();
    const span = (fixture.nativeElement as HTMLElement).querySelector('span')!;
    expect(span.className).toContain('text-ink-mid');
  });
});
