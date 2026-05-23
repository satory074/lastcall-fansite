# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

非公式 (unofficial) fan archive for the YouTube audition show **LAST CALL (ラストコール)**. The site indexes every aired episode, each shinderella (志願者), the fixed 14 judges, and each judge's per-episode vote across two rounds (ファーストコール → 最終ジャッジ; LAST CALL / NOTHING / NO CALL). Live at https://satory074.github.io/lastcall-fansite/.

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
| `episodes` | `src/content/episodes/NNN.json` | YouTube ID, title, airedAt, `cinderella: reference("cinderellas")`, `votes: { judge: reference("judges"), round, vote, comment }[]` |
| `cinderellas` | `src/content/cinderellas/<slug>.json` | name, age, episodeId, `result: "pass" \| "fail"`, sns |
| `judges` | `src/content/judges/<slug>.json` | name, age, area, store, sns (the 14 fixed judges) |

The reference graph is **episode → cinderella + votes[].judge**. When editing a JSON, the file id (its basename without extension) is the reference key. Examples: `cinderella: "fukuda-aika"` looks for `src/content/cinderellas/fukuda-aika.json`.

Vote details for individual judges are currently empty in most episodes (`votes: []`). The schema accepts `vote: "LAST CALL" | "NOTHING" | "NO CALL" | "ABSENT"` and `round: "first" | "final"` (defaults to `"final"` when omitted). The site treats `votes: []` as "未確認 (unrecorded)" per-judge — see VoteTable below.

### Two-round vote model (ファーストコール / 最終ジャッジ)

Each judge × episode can have up to two votes — one per `round`. **ファーストコール (`"first"`)** is the mid-program preliminary vote; **最終ジャッジ (`"final"`)** is the binding pass/fail vote. Pass/fail tallies and the binary 合格/不合格 verdict are derived **from the final round only**; first-round votes are shown as context but do not affect the result. JSON example:

```json
"votes": [
  { "judge": "aizawa-emiri", "round": "first", "vote": "LAST CALL", "comment": "..." },
  { "judge": "aizawa-emiri", "round": "final", "vote": "NOTHING" }
]
```

### Aggregation rule: 合格率タリーは「最終ジャッジ」のみ

3ヶ所すべての集計表示が共通ルールに従う:

- **VoteTable** (`src/components/VoteTable.astro`): ラウンド別タリーカード 2 枚（LC / NOTHING / NO CALL / 欠席 / 未確認）+ 「ファースト→最終で判定を変えた審査員 N 名」
- **マトリクス** (`src/pages/people.astro`): 上部に全体集計バナー、末尾に `<tfoot>` 累計行（審査員別 LC / NOTHING(+NO CALL)）
- **審査員プロフィール** (`src/pages/judges/[slug].astro`): ラウンド別タリーカード + 「合格率 X%（Y / Z）」+ 判定変更回数

合格率・合否は **`round === "final"` の票のみで集計**。ファーストコールはコンテキスト情報として表示するだけで結果には影響させない。新たな集計表示を追加するときもこの規約に従うこと。

### Per-episode page renders the full cast even without vote data

`src/components/VoteTable.astro` always enumerates **all 14 judges from the `judges` collection** and shows **two columns** per judge (ファーストコール / 最終ジャッジ). Missing entries in either round render an `UNKNOWN` placeholder badge. This means each episode page shows the complete jury panel × two rounds even when nobody has watched the episode to record individual votes yet.

The displayed final verdict (合格/不合格) falls back to `cinderella.data.result` when no final-round vote tallies are present — `<VoteTable cinderellaResult={cinderella?.data.result}>` is the wiring.

### Pages are deliberately consolidated

After several iterations, the routes are:

- `/` — hero + Latest Episode (feature card) + All Episodes grid (`#episodes` anchor)
- `/episodes/[id]/` — detail page (video + cinderella + 14-judge vote table + sources + prev/next nav)
- `/people/` — unified Cinderellas + Judges + **voting matrix** (`episodes.length × judges.length` grid, sticky left columns, `<tfoot>` aggregate row)
- `/cinderellas/[slug]/`, `/judges/[slug]/` — individual profile detail pages (no list index)
- `/about/` — disclaimer, spoiler-toggle docs, deletion request policy

There is no `/episodes/` index or `/cinderellas/` index or `/judges/` index. The nav has only two top-level items: `出演者・審査一覧` and `このサイトについて`. Do not re-add those index pages; the home page and `/people/` cover them.

### Spoiler protection is a site-wide concern

Many users land here without having seen recent episodes. Anything that reveals an outcome must be marked with `.spoiler` (inline blur) or `.spoiler-block` (text block blur). The behavior is in `src/components/Layout.astro`:

1. Inline `<head>` script reads `localStorage["lc-spoilers"]` and adds `show-spoilers` to `<html>` before paint (no flash).
2. A header toggle button (id `lc-spoiler-toggle`) flips the class and persists choice.
3. Bottom script also handles **per-element reveal** — clicking any `.spoiler` adds `.spoiler-revealed` so just that block shows.

When adding any new result badge, vote count, pass/fail tally, or text that includes the outcome, **annotate the element with `.spoiler`** (small inline) or `.spoiler-block` (paragraph/comment). CSS lives in `src/styles/globals.css`.

### `EpisodeCard` and `PersonCard` are the visual language

`src/components/EpisodeCard.astro` and `src/components/PersonCard.astro` are the reusable card shells used on home, `/people/`, prev/next nav. They both rely on the `.card` utility in `globals.css` for the hover ring and consistent surface elevation. Don't ship one-off card markup — extend these.

The matrix in `src/pages/people.astro` is a hand-rolled `<table>` with `position: sticky` on the left two columns. When changing the schema, the matrix is the most touchy place because it iterates `episodes × judges` and renders **two stacked vote-token badges** per cell (上=ファーストコール / 下=最終ジャッジ).

### Design system in globals.css

Token-driven dark theme using Material/HIG-aligned elevation (`--color-bg` < `--color-surface` < `--color-card` < `--color-raised`) plus gold accent. Three typography utilities:

- `.eyebrow` — gold uppercase tracked kicker
- `.section-eyebrow` — muted uppercase kicker with a hairline rule before it (used for in-page section headings)
- `.font-display-serif` — Noto Serif JP for editorial display text (hero, page titles, card titles)

Stick to these for any new headings instead of inventing new heading styles. Backwards-compat aliases `--color-bg-elevated` / `--color-bg-card` exist for older markup but new code should use the canonical names.

Note: `--color-fail` は意図的にグレー（`#4a4a52`）であり赤ではない。NOTHING / NO CALL バッジが赤系に見えないのは仕様で、鮮やかな赤を避けることでゴールドの合格表現とのコントラストを保っている。「失敗 = 赤」の直感で塗り替えないこと。

### URL helper handles the GitHub Pages base path

`src/lib/url.ts` exports `siteLink()` / `youtubeUrl()` / `youtubeThumb()`. Always use `siteLink("/foo/")` for internal links — Astro is configured with `base: "/lastcall-fansite"` in `astro.config.mjs`, and hard-coding `/foo/` paths breaks in production while working in dev.

### Deployment

`.github/workflows/deploy.yml` builds on push to `main` and deploys to GitHub Pages via `actions/deploy-pages@v4`. The workflow sets `GH_USER=${{ github.repository_owner }}` so the canonical `site:` URL is derived from the repo owner rather than hardcoded. If you fork or rename the repo, also update `repoName` in `astro.config.mjs`.

## Content authoring guardrails

These are project-specific, not generic rules:

- **No AI-generated prose.** The schema retains `summary` / `background` / `bio` as optional, but historical entries were removed because paraphrases from aggregator sites introduced factual drift. Only re-add these fields with verified, citable text — never let me speculatively summarize an unseen episode.
- **No performer photos.** Only YouTube thumbnails (program-issued) and YouTube embed iframes. Hosting Instagram/personal photos infringes 著作権 + 肖像権 + パブリシティ権 simultaneously — this was researched and ruled out. SNS links only.
- **新エピソード追加手順**: create `src/content/episodes/NNN.json` + `src/content/cinderellas/<slug>.json`, reference the cinderella from the episode's `cinderella` field, push to `main`. Schema violation fails the build before deploy. 票データを入れる際は各審査員 × 2 票（`round: "first"` と `"final"`）が原則。記録の取れたラウンドだけ部分的に入れても OK（未記載は `UNKNOWN` 表示）。
- **YouTube metadata via yt-dlp**: when batch-importing episode info, `uv tool install yt-dlp` and run `yt-dlp --flat-playlist --no-warnings --print "%(id)s|%(title)s|%(upload_date)s" "https://www.youtube.com/playlist?list=PLyVYYMYzNpmC183bSMhXXo04dhzYUEebI"` against the official playlist.
