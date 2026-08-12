#!/usr/bin/env node
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { ROOT } from "../lib/work-utils.mjs";
import { runReviewReport } from "../lib/review.mjs";

const PORT = 3847;
const HOST = "127.0.0.1";
const csrfToken = randomBytes(16).toString("hex");

function safePath(requested) {
  const resolved = resolve(ROOT, requested);
  if (!resolved.startsWith(ROOT)) throw new Error("Path traversal denied");
  return resolved;
}

function renderHtml() {
  const reports = runReviewReport();
  const rows = reports
    .map(
      (r) => `<tr>
        <td>${r.slug}</td>
        <td>${r.queue}</td>
        <td>${r.reasons.join(", ") || "—"}</td>
        <td>
          <form method="POST" action="/approve" style="display:inline">
            <input type="hidden" name="csrf" value="${csrfToken}" />
            <input type="hidden" name="slug" value="${r.slug}" />
            <button type="submit">Approve</button>
          </form>
          <form method="POST" action="/reject" style="display:inline">
            <input type="hidden" name="csrf" value="${csrfToken}" />
            <input type="hidden" name="slug" value="${r.slug}" />
            <button type="submit">Reject</button>
          </form>
        </td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html><html><head><title>Review UI</title></head><body>
    <h1>Directory Review</h1>
    <table border="1" cellpadding="8"><thead><tr><th>Slug</th><th>Queue</th><th>Reasons</th><th>Actions</th></tr></thead>
    <tbody>${rows}</tbody></table>
  </body></html>`;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const params = new URLSearchParams(body);
      resolve(Object.fromEntries(params));
    });
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(renderHtml());
      return;
    }
    if (req.method === "POST" && (req.url === "/approve" || req.url === "/reject")) {
      const body = await parseBody(req);
      if (body.csrf !== csrfToken) {
        res.writeHead(403);
        res.end("CSRF mismatch");
        return;
      }
      const slug = body.slug;
      const enriched = safePath(`work/staging/enriched/${slug}.json`);
      if (!existsSync(enriched)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      if (req.url === "/approve") {
        const approvedDir = join(ROOT, "work/staging/approved");
        mkdirSync(approvedDir, { recursive: true });
        writeFileSync(join(approvedDir, `${slug}.json`), readFileSync(enriched));
        const approvedList = join(ROOT, "work/approved-slugs.txt");
        const existing = existsSync(approvedList) ? readFileSync(approvedList, "utf-8") : "";
        if (!existing.includes(slug)) {
          writeFileSync(approvedList, existing + slug + "\n");
        }
      } else {
        const rejectedDir = join(ROOT, "work/staging/rejected");
        mkdirSync(rejectedDir, { recursive: true });
        writeFileSync(join(rejectedDir, `${slug}.json`), readFileSync(enriched));
      }
      res.writeHead(302, { Location: "/" });
      res.end();
      return;
    }
    res.writeHead(404);
    res.end("Not found");
  } catch (err) {
    res.writeHead(500);
    res.end(String(err.message));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Review UI at http://${HOST}:${PORT}/`);
});
