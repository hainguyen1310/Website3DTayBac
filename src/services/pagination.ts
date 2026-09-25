/** Supabase caps each response. Continue until the complete requested window is read. */
export async function readPages<T>(
  page: (
    start: number,
    end: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  limit = Infinity,
): Promise<T[]> {
  const result: T[] = [];
  for (let start = 0; start < limit; start += 500) {
    const size = Math.min(500, limit - start);
    const { data, error } = await page(start, start + size - 1);
    if (error) throw new Error(error.message);
    result.push(...(data ?? []));
    if ((data?.length ?? 0) < size) break;
  }
  return result;
}
