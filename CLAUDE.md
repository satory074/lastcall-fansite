# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

非公式 (unofficial) fan archive for the YouTube audition show **LAST CALL (ラストコール)**. The site indexes every aired episode, each shinderella (志願者), the fixed 14 queens, and each queen's per-episode vote across two rounds (ファーストコール → 最終ジャッジ; LAST CALL / NOTHING / NO CALL). Live at https://satory074.github.io/lastcall-fansite/.

Stack: **Astro 5 + TypeScript + Tailwind v4** static site, deployed to GitHub Pages via Actions. No backend; all content is JSON in the repo.

## Commands

```bash
npm install
npm run dev        # http://localhost:4321/lastcall-fansite/
npm run build      # → dist/ (static export)
npm run preview    # Serve the production build locally
npm run typecheck  # astro check — runs Zod schema validation + .astro TS checks
```

There are no unit tests. The build itself is the verification step: Content Collections run Zod schemas at build time, so a malformed JSON or a broken `reference()` will fail `npm run build`.

## Architecture

### Content Collections are the data layer (`src/content.config.ts`)

Three collections, all loaded by `glob({ pattern: "**/*.json", base: ... })`:

| Collection | Path | Shape |
|------------|------|-------|
| `episodes` | `src/content/episodes/NNN.json` | YouTube ID, title, airedAt, `cinderella: reference("cinderellas")`, `votes: { queen: reference("queens"), round, vote, comment }[]` |
| `cinderellas` | `src/content/cinderellas/<slug>.json` | name, age, episodeId, `result: "pass" \| "fail"`, sns |
| `queens` | `src/content/queens/<slug>.json` | name, age, area, store, sns (the 14 fixed queens) |

The reference graph is **episode → cinderella + votes[].queen**. When editing a JSON, the file id (its basename without extension) is the reference key. Examples: `cinderella: "fukuda-aika"` looks for `src/content/cinderellas/fukuda-aika.json`.

Vote details for individual queens are currently empty in most episodes (`votes: []`). The schema accepts `vote: "LAST CALL" | "NOTHING" | "NO CALL" | "ABSENT"` and `round: "first" | "final"` (defaults to `"final"` when omitted). The site treats `votes: []` as "未確認 (unrecorded)" per-queen — see VoteTable below.

### Two-round vote model (ファーストコール / 最終ジャッジ)

Each queen × episode can have up to two votes — one per `round`. **ファーストコール (`"first"`)** is the mid-program preliminary vote; **最終ジャッジ (`"final"`)** is the binding pass/fail vote. Pass/fail tallies and the binary 合格/不合格 verdict are derived **from the final round only**; first-round votes are shown as context but do not affect the result. JSON example:

```json
"votes": [
  { "queen": "aizawa-emiri", "round": "first", "vote": "LAST CALL", "comment": "..." },
  { "queen": "aizawa-emiri", "round": "final", "vote": "NOTHING" }
]
```

### Aggregation rule: 合格率タリーは「最終ジャッジ」のみ

3ヶ所すべての集計表示が共通ルールに従う:

- **VoteTable** (`src/components/VoteTable.astro`): ラウンド別タリーカード 2 枚（LC / NOTHING / NO CALL / 欠席 / 未確認）+ 「ファースト→最終で判定を変えたクイーン N 名」
- **マトリクス** (`src/pages/people.astro`): 上部に全体集計バナー、末尾に `<tfoot>` 累計行（クイーン別 LC / NOTHING(+NO CALL)）
- **クイーンプロフィール** (`src/pages/queens/[slug].astro`): ラウンド別タリーカード + 「合格率 X%（Y / Z）」+ 判定変更回数

合格率・合否は **`round === "final"` の票のみで集計**。ファーストコールはコンテキスト情報として表示するだけで結果には影響させない。新たな集計表示を追加するときもこの規約に従うこと。

### Per-episode page renders the full cast even without vote data

`src/components/VoteTable.astro` always enumerates **all 14 queens from the `queens` collection** and shows **two columns** per queen (ファーストコール / 最終ジャッジ). Missing entries in either round render an `UNKNOWN` placeholder badge. This means each episode page shows the complete jury panel × two rounds even when nobody has watched the episode to record individual votes yet.

The displayed final verdict (合格/不合格) falls back to `cinderella.data.result` when no final-round vote tallies are present — `<VoteTable cinderellaResult={cinderella?.data.result}>` is the wiring.

### Pages are deliberately consolidated

After several iterations, the routes are:

- `/` — hero + Latest Episode (feature card) + All Episodes grid (`#episodes` anchor)
- `/episodes/[id]/` — detail page (video + cinderella + 14-queen vote table + sources + prev/next nav)
- `/people/` — unified Cinderellas + Queens + **voting matrix** (`episodes.length × queens.length` grid, sticky left columns, `<tfoot>` aggregate row)
- `/cinderellas/[slug]/`, `/queens/[slug]/` — individual profile detail pages (no list index)
- `/about/` — disclaimer, spoiler-toggle docs, deletion request policy
- `/404` — custom not-found page (`src/pages/404.astro`); GitHub Pages serves `404.html`
- `/rss.xml` (`src/pages/rss.xml.ts`) and `/search-index.json` (`src/pages/search-index.json.ts`) — non-HTML endpoints (see SEO & search below)

There is no `/episodes/` index or `/cinderellas/` index or `/queens/` index. The nav has only two top-level items: `出演者・審査一覧` and `このサイトについて`. Do not re-add those index pages; the home page and `/people/` cover them.

### SEO, discovery & search

- **Structured data**: `src/components/StructuredData.astro` injects JSON-LD via Layout's `<slot name="head" />` (place it as `<StructuredData slot="head" schema={...} />` inside a page). Wired: `WebSite` (home), `VideoObject` (episode), `Person` (queen). Layout auto-emits `BreadcrumbList` from the `breadcrumbs` prop. **Never put pass/fail, scores, or vote outcomes in JSON-LD** — it would spoil search results.
- **Sitemap/RSS**: `@astrojs/sitemap` integration (`astro.config.mjs`) → `sitemap-index.xml`; `robots.txt` points to it. `/rss.xml` lists episodes by `airedAt` desc, **titles + dates only** (no results).
- **Icons/OGP**: `public/favicon.svg` + `public/og-default.png` (1200×630, regenerate with sharp from an inline SVG). Layout defaults `ogImage` to og-default; episode pages override with the YouTube thumb.
- **Absolute URLs**: use `absUrl()` in `src/lib/url.ts` for JSON-LD / feeds (host + base path).
- **Breadcrumbs**: pass `breadcrumbs={[{ label, href? }]}` to `<Layout>`; it prepends ホーム, renders the visual nav, and generates the matching `BreadcrumbList`. Wired on episode/cinderella/queen detail pages.
- **Global search**: header search button opens an overlay (`#lc-search` in `Layout.astro`) that fetches `/search-index.json` once and substring-matches. The index includes names, episode numbers, and queen attributes only — **spoiler-free by construction**. `/` opens it, Esc closes.
- **/people in-place filter/sort**: cinderella/queen grids wrap each `PersonCard` in a `display:contents` `.lc-pcard` div carrying `data-name` / `data-ep` / `data-sortname` / `data-age`; a JS controller (`.lc-listctl`) filters and reorders by **non-spoiler fields only**. Controls reveal only when JS runs.
- **Matrix queen-column filter**: every matrix `th`/`td`/`tfoot` cell for a queen carries `data-qcol={queen.id}`; the `#lc-matrix-filter` chip panel toggles `.lc-col-off` (`display:none`) per column to shrink width on mobile. Panel is `hidden` until JS confirms support, so no-JS users keep the full table.

### Spoiler protection — payload-first occlusion (v2, 2026-05 redesign)

`filter: blur()` was abandoned because it preserves color, shape, and width ratios — gold vs gray badges and DivergingBar pass/fail ratios were readable through the blur. Worse, `aria-label` / `title` / `data-vote` attributes leaked the outcome to screen readers and DevTools regardless of blur. The replacement architecture is **payload-first SSR + CSS occlusion + JS hydrator**:

1. Spoiler-sensitive components (`VoteChip`, `DivergingBar`, `StatCard`, `SpoilerBadge`) **do NOT emit the real value** into SSR HTML. They emit a neutral `.lc-occluded` placeholder and stash the real value in `data-spoiler-payload` as JSON. `aria-label` defaults to `"ネタバレ非表示"` and the placeholder is decoupled from the actual outcome's color/text.
2. `src/styles/globals.css` paints `.lc-occluded[data-occlusion="chip|bar|text|block"]` as solid surface plates. No color, width, or text leaks through.
3. The bottom `<script>` in `src/components/Layout.astro` reads `localStorage["lc-spoilers"]` and **hydrates** matching elements: writes back `className`, `textContent` / `innerHTML`, `style.width` (for bars), and `aria-label`, then adds `.lc-revealed` to flip the CSS off.
4. With JS disabled, every spoiler element stays occluded permanently — a `<noscript>` banner notes the limitation. Mode switching from a more-revealed to a less-revealed state issues a `location.reload()` to guarantee clean revert.

When adding any new element that displays an outcome, **never write raw markup like** `<span class="spoiler bg-[var(--color-gold)]">合格</span>`. Reach for the existing primitives:

- Result badges → `<SpoilerBadge result={...} variant="pill|pill-large|pill-mini|feature" />`
- Single vote chip → `<VoteChip vote={...} />`
- Pass/fail tally bar → `<DivergingBar pass={...} fail={...} />`
- Numeric stat card → `<StatCard value={...} spoiler spoilerLevel="vote|result" />`

Additional bans:
- Never put `title=` or `aria-label=` containing the outcome literal (e.g. `aria-label="合格率 36%"`). The hydrator writes the real aria back on reveal.
- Never write inline `style="width: NN%"` for a pass/fail ratio outside `DivergingBar`.
- Never add a `<td title={comment}>` hover tooltip that shows comment text — comments must be wrapped in `.lc-occluded[data-occlusion="block"]` (the `/people/` matrix used to do this and was removed for this reason).
- Verify changes in all three modes (`hidden` / `results-only` / `shown`) × JS on/off before committing.

Legacy `.spoiler` / `.spoiler-block` / `.show-spoilers` class names are kept as backwards-compatibility aliases (CSS will at least hide their text), but new code must use `.lc-occluded`.

### `EpisodeCard` and `PersonCard` are the visual language

`src/components/EpisodeCard.astro` and `src/components/PersonCard.astro` are the reusable card shells used on home, `/people/`, prev/next nav. They both rely on the `.card` utility in `globals.css` for the hover ring and consistent surface elevation. Don't ship one-off card markup — extend these.

`EpisodeCard` supports three `variant`s: `"default"` (image-led grid card), `"feature"` (large image + side panel, used for the latest episode hero), and `"compact"` (small thumb + text, used for prev/next nav). `PersonCard` exposes a named `signature` slot for embedding a `<DivergingBar>` or `<VoteSignature>` strip (e.g., on the queens list).

The matrix in `src/pages/people.astro` is a hand-rolled `<table>` with `position: sticky` on the left two columns. When changing the schema, the matrix is the most touchy place because it iterates `episodes × queens` and renders **two stacked `<VoteChip>` per cell** (上=ファーストコール / 下=最終ジャッジ).

### Vote visualization primitives — always reuse these

When showing vote data anywhere, use these shared primitives in `src/components/` (all wire through the v2 payload-first occlusion automatically):

- **`VoteChip.astro`** — single round chip for one queen × one round. Renders as a colored circle (gold = LC, dark gray = NOTHING, hollow = NO CALL, dashed = UNKNOWN, slashed = ABSENT). Use `size: "xs" | "sm" | "md" | "lg"`. `spoiler={false}` for legends.
- **`VoteSignature.astro`** — horizontal strip of chips for one axis. Use `forQueen` for the per-queen time-series fingerprint, `forEpisode` for the 14-queen row. Set `round: "first" | "final" | "both"`.
- **`DivergingBar.astro`** — pass/fail tally as a center-axis horizontal bar (gold right, dark gray left). Use anywhere a "X 票 vs Y 票" count appears. Auto-handles the `合格率 %` label.
- **`StatCard.astro`** — large numeric stat with eyebrow + sublabel (used in season-averages dashboards on queen profiles and the matrix banner).
- **`SpoilerBadge.astro`** — pass/fail pill badge (variants: `pill`, `pill-large`, `pill-mini`, `feature`). Use for any "合格 / 不合格" outcome chip on cards, hero, episode header, matrix cells.

Whenever you'd otherwise hand-roll a "pass count / fail count" inline span or a tally table, reach for `DivergingBar` + `StatCard` instead. Hand-rolled inline tallies have been deleted — re-introducing them creates visual drift and bypasses spoiler protection.

### 3-tier spoiler granularity

The spoiler system has three states:

1. `spoilers-hidden` (default) — every `.lc-occluded` element is shown as a neutral placeholder.
2. `spoilers-results-only` — only elements with `data-spoiler-level="result"` are occluded (合否 / pass-fail verdicts). Individual votes (`"vote"`) and queen comments (`"comment"`) are hydrated to their real values. This is for the "I want to see who appeared and how each queen voted but not the final verdict" persona.
3. `spoilers-shown` — all `.lc-occluded` are hydrated to their real values.

Annotation conventions on the element:
- `data-spoiler-level="result"` — pass/fail badges, "合格率 X%", overall verdict bars, cinderella `result` badges, per-episode aggregate counts.
- `data-spoiler-level="vote"` — individual `<VoteChip>` and per-round tallies (per-queen season averages).
- `data-spoiler-level="comment"` — queen comments and `background` text.
- No `data-spoiler-level` = treated as `"vote"`.

Each `.lc-occluded` also carries `data-occlusion` to tell the CSS which neutralization shape to apply:
- `data-occlusion="chip"` — round single-token badge (`VoteChip`, `SpoilerBadge`)
- `data-occlusion="bar"`  — horizontal diverging bar (`DivergingBar`)
- `data-occlusion="text"` — inline numeric / single-line text (`StatCard` value, `DivergingBar` label, tally counts)
- `data-occlusion="block"` — paragraph (queen comments, `background`, episode `summary`)

The state class lives on `<html>` (`spoilers-hidden` / `spoilers-results-only` / `spoilers-shown`). Storage key is `lc-spoilers` with value `"hidden" | "results-only" | "shown"`. Toggle UI is a 3-button segmented control in `Layout.astro` header. `.show-spoilers` is kept as a legacy alias of `spoilers-shown`.

### Design system in globals.css

Token-driven dark theme using Material/HIG-aligned elevation (`--color-bg` < `--color-surface` < `--color-card` < `--color-raised`) plus gold accent. Three typography utilities:

- `.eyebrow` — gold uppercase tracked kicker
- `.section-eyebrow` — muted uppercase kicker with a hairline rule before it (used for in-page section headings)
- `.font-display-serif` — Noto Serif JP for editorial display text (hero, page titles, card titles)

Stick to these for any new headings instead of inventing new heading styles. Backwards-compat aliases `--color-bg-elevated` / `--color-bg-card` exist for older markup but new code should use the canonical names.

Note: `--color-fail` は意図的にグレー（`#4a4a52`）であり赤ではない。NOTHING / NO CALL バッジが赤系に見えないのは仕様で、鮮やかな赤を避けることでゴールドの合格表現とのコントラストを保っている。「失敗 = 赤」の直感で塗り替えないこと。

### Japanese typography baseline

`globals.css` sets JP-optimized defaults that should be respected everywhere:

- `line-height: var(--leading-jp-body)` = **1.85** for body. Don't tighten back to ~1.5 — kanji density needs more breathing room on screen.
- `font-feature-settings: "palt" 1` on `<html>` and `.font-display-serif` — proportional kana metrics. Don't disable.
- Body `letter-spacing: 0.02em`; display serif `letter-spacing: -0.01em`. The Mincho display face wants tighter tracking by design.
- Use `.font-display-serif` (Noto Serif JP) **only for display headings and key proper nouns**. Long body in Mincho on screen is hard to read — keep body in `--font-sans` (Noto Sans JP).
- For tabular numbers (dates, vote counts, percentages), add `tabular-nums` class so columns align.

### Motion & accessibility

- All animations must use only `transform` and `opacity` (never `width` / `height`) to keep INP healthy.
- `@media (prefers-reduced-motion: reduce)` in `globals.css` neutralizes all transitions globally — don't add `transition` overrides that bypass this.
- Cross-document View Transitions are enabled site-wide via `@view-transition { navigation: auto; }`. Add `view-transition-name: ep-{id}-thumb` (already wired in `EpisodeCard` and on the YouTube embed wrapper in episode detail) to thread thumbnails between pages. New transitioned elements need a unique name per page.
- Use `.reveal-on-scroll` class for opt-in scroll-driven fade-in (`animation-timeline: view()`, no JS). Only applies in browsers that support it; gracefully no-op otherwise.

### URL helper handles the GitHub Pages base path

`src/lib/url.ts` exports `siteLink()` / `youtubeUrl()` / `youtubeThumb()`. Always use `siteLink("/foo/")` for internal links — Astro is configured with `base: "/lastcall-fansite"` in `astro.config.mjs`, and hard-coding `/foo/` paths breaks in production while working in dev.

### Deployment

`.github/workflows/deploy.yml` builds on push to `main` and deploys to GitHub Pages via `actions/deploy-pages@v4`. The workflow sets `GH_USER=${{ github.repository_owner }}` so the canonical `site:` URL is derived from the repo owner rather than hardcoded. If you fork or rename the repo, also update `repoName` in `astro.config.mjs`.

## Content authoring guardrails

These are project-specific, not generic rules:

- **No AI-generated prose.** The schema retains `summary` / `background` / `bio` as optional, but historical entries were removed because paraphrases from aggregator sites introduced factual drift. Only re-add these fields with verified, citable text — never let me speculatively summarize an unseen episode.
- **No performer photos.** Only YouTube thumbnails (program-issued) and YouTube embed iframes. Hosting Instagram/personal photos infringes 著作権 + 肖像権 + パブリシティ権 simultaneously — this was researched and ruled out. SNS links only.
- **新エピソード追加手順**: create `src/content/episodes/NNN.json` + `src/content/cinderellas/<slug>.json`, reference the cinderella from the episode's `cinderella` field, push to `main`. Schema violation fails the build before deploy. 票データを入れる際は各クイーン × 2 票（`round: "first"` と `"final"`）が原則。記録の取れたラウンドだけ部分的に入れても OK（未記載は `UNKNOWN` 表示）。
- **YouTube metadata via yt-dlp**: when batch-importing episode info, `uv tool install yt-dlp` and run `yt-dlp --flat-playlist --no-warnings --print "%(id)s|%(title)s|%(upload_date)s" "https://www.youtube.com/playlist?list=PLyVYYMYzNpmC183bSMhXXo04dhzYUEebI"` against the official playlist.
