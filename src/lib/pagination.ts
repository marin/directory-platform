export function totalPages(itemCount: number, pageSize: number): number {
  if (itemCount <= 0) return 0;
  return Math.ceil(itemCount / pageSize);
}

export function pageSlice<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function pageNumbers(currentPage: number, lastPage: number): number[] {
  return Array.from({ length: lastPage }, (_, index) => index + 1);
}
