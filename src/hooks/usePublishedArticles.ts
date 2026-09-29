import { useCallback, useEffect, useMemo, useState } from "react";
import { getPublishedArticle, listPublishedArticles } from "../services/storeApi";
import type { PublishedArticle } from "../services/storeApi";
import { readBootstrap } from "../seo/bootstrap";

const PAGE_SIZE = 9;

function bootstrapArticles() {
  const payload = readBootstrap();
  if (!payload?.articles?.length) return null;
  return { items: payload.articles, total: payload.articleTotal ?? payload.articles.length };
}

/** Trang chủ: 3 bài mới nhất; dùng dữ liệu prerender nếu có. */
export function usePublishedArticleFeed(limit = 3) {
  const seeded = useMemo(bootstrapArticles, []);
  const [articles, setArticles] = useState<PublishedArticle[]>(seeded?.items.slice(0, limit) ?? []);
  const [loading, setLoading] = useState(!seeded);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(!seeded);
    setError(false);
    void listPublishedArticles({ offset: 0, limit })
      .then((page) => {
        if (!active) return;
        setArticles(page.items.slice(0, limit));
      })
      .catch(() => {
        if (active && !seeded) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt, limit, seeded]);

  return { articles, loading, error, reload };
}

export function usePublishedArticles() {
  return usePublishedArticleFeed(50).articles;
}

/** Mỗi URL chỉ hiển thị đúng một trang, giống HTML phía server. */
export function useArticlePagination(options: { topicSlug?: string; page?: number } = {}) {
  const pageNumber = options.page ?? 1;
  const requestKey = `${options.topicSlug ?? ""}:${pageNumber}`;
  const seeded = useMemo(() => {
    const payload = readBootstrap();
    if (payload?.route !== "news" || !payload.articles) return null;
    if ((options.topicSlug ?? "") !== (payload.topicSlug ?? "") || pageNumber !== (payload.articlePage ?? 1)) return null;
    return { items: payload.articles, total: payload.articleTotal ?? payload.articles.length };
  }, [options.topicSlug, pageNumber]);
  const [state, setState] = useState({ key: requestKey, items: seeded?.items ?? [] as PublishedArticle[], total: seeded?.total ?? 0, loading: !seeded, error: false });
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    let active = true;
    setState({ key: requestKey, items: seeded?.items ?? [], total: seeded?.total ?? 0, loading: !seeded, error: false });
    void listPublishedArticles({ offset: (pageNumber - 1) * PAGE_SIZE, limit: PAGE_SIZE, topicSlug: options.topicSlug })
      .then(result => { if (active) setState({ key: requestKey, items: result.items, total: result.total, loading: false, error: false }); })
      .catch(() => { if (active) setState(current => ({ ...current, loading: false, error: true })); });
    return () => { active = false; };
  }, [requestKey, pageNumber, options.topicSlug, seeded, attempt]);
  const current = state.key === requestKey;
  return { articles: current ? state.items : [], total: current ? state.total : 0, loading: !current || state.loading, error: current && state.error, hasMore: current && pageNumber * PAGE_SIZE < state.total, reload };
}

/** Chi tiết bài: ưu tiên dữ liệu prerender, sau đó fetch theo slug. */
export function usePublishedArticle(slug: string | undefined) {
  const seeded = useMemo(() => {
    const payload = readBootstrap();
    if (payload?.article && payload.article.slug === slug) return payload.article;
    return null;
  }, [slug]);
  const [article, setArticle] = useState<PublishedArticle | null>(seeded);
  const [loading, setLoading] = useState(!seeded);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!slug) {
      setArticle(null);
      setLoading(false);
      setError(false);
      return;
    }
    let active = true;
    setLoading(!seeded);
    setError(false);
    void getPublishedArticle(slug)
      .then((result) => {
        if (active) setArticle(result);
      })
      .catch(() => {
        if (active && !seeded) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt, slug, seeded]);

  return { article, loading, error, reload };
}
