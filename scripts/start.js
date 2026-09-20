// Production server entry point.
//
// This project's TanStack Start build (dist/server/server.js) exports a
// plain { fetch(request) } handler — a portable Web-standard function, not
// a running server by itself. This script is what actually turns it into
// a real listening web server: it wraps that handler with srvx (which
// converts Node's request/response objects to and from the standard Fetch
// API), and serves the built static assets (JS, CSS, images) from
// dist/client directly, falling back to the app's server-rendered handler
// for everything else (pages, API routes).
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { serve } from "srvx";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const CLIENT_DIR = join(import.meta.dirname, "..", "dist", "client");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function tryServeStatic(pathname) {
  // Prevent path traversal outside dist/client.
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(CLIENT_DIR, safePath);
  if (!filePath.startsWith(CLIENT_DIR)) return null;
  if (!existsSync(filePath) || !statSync(filePath).isFile()) return null;
  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
  return new Response(createReadStream(filePath), {
    headers: { "content-type": contentType },
  });
}

const { default: appHandler } = await import("../dist/server/server.js");

const server = serve({
  port: PORT,
  hostname: HOST,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/") {
      const staticResponse = tryServeStatic(url.pathname);
      if (staticResponse) return staticResponse;
    }
    return appHandler.fetch(request, {}, {});
  },
});

await server.ready();
console.log(`Server listening on ${server.url}`);