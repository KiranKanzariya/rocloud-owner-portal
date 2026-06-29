import { TestBed } from '@angular/core/testing';
import { DataTableComponent, SortState } from './data-table.component';

describe('DataTableComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DataTableComponent] }).compileComponents();
  });

  it('emits sortChange (toggling asc→desc) when a sortable header is clicked', async () => {
    const fixture = TestBed.createComponent(DataTableComponent);
    fixture.componentRef.setInput('columns', [
      { key: 'name', header: 'Name', sortable: true },
      { key: 'area', header: 'Area' },
    ]);
    fixture.componentRef.setInput('rows', [{ name: 'A', area: 'X' }]);

    const sorts: SortState[] = [];
    fixture.componentInstance.sortChange.subscribe((s) => sorts.push(s));
    await fixture.whenStable();

    const headers = (fixture.nativeElement as HTMLElement).querySelectorAll('th');
    (headers[0] as HTMLElement).click(); // sortable → emits asc
    (headers[1] as HTMLElement).click(); // not sortable → no emit

    expect(sorts).toEqual([{ sortBy: 'name', sortDir: 'asc' }]);
  });

  it('emits pageChange via the next button', async () => {
    const fixture = TestBed.createComponent(DataTableComponent);
    fixture.componentRef.setInput('columns', [{ key: 'name', header: 'Name' }]);
    fixture.componentRef.setInput('rows', [{ name: 'A' }]);
    fixture.componentRef.setInput('totalCount', 50);
    fixture.componentRef.setInput('pageSize', 25);
    fixture.componentRef.setInput('page', 1);

    let nextPage: number | undefined;
    fixture.componentInstance.pageChange.subscribe((p) => (nextPage = p));
    await fixture.whenStable();

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    (buttons[buttons.length - 1] as HTMLElement).click(); // next
    expect(nextPage).toBe(2);
  });
});
