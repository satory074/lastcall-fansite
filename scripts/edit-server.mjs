// LAST CALL データエディタ用のローカル開発サーバ（依存ゼロ）。
//   npm run edit  → このサーバを起動し、ブラウザでエディタを開く。
// 機能:
//   GET  /                 → /tools/lastcall-editor.html へリダイレクト
//   GET  /api/lastcall     → src/data/lastcall.json を返す（エディタが自動読み込み）
//   PUT  /api/lastcall     → src/data/lastcall.json に直接書き戻す（エディタの「保存」）
//   その他               → リポジトリ直下の静的ファイルを配信
// localhost 専用。本番には一切関与しない（src/ 外なので Pages にも載らない）。

import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";
import { exec } from "node:child_process";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url))); // プロジェクト直下
const DATA = join(ROOT, "src/data/lastcall.json");
const EDITOR_PATH = "/tools/lastcall-editor.html";
const START_PORT = 4330;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const path = decodeURIComponent(url.pathname);

    // --- データAPI ---
    if (path === "/api/lastcall") {
      if (req.method === "GET") {
        const text = await readFile(DATA, "utf8");
        return send(res, 200, text, MIME[".json"]);
      }
      if (req.method === "PUT") {
        const body = await readBody(req);
        let parsed;
        try { parsed = JSON.parse(body); }
        catch (e) { return send(res, 400, "Invalid JSON: " + e.message); }
        if (!parsed || !Array.isArray(parsed.queens) || !Array.isArray(parsed.cinderellas) || !Array.isArray(parsed.episodes)) {
          return send(res, 400, "queens / cinderellas / episodes の3配列が必要です");
        }
        // エディタの出力（2スペース整形＋末尾改行）をそのまま保存
        await writeFile(DATA, body.endsWith("\n") ? body : body + "\n", "utf8");
        console.log("  ✓ 保存しました → src/data/lastcall.json");
        return send(res, 200, JSON.stringify({ ok: true }), MIME[".json"]);
      }
      return send(res, 405, "Method Not Allowed");
    }

    if (path === "/" ) {
      res.writeHead(302, { Location: EDITOR_PATH });
      return res.end();
    }

    // --- 静的ファイル（パストラバーサル防止） ---
    const safe = normalize(join(ROOT, path));
    if (!safe.startsWith(ROOT)) return send(res, 403, "Forbidden");
    try {
      const buf = await readFile(safe);
      return send(res, 200, buf, MIME[extname(safe)] || "application/octet-stream");
    } catch {
      return send(res, 404, "Not Found: " + path);
    }
  } catch (e) {
    return send(res, 500, "Server error: " + e.message);
  }
});

function openBrowser(url) {
  const cmd = process.platform === "darwin" ? "open"
    : process.platform === "win32" ? "start \"\""
    : "xdg-open";
  exec(`${cmd} "${url}"`, () => {});
}

function listen(port) {
  server.once("error", (err) => {
    if (err.code === "EADDRINUSE" && port < START_PORT + 20) listen(port + 1);
    else { console.error(err); process.exit(1); }
  });
  server.listen(port, () => {
    const url = `http://localhost:${port}${EDITOR_PATH}`;
    console.log("\n  LAST CALL データエディタを起動しました");
    console.log("  → " + url);
    console.log("  （データは自動で読み込まれます。編集後は「保存」でファイルに直接書き戻し）");
    console.log("  終了: Ctrl+C\n");
    if (!process.env.NO_OPEN) openBrowser(url);
  });
}

listen(START_PORT);
