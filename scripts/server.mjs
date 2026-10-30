import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};
export function createServer(directory = root) {
  return http.createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { Allow: "GET, HEAD" }).end("Method not allowed");
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
    } catch {
      res.writeHead(400).end("Bad request");
      return;
    }
    const path = pathname === "/" ? "index.html" : pathname.slice(1);
    // Отдаём только файлы сайта; метаданные Git и служебные файлы недоступны.
    if (
      !["index.html", "styles.css", "app.js"].includes(path) &&
      !/^assets\/[a-zA-Z0-9_-]+\.(webp|svg|woff2|txt)$/.test(path)
    ) {
      res.writeHead(404).end("Not found");
      return;
    }
    try {
      const data = await readFile(resolve(directory, path));
      res.writeHead(200, {
        "Content-Type": mime[extname(path)],
        "Cache-Control": "no-cache",
      });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch {
      res.writeHead(404).end("Not found");
    }
  });
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "0.0.0.0";
  const server = createServer(
    process.argv.includes("--dist") ? resolve(root, "dist") : root,
  );
  server.on("error", (error) => {
    console.error(`Сервер не запущен: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, host, () =>
    console.log(
      `ТИШЕ · http://${host === "0.0.0.0" ? "localhost" : host}:${port}`,
    ),
  );
}
