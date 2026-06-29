/** Standard success envelope returned by tenant endpoints (matches the API's ApiResponse<T>). */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: string | null;
  code?: string | null;
}

/** A page of results plus paging metadata (matches the API's PagedResult<T>). */
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
