# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

非公式 (unofficial) fan archive for **two sibling YouTube audition shows** by the same producers (channel @LASTCALL_OFFICIAL): **LAST CALL (ラストコール)** — キャバ嬢 audition, ゴールド brand — and **HOSTCALL (ホストコール)** — 男性ホスト audition, プラチナ brand, launched 2026-06-29. The site indexes every aired episode (each episode = one candidate 志願者, embedded), the master roster of judges, and — for each episode's **variable judge lineup** — each judge's vote across two rounds (ファーストコール: `LIKE` / `NOTHING` → 最終ジャッジ: `合格` / `不合格`). Live at https://satory074.github.io/lastcall-fansite/.

The two shows are one **dual-brand** site sharing all components/logic; a `show` dimension (`"lastcall" | "hostcall"`) separates their data, routes, and accent color. HOSTCALL は現状データ未投入の足場のみ（empty-state 表示、動的ルートは何も emit しない）。

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

データ運用の実務手順（票データの入れ方・SNS リンクの追加基準・現状の欠落チェックリスト）は [`MAINTENANCE.md`](./MAINTENANCE.md) を参照。

## Architecture

### Two-show dual-brand (`src/lib/show.ts` is the single source of truth)

A `show: "lastcall" | "hostcall"` field lives on **every** episode and judge (Zod `.default("lastcall")` → existing entries validate with **no JSON edits**). `src/lib/show.ts` centralizes everything per-show and **must be the only place** show labels/paths/colors are defined:
- `SHOW_META[show]` — brand, `brandParts` (LAST·CALL lockup split), `rosterLabel`/`rosterLabelEn`/`rosterPath` (クイーン/Queens/queens vs ホスト/Hosts/hosts), `candidateLabel`/`candidateTagEn` (シンデレラ/Cinderella vs 候補者/Challenger), `basePath` (`""` vs `/hostcall`), officialUrl, youtube. **HOSTCALL `candidateLabel` and `officialUrl` are TODO placeholders** — replace when the show's real terminology/URL is known.
- Helpers: `episodesForShow(show)` / `rosterForShow(show)` (filter collections by show), `episodeHref`/`rosterHref`/`homeHref`/`peopleHref` (+ `*AbsUrl` for JSON-LD), `cleanTitle` (strips `【LAST…】`/`【HOST…】`). Never hardcode `/episodes/` or `/queens/` paths or the strings クイーン/シンデレラ — derive from `show`.

**Roster stays ONE `queens` collection** (hosts live in it tagged `show:"hostcall"`), so `reference("queens")` keeps build-time validation across both shows. Because it's a single collection, **episode `id`s and judge `slug`s must be globally unique across the two shows** (a hostcall ep `"001"` cannot collide with a lastcall ep `"001"`). Labels are derived from `show`, never denormalized onto the judge.

**Dual-brand color** (`src/styles/globals.css`): `<html data-show={show}>` (SSR, set by `Layout`'s `show` prop). LAST CALL = gold (`@theme` default). `:root[data-show="hostcall"]` **overrides the raw `--color-gold*` vars** to platinum (`#c9d3e0` / bright `#e8eef6` / deep `#7c8794`) + `--color-pass`. This recolors every component and every spoiler `data-spoiler-payload` (which reference `var(--color-gold)` literally) with **zero per-component edits**. New chrome uses `var(--color-gold)` directly — an earlier `--color-accent` alias was removed (nested var alias was unreliable). `color-scheme: dark` on `html` stops Chrome Auto-Dark-Mode from re-inverting accents (the flag variant still can't be suppressed).

### Content Collections are the data layer (`src/content.config.ts`)

**All data lives in one file: `src/data/lastcall.json`.** It has **two** top-level arrays (`queens`, `episodes`), and `content.config.ts` uses **inline loaders** (`loader: () => data.queens.map(...)`) — not `glob()` — to slice that single file into two Content Collections. The candidate (志願者) is **embedded inside each episode** (1 episode = 1 candidate), so there is no separate `cinderellas` collection. Editing any episode, candidate, vote, lineup, or SNS link means editing this one file. (週次メンテの実務手順は [`MAINTENANCE.md`](./MAINTENANCE.md)。)

| Collection | Array | Shape |
|------------|-------|-------|
| `episodes` | `episodes[]` | `id`, **`show`**, YouTube ID, title, airedAt, `cinderella: { name, age?, result: "pass" \| "fail", sns, background? }` (embedded object), `lineup: reference("queens")[]` (出演審査員), `votes: { queen: reference("queens"), round, vote }[]` |
| `queens` | `queens[]` | `slug`, **`show`**, name, nameKana?, store, storeUrl?, sns (master roster of all judges, both shows) |

The reference graph is **episode → lineup[].queen + votes[].queen** (candidate is a plain embedded object, not a reference). The queen **`slug`** and the episode **`id`** are the reference key **and** URL slug — the inline loader maps them to the Astro entry `.id`. A wrong slug/id fails `npm run build`. **Do not re-introduce per-file JSON under `src/content/`, the `cinderellas` collection, a `/cinderellas/` route, or split hosts into a second collection** — all were removed/ruled out; the single file + single `queens` collection + episode-embedded candidate is the source of truth. The GUI editor (`npm run edit`) serializes the whole `state` object, so it **preserves** a manually-added `show` field through save (no data loss), though it has no `show` picker UI yet.

### Variable lineup & two-round vote model (ファーストコール / 最終ジャッジ)

**Queens are NOT fixed per episode** — each episode has its own `lineup` (a subset of the master roster). The matrix/VoteTable enumerate `episode.lineup`, not all queens. There is no "ABSENT" — a queen simply isn't in the lineup.

Each lineup queen can have up to two votes — one per `round`:
- **ファーストコール (`"first"`)**: preliminary vote, `vote ∈ {"LIKE", "NOTHING"}`.
- **最終ジャッジ (`"final"`)**: binding vote, `vote ∈ {"合格", "不合格"}`.

The vote enum is `z.enum(["LIKE", "NOTHING", "合格", "不合格"])` (round-appropriateness enforced by the editor, not the schema). No `comment` field. JSON example:

```json
"lineup": ["aizawa-emiri", "airi"],
"votes": [
  { "queen": "aizawa-emiri", "round": "first", "vote": "LIKE" },
  { "queen": "aizawa-emiri", "round": "final", "vote": "不合格" }
]
```

The episode's overall 合否 verdict is **`episode.cinderella.result`** (`"pass"|"fail"`), set explicitly via the editor's 合否 selector — independent of the per-queen final votes (which are context).

### Aggregation rule: 合格率タリーは「最終ジャッジ」のみ

集計表示は共通ルールに従う:

- **VoteTable** (`src/components/VoteTable.astro`): ラウンド別 DivergingBar 2 本（ファースト=LIKE/NOTHING、最終=合格/不合格）+ 「ファースト→最終で判定を変えたクイーン N 名」。空 lineup は「ラインナップ未記録」表示。
- **マトリクス** (`src/pages/people.astro`): クイーン列=全エピソードの lineup の和集合、**並び順は出演回数の多い順→同数は slug 昇順**（`matrixQueens` の sort）。「結果」の右に**票数列**（各回の最終ジャッジ合否を `DivergingBar` で表示、`spoilerLevel="result"`、`flip stacked showRate={false}` で**合格(金)を左寄せ積み上げ・合格率ラベル非表示**にしてある。`DivergingBar` の既定は中央軸ダイバージング・金右・合格率ありで、この列だけ別扱い。`stacked` で左寄せ積み上げ、`flip` で金を左に）。lineup 外のセルは空欄。末尾 `<tfoot>` は**2行**の累計行: 上=**ファースト累計（LIKE率, `spoilerLevel="vote"`）**、下=**最終累計（合格率）**。各行に全体集計バー＋クイーン別の率（LIKE率 / 合格率）を表示。
- **クイーンプロフィール** (`src/pages/queens/[slug].astro`): そのクイーンが lineup に含まれる回のみの履歴 + 「合格率 X%（Y / Z）」+ 判定変更回数。

合格率は **`round === "final"` の `合格` 票のみで集計**。ファーストコール（LIKE/NOTHING）は **`LIKE率` として別軸で集計**し、合格率には混ぜない（マトリクス tfoot の上段がこの LIKE率、下段が合格率）。ファーストの集計は `spoilerLevel="vote"`（合格率＝最終の合否は `"result"`）。

### Per-episode page renders the episode's lineup

`src/components/VoteTable.astro` enumerates **`episode.lineup`** (resolved via `getEntries`) and shows **two rows/columns** per queen (ファースト / 最終). A lineup queen with no recorded vote renders an `UNKNOWN` placeholder; an empty lineup renders a "ラインナップ未記録" placeholder. The displayed verdict falls back to `episode.data.cinderella.result` — `<VoteTable lineup={episode.data.lineup} votes={episode.data.votes} cinderellaResult={episode.data.cinderella.result}>` is the wiring.

### Pages are deliberately consolidated + per-show routing

LAST CALL keeps its **existing paths** (back-compat/SEO); HOSTCALL mirrors them under a **`/hostcall/` prefix**:

| | LAST CALL | HOSTCALL |
|---|---|---|
| Home | `/` | `/hostcall/` |
| People/matrix | `/people/` | `/hostcall/people/` |
| Episode detail | `/episodes/[id]/` | `/hostcall/episodes/[id]/` |
| Judge profile | `/queens/[slug]/` | `/hostcall/hosts/[slug]/` |
| About (shared) | `/about/` | `/about/` |

**Page bodies are shared show-aware components** so LAST CALL/HOSTCALL pages are thin wrappers (each `getStaticPaths` filters via `episodesForShow`/`rosterForShow`; zero HOSTCALL data → dynamic routes emit nothing → build stays green):
- `src/components/PeopleView.astro` (props `show`) — the whole `/people/` body incl. the voting matrix + its `<script>`/`<style>`. `people.astro` and `hostcall/people.astro` just render `<PeopleView show=.../>`. **This is the touchiest file** (matrix iterates `episodes × judges`, two stacked `<VoteChip>` per cell); one `episodesForShow(show)`/`rosterForShow(show)` filter at the top cascades correctly through everything.
- `src/components/EpisodeDetail.astro` (props `episode`, derives show + neighbors) — the episode `<article>` + `<Layout>`.
- `src/components/QueenProfile.astro` (props `queen`, derives show) — the judge `<article>` + `<Layout>`.
- The home pages (`index.astro`, `hostcall/index.astro`) are bespoke (LAST CALL is rich editorial; HOSTCALL is a coming-soon hero) but filter queries to their show.

Non-HTML endpoints (`/rss.xml`, `/search-index.json`) are **combined across both shows** (per-item show facet + brand-prefixed titles + per-show URLs). `/404`, `/about/` shared. There is still **no `/cinderellas/` route, and no `/episodes/` or `/queens/` list index**. The nav has two top-level items (`出演者・審査一覧`, `このサイトについて`) plus a **show switcher** (SSR `<a>` segments in `Layout` header + mobile nav; active segment uses `bg-[var(--color-gold)]`).

### SEO, discovery & search

- **Structured data**: `src/components/StructuredData.astro` injects JSON-LD via Layout's `<slot name="head" />` (place it as `<StructuredData slot="head" schema={...} />` inside a page). Wired: `WebSite` (home), `VideoObject` (episode), `Person` (queen). Layout auto-emits `BreadcrumbList` from the `breadcrumbs` prop. **Never put pass/fail, scores, or vote outcomes in JSON-LD** — it would spoil search results.
- **Sitemap/RSS**: `@astrojs/sitemap` integration (`astro.config.mjs`) → `sitemap-index.xml`; `robots.txt` points to it. `/rss.xml` lists episodes by `airedAt` desc, **titles + dates only** (no results).
- **Icons/OGP**: `public/favicon.svg` + `public/og-default.png` (1200×630, regenerate with sharp from an inline SVG). Layout defaults `ogImage` to og-default; episode pages override with the YouTube thumb.
- **Absolute URLs**: use `absUrl()` in `src/lib/url.ts` for JSON-LD / feeds (host + base path).
- **Breadcrumbs**: pass `breadcrumbs={[{ label, href? }]}` to `<Layout>`; it prepends ホーム, renders the visual nav, and generates the matching `BreadcrumbList`. Wired on episode/queen detail pages.
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
- Per-vote `comment` no longer exists. Any remaining free-text that reveals story (cinderella `background`, episode `summary`) must be wrapped in `.lc-occluded[data-occlusion="block"]` (`data-spoiler-level="comment"`), never shown via a raw `title=`/`aria-label=` tooltip.
- Verify changes in all three modes (`hidden` / `results-only` / `shown`) × JS on/off before committing.

Legacy `.spoiler` / `.spoiler-block` / `.show-spoilers` class names are kept as backwards-compatibility aliases (CSS will at least hide their text), but new code must use `.lc-occluded`.

### `EpisodeCard` and `PersonCard` are the visual language

`src/components/EpisodeCard.astro` and `src/components/PersonCard.astro` are the reusable card shells used on home, `/people/`, prev/next nav. They both rely on the `.card` utility in `globals.css` for the hover ring and consistent surface elevation. Don't ship one-off card markup — extend these.

`EpisodeCard` supports three `variant`s: `"default"` (image-led grid card), `"feature"` (large image + side panel, used for the latest episode hero), and `"compact"` (small thumb + text, used for prev/next nav). `PersonCard` exposes a named `signature` slot for embedding a `<DivergingBar>` or `<VoteSignature>` strip (e.g., on the queens list).

`PersonCard` also takes an optional **`avatar`** prop — a discriminated union `{ instagram: string } | { initial: string }` — rendering a 48px circular avatar at the card's top-left. On `/people/` (`PeopleView.astro`) both cinderella and queen cards pass `sns.instagram ? { instagram } : { initial: Array.from(name)[0] ?? "?" }`: performers **with** Instagram get the **Instagram glyph linking to their profile** (`target="_blank" rel="noopener nofollow"`), those **without** fall back to a **name-initial monogram**. Both variants are styled with `var(--color-gold)`/`var(--color-gold-glow)` so they auto-recolor gold→platinum per `data-show`. This gives a "profile icon" affordance that points at the performer's real (externally hosted) profile **without the site hosting/hotlinking any photo** — the only legally-safe option given the 著作権/肖像権/パブリシティ権 guardrail below (cropping YouTube thumbnails was tried and dropped — the show's thumbnails are busy title-card graphics that read as clutter at avatar size). The IG-link variant **is** `relative z-10` (an independent `<a>`, sitting above the card-wide `<a>::before` overlay like `SnsLinks`), and when it renders, PersonCard **strips `instagram` from the bottom `SnsLinks` row** (`snsForLinks`) to avoid showing IG twice. The monogram variant carries no spoiler markup (`aria-hidden`).

The matrix in `src/pages/people.astro` is a hand-rolled `<table>` with `position: sticky` on the left two columns. When changing the schema, the matrix is the most touchy place because it iterates `episodes × queens` and renders **two stacked `<VoteChip>` per cell** (上=ファーストコール / 下=最終ジャッジ).

### Vote visualization primitives — always reuse these

When showing vote data anywhere, use these shared primitives in `src/components/` (all wire through the v2 payload-first occlusion automatically):

- **`VoteChip.astro`** — single round chip for one queen × one round. **固定幅の角丸テキスト pill**（丸ではない。値で幅が変わると非表示プレートの横幅で結果が漏れるため、各 `size` は値非依存の固定幅）: gold = `LIKE`/`合格`, dark gray = `NOTHING`(NO)/`不合格`, dashed = `UNKNOWN`(?). ラベルは語そのもの（`LIKE`/`NO`/`合格`/`不合格`）。`VoteValue = "LIKE" | "NOTHING" | "合格" | "不合格" | "UNKNOWN"`. Use `size: "xs" | "sm" | "md" | "lg"` and `round` for aria. `spoiler={false}` for legends.
- **`VoteSignature.astro`** — horizontal strip of chips for one axis. Use `forQueen` for the per-queen time-series fingerprint (episodes where she's in the lineup), `forEpisode` for the lineup row. Set `round: "first" | "final" | "both"`.
- **`DivergingBar.astro`** — pass/fail tally as a center-axis horizontal bar (gold right, dark gray left). Use anywhere a "X 票 vs Y 票" count appears. Auto-handles the `合格率 %` label.
- **`StatCard.astro`** — large numeric stat with eyebrow + sublabel (used in season-averages dashboards on queen profiles and the matrix banner).
- **`SpoilerBadge.astro`** — pass/fail pill badge (variants: `pill`, `pill-large`, `pill-mini`, `feature`). Use for any "合格 / 不合格" outcome chip on cards, hero, episode header, matrix cells.

Whenever you'd otherwise hand-roll a "pass count / fail count" inline span or a tally table, reach for `DivergingBar` + `StatCard` instead. Hand-rolled inline tallies have been deleted — re-introducing them creates visual drift and bypasses spoiler protection.

### 3-tier spoiler granularity

The spoiler system has three states:

1. `spoilers-hidden` (default) — every `.lc-occluded` element is shown as a neutral placeholder.
2. `spoilers-results-only` — only elements with `data-spoiler-level="result"` are occluded (合否 / pass-fail verdicts). Individual votes (`"vote"`) and free-text (`"comment"` = cinderella `background` / episode `summary`) are hydrated to their real values. This is for the "I want to see who appeared and how each queen voted but not the final verdict" persona.
3. `spoilers-shown` — all `.lc-occluded` are hydrated to their real values.

Annotation conventions on the element:
- `data-spoiler-level="result"` — pass/fail badges, "合格率 X%", overall verdict bars, cinderella `result` badges, per-episode aggregate counts.
- `data-spoiler-level="vote"` — individual `<VoteChip>` and per-round tallies (per-queen season averages).
- `data-spoiler-level="comment"` — cinderella `background` and episode `summary` text.
- No `data-spoiler-level` = treated as `"vote"`.

Each `.lc-occluded` also carries `data-occlusion` to tell the CSS which neutralization shape to apply:
- `data-occlusion="chip"` — round single-token badge (`VoteChip`, `SpoilerBadge`)
- `data-occlusion="bar"`  — horizontal diverging bar (`DivergingBar`)
- `data-occlusion="text"` — inline numeric / single-line text (`StatCard` value, `DivergingBar` label, tally counts)
- `data-occlusion="block"` — paragraph (cinderella `background`, episode `summary`)

The state class lives on `<html>` (`spoilers-hidden` / `spoilers-results-only` / `spoilers-shown`). Storage key is `lc-spoilers` with value `"hidden" | "results-only" | "shown"`. Toggle UI is a 3-button segmented control in `Layout.astro` header. `.show-spoilers` is kept as a legacy alias of `spoilers-shown`.

### Design system in globals.css

Token-driven dark theme using Material/HIG-aligned elevation (`--color-bg` < `--color-surface` < `--color-card` < `--color-raised`) plus gold accent. Three typography utilities:

- `.eyebrow` — gold uppercase tracked kicker
- `.section-eyebrow` — muted uppercase kicker with a hairline rule before it (used for in-page section headings)
- `.font-display-serif` — Noto Serif JP for editorial display text (hero, page titles, card titles)

Stick to these for any new headings instead of inventing new heading styles. Backwards-compat aliases `--color-bg-elevated` / `--color-bg-card` exist for older markup but new code should use the canonical names.

Note: `--color-fail` は意図的にグレー（`#4a4a52`）であり赤ではない。NOTHING / 不合格 バッジが赤系に見えないのは仕様で、鮮やかな赤を避けることでゴールド（LIKE / 合格）とのコントラストを保っている。「失敗 = 赤」の直感で塗り替えないこと。

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

- **No AI-generated prose.** The schema retains `summary` (episode) / `background` (cinderella) as optional, but historical entries were removed because paraphrases from aggregator sites introduced factual drift. Only re-add these fields with verified, citable text — never let me speculatively summarize an unseen episode. (`bio` and per-episode `sources` were removed entirely.)
- **No performer photos.** Only YouTube thumbnails (program-issued) and YouTube embed iframes. Hosting Instagram/personal photos infringes 著作権 + 肖像権 + パブリシティ権 simultaneously — this was researched and ruled out. SNS links only.
- **新エピソード追加手順**: edit the single file `src/data/lastcall.json` — append one `episodes[]` entry with an **embedded `cinderella` object** (`name` + `result` 合否 + sns…), a `lineup` of審査員の slug, and `votes` (first: LIKE/NOTHING, final: 合格/不合格), then push to `main`. Schema violation fails the build before deploy. 審査員ごとに最大2票（`round: "first"` と `"final"`）。lineup に入れたが票未記録は `UNKNOWN` 表示。**`npm run edit` の GUI エディタ推奨**（ラインナップをチェックして票を選ぶだけ）。詳細手順は `MAINTENANCE.md`。
- **HOSTCALL データ投入手順**: same file, but add **`"show": "hostcall"`** to each new `episodes[]` entry AND to each new host added to `queens[]` (LAST CALL entries omit `show` and default to lastcall). Episode `id`s / host `slug`s **must not collide** with any LAST CALL id/slug (single collection). The GUI editor has no `show` picker yet but **preserves** a manually-added `show` field on save, so: hand-add `"show":"hostcall"` in the JSON, then use `npm run edit` for lineup/votes. Once data exists, `/hostcall/episodes/[id]/` and `/hostcall/hosts/[slug]/` emit automatically and recolor to platinum.
- **YouTube metadata via yt-dlp**: when batch-importing episode info, `uv tool install yt-dlp` and run `yt-dlp --flat-playlist --no-warnings --print "%(id)s|%(title)s|%(upload_date)s" "https://www.youtube.com/playlist?list=PLyVYYMYzNpmC183bSMhXXo04dhzYUEebI"` against the official playlist.


---

## 補足（親インデックス `../CLAUDE.md` から移行、2026-07-14）

Astro 5, TypeScript, Tailwind v4, GitHub Pages 静的サイト。

YouTube配信中のオーディション番組「LAST CALL」の各回・出演者（シンデレラ）・各回の出演クイーン（回ごと可変）の投票結果をまとめる非公式ファンサイト。

```bash
npm install
npm run dev        # http://localhost:4321/lastcall-fansite/
npm run build      # dist/ に静的ファイル生成
npm run typecheck  # astro check
```

**データ管理**: 手動JSON。**全データは単一ファイル `src/data/lastcall.json`**（`queens`/`episodes` の2配列。シンデレラは各エピソードに埋め込み、出演クイーンは `episode.lineup` で回ごと指定）。`src/content.config.ts` の inline loader が2コレクションに分配（Zodスキーマ検証）。票はファースト=LIKE/NOTHING・最終=合格/不合格。`npm run edit` でGUI編集→「ファイルに保存」が楽。実務手順は `lastcall-fansite/MAINTENANCE.md`。

**Gotcha**: PersonCardのカード全体クリック領域は `<a>::before` のオーバーレイで実現している（SNSリンクとのネスト `<a>` 回避のため）。Tailwind v4 のViteプラグインは型不一致があるため `astro.config.mjs` で `any` キャスト済。
