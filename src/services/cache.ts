type Entry = {
  at: number;
  promise: Promise<unknown>;
};

const store = new Map<string, Entry>();

/**
 * Gộp các truy vấn trùng nhau trong cùng một khoảng thời gian ngắn.
 * Giúp giảm số lần gọi Supabase khi React StrictMode chạy effect hai lần
 * hoặc khi người dùng chuyển qua lại giữa các mục quản trị.
 */
export function cached<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = 30_000,
): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.promise as Promise<T>;

  const promise = loader().catch((error: unknown) => {
    store.delete(key);
    throw error;
  });
  store.set(key, { at: Date.now(), promise });
  return promise;
}

export function invalidateCache(prefix = "") {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of [...store.keys()]) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
