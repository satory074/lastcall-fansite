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
import { exec, spawn } from "node:child_process";

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
        if (!parsed || !Array.isArray(parsed.queens) || !Array.isArray(parsed.episodes)) {
          return send(res, 400, "queens / episodes の2配列が必要です");
        }
        // エディタの出力（2スペース整形＋末尾改行）をそのまま保存
        await writeFile(DATA, body.endsWith("\n") ? body : body + "\n", "utf8");
        console.log("  ✓ 保存しました → src/data/lastcall.json");
        return send(res, 200, JSON.stringify({ ok: true }), MIME[".json"]);
      }
      return send(res, 405, "Method Not Allowed");
    }

    // --- YouTube メタ取得（title + airedAt + thumbnail） ---
    if (path === "/api/youtube") {
      const id = url.searchParams.get("id") || "";
      if (!/^[A-Za-z0-9_-]{6,15}$/.test(id)) return send(res, 400, "invalid video id");
      const thumbnail = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
      const watch = `https://www.youtube.com/watch?v=${id}`;
      // 1) yt-dlp（title + upload_date）
      const yt = await ytDlp(watch);
      if (yt) return send(res, 200, JSON.stringify({ ...yt, thumbnail, via: "yt-dlp" }), MIME[".json"]);
      // 2) oEmbed フォールバック（title のみ）
      try {
        const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`);
        if (r.ok) { const j = await r.json(); return send(res, 200, JSON.stringify({ title: j.title || "", airedAt: null, thumbnail, via: "oembed" }), MIME[".json"]); }
      } catch {}
      return send(res, 502, JSON.stringify({ error: "取得失敗（yt-dlp も oEmbed も不可）", thumbnail }), MIME[".json"]);
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

// yt-dlp で title と upload_date を取得。未インストール/失敗時は null。
function ytDlp(watch) {
  return new Promise((resolve) => {
    let out = "", done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    let child;
    try {
      child = spawn("yt-dlp", ["--no-warnings", "--skip-download", "--print", "%(title)s", "--print", "%(upload_date)s", watch], { stdio: ["ignore", "pipe", "ignore"] });
    } catch { return finish(null); }
    const timer = setTimeout(() => { try { child.kill(); } catch {} finish(null); }, 20000);
    child.on("error", () => { clearTimeout(timer); finish(null); }); // ENOENT 等
    child.stdout.on("data", (d) => (out += d));
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return finish(null);
      const lines = out.trim().split("\n");
      const title = (lines[0] || "").trim();
      const ud = (lines[1] || "").trim(); // YYYYMMDD
      const airedAt = /^\d{8}$/.test(ud) ? `${ud.slice(0, 4)}-${ud.slice(4, 6)}-${ud.slice(6, 8)}` : null;
      finish(title ? { title, airedAt } : null);
    });
  });
}

function openBrowser(url) {
  const cmd = process.platform === "darwin" ? "open"
    : process.platform === "win32" ? "start \"\""
    : "xdg-open";
  exec(`${cmd} "${url}"`, () => {});
}

function onError(err) {
  if (err.code === "EADDRINUSE") {
    const next = (server.__port || START_PORT) + 1;
    if (next < START_PORT + 20) return listen(next);
  }
  console.error(err); process.exit(1);
}
function onListening() {
  const url = `http://localhost:${server.__port}${EDITOR_PATH}`;
  console.log("\n  LAST CALL データエディタを起動しました");
  console.log("  → " + url);
  console.log("  （データは自動で読み込まれます。編集後は「保存」でファイルに直接書き戻し）");
  console.log("  終了: Ctrl+C\n");
  if (!process.env.NO_OPEN) openBrowser(url);
}
// リスナーは一度だけ登録（再試行で多重登録しないよう listen() の外で）
server.on("error", onError);
server.on("listening", onListening);
function listen(port) { server.__port = port; server.listen(port); }

listen(START_PORT);
