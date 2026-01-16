export interface PaginationMetadata {
  total: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMetadata;
}

export function getPaginationMetadata(
  total: number,
  page: number,
  pageSize: number
): PaginationMetadata {
  return {
    total,
    totalPages: Math.ceil(total / pageSize),
    currentPage: page,
    pageSize,
  };
}
