import { useCallback, useEffect, useState } from "react";
import { listPublishedArticles } from "../services/storeApi";
import type { PublishedArticle } from "../services/storeApi";

/** Empty and unavailable databases never display invented articles. */
export function usePublishedArticleFeed() {
  const [articles, setArticles] = useState<PublishedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    void listPublishedArticles()
      .then((data) => { if (active) setArticles(data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  return { articles, loading, error, reload };
}

export function usePublishedArticles() {
  return usePublishedArticleFeed().articles;
}
