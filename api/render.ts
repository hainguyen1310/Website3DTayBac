import { nodeHandler } from "../server/http.ts";
import { handleSiteRequest, renderUnavailableResponse } from "../server/seo/handler.ts";

/**
 * Render HTML theo URL cho Vercel (rewrite `/*` → `/api/render?asin_path=*`).
 * Query gốc được giữ nguyên; `asin_path` là tham số nội bộ của rewrite.
 */
async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const rawPath = url.searchParams.get("asin_path");
  const search = new URLSearchParams(url.searchParams);
  search.delete("asin_path");
  const pathname = `/${rawPath ?? ""}`.replace(/^\/+/, "/");
  try {
    return await handleSiteRequest({
      pathname,
      search,
      host: request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host,
      method: request.method,
    });
  } catch (error) {
    // Log để theo dõi lỗi render/revalidation; không lộ chi tiết ra response.
    console.error("[api/render]", pathname, error);
    return renderUnavailableResponse();
  }
}

export default nodeHandler(handler);
