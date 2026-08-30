export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface RepositoryPaginatedResult<T> {
  data: T[];
  total: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
