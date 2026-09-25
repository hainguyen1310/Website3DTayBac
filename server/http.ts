import type { IncomingMessage, ServerResponse } from "node:http";
export function nodeHandler(handler: (request: Request) => Promise<Response>) {
  return async (
    req: IncomingMessage & { body?: unknown },
    res: ServerResponse,
  ) => {
    try {
      const chunks: Buffer[] = [];
      let length = 0;
      if (req.body === undefined) {
        for await (const chunk of req) {
          const buffer = Buffer.from(chunk);
          length += buffer.length;
          if (length > 65536) {
            res.statusCode = 413;
            res.end();
            return;
          }
          chunks.push(buffer);
        }
      }
      const body =
        req.body === undefined
          ? Buffer.concat(chunks).toString()
          : typeof req.body === "string"
            ? req.body
            : JSON.stringify(req.body);
      if (body.length > 65536) {
        res.statusCode = 413;
        res.end();
        return;
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value)
          headers.set(key, Array.isArray(value) ? value.join(",") : value);
      }
      const request = new Request(`http://localhost${req.url ?? "/"}`, {
        method: req.method,
        headers,
        ...(req.method !== "GET" && req.method !== "HEAD" ? { body } : {}),
      });
      const response = await handler(request);
      res.statusCode = response.status;
      response.headers.forEach((v, k) => res.setHeader(k, v));
      res.end(await response.text());
    } catch {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "Dịch vụ chưa sẵn sàng. Kiểm tra cấu hình máy chủ.",
        }),
      );
    }
  };
}
