import { useEffect, useState } from "react";
import { stories } from "../shopData";
import { listPublishedArticles } from "../services/storeApi";
import type { PublishedArticle } from "../services/storeApi";

const fallbackArticles: PublishedArticle[] = stories.map((story) => ({
  id: story.id,
  tag: story.tag,
  date: story.date,
  title: story.title,
  excerpt: story.excerpt,
  image: story.image,
  readTime: story.readTime,
  body: [...story.body],
}));

/**
 * Giữ nội dung minh họa hiển thị trong lúc Supabase chưa được khởi tạo,
 * sau đó thay bằng bài đã xuất bản từ cơ sở dữ liệu.
 */
export function usePublishedArticles() {
  const [articles, setArticles] = useState<PublishedArticle[]>(fallbackArticles);

  useEffect(() => {
    let active = true;
    void listPublishedArticles()
      .then((data) => {
        if (active && data.length) setArticles(data);
      })
      .catch(() => {
        // Bản demo vẫn đọc được trước khi migration được áp dụng.
      });
    return () => {
      active = false;
    };
  }, []);

  return articles;
}
