import { nodeHandler } from "../http.ts";
import { handleSeoAsset, renderUnavailableResponse } from "../seo/handler.ts";

/** robots.txt và sitemap.xml động theo dữ liệu CMS (B04). */
async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const asset = url.searchParams.get("asset") === "sitemap" ? "sitemap" : "robots";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  try {
    return await handleSeoAsset(asset, host);
  } catch (error) {
    console.error("[api/seo]", asset, error);
    return renderUnavailableResponse();
  }
}

export default nodeHandler(handler);
