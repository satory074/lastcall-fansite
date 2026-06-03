# メンテナンス運用ガイド

LAST CALL 非公式ファンサイトの**データ実務手順**。
票データ（ファーストコール / 最終ジャッジ）も SNS リンクもエピソード追加も、
**編集するのは単一ファイル [`src/data/lastcall.json`](./src/data/lastcall.json) だけ**。

> 設計思想・スキーマ・スポイラー保護などの**仕組み**は [`CLAUDE.md`](./CLAUDE.md) を参照。
> こちらは「実際に手を動かす手順」に絞る。

## GUIエディタ（手打ちが面倒な人向け）

生JSONを手で書く代わりに、ブラウザで編集できるローカルツールがある。**`npm run edit` 推奨**:

```bash
npm run edit
```

ローカルサーバが起動してブラウザが開き、**`src/data/lastcall.json` が自動で読み込まれる**。

1. タブ（エピソード / シンデレラ / クイーン）で編集。**票は14クイーン×2ラウンドのドロップダウン表**で入力でき、slug 手打ち不要。新エピソードは id を自動採番。
2. **「ファイルに保存」**ボタンで `src/data/lastcall.json` に直接書き戻し（ダウンロード→移動の手間なし）。
3. `npm run build` → push。

出力は元ファイルと同じ整形なので、未編集箇所は差分ゼロ。手書き・GUIどちらでも同じ結果になる。

> **ファイルを直接ダブルクリックで開いた場合**（`file://`）はブラウザの制限で自動読み込み・直接保存ができない。
> その場合は「JSONを読み込み」で手動選択 →「ダウンロード」で書き出して差し替える。`npm run edit` ならこの制限はない。

## データファイルの構造

`src/data/lastcall.json` は 3 つのトップレベル配列を持つ。`src/content.config.ts` の inline loader が
この 1 ファイルを 3 つの Content Collection（queens / cinderellas / episodes）へ分配する。

```json
{
  "queens":      [ /* 固定14名。slug + プロフィール + sns */ ],
  "cinderellas": [ /* 各回の志願者。slug + プロフィール + result + sns */ ],
  "episodes":    [ /* 各回。id + メタ + votes + sources */ ]
}
```

- **`slug`**（queens / cinderellas）と **`id`**（episodes）が、その人物・回を指す**参照キー兼 URL スラッグ**。
  - episode の `cinderella` は cinderella の `slug` を指す。
  - 票の `queen` は queen の `slug` を指す。
  - 1 文字でも誤ると参照が解決できず **`npm run build` が落ちる**（＝検証になる）。
- **検証はビルド**: `npm run build`（または `npm run typecheck`）が Zod スキーマを実行し、
  slug 誤り・enum 誤り・URL 形式違反はここで落ちる。デプロイ前に必ず通すこと。

---

## A. 票データ運用（ファーストコール / 最終ジャッジ）

### 概念

各エピソードの各クイーンには最大 2 票がある（`episodes[].votes` 配列に入れる）。

| `round` | 意味 | 集計への影響 |
|---------|------|--------------|
| `"first"` | ファーストコール（番組前半の暫定判定） | **集計しない**（コンテキスト表示のみ） |
| `"final"` | 最終ジャッジ（合否確定の最終判定） | 合否・合格率は**これだけ**で集計 |

`round` 省略時は `"final"` 扱い（後方互換）。集計規約の詳細は CLAUDE.md「合格率タリーは『最終ジャッジ』のみ」節。

### vote enum（4 値）

| 値 | 意味 |
|----|------|
| `LAST CALL` | 推す（合格票） |
| `NOTHING` | 推さない |
| `NO CALL` | 強い不可 |
| `ABSENT` | 欠席 |

`votes` に行が**無い**クイーンはサイト上で `UNKNOWN`（未確認）プレースホルダになる。
記録の取れたラウンドだけ部分入力でも OK（残りは UNKNOWN 表示）。

### 手順

1. 配信を視聴し、各クイーンの **first / final 2 ラウンド分**を記録する。
2. `src/data/lastcall.json` の `episodes` 配列から該当回（`"id": "NNN"`）を探し、その `votes` に下のスケルトンを貼る。
3. `npm run build` で検証。slug 誤り・enum 誤りはここで落ちる。
4. `comment` は任意（最終ジャッジの寸評など）。入れると VoteTable / マトリクスに反映される。

### コピペ用スケルトン（14クイーン × 2ラウンド = 28 票）

`episodes[].votes` にそのまま貼り、`vote` を実際の値に書き換える。slug は固定 14 名。`comment` は不要なら行ごと削る。

```json
  "votes": [
    { "queen": "airi",         "round": "first", "vote": "" },
    { "queen": "aizawa-emiri", "round": "first", "vote": "" },
    { "queen": "assun",        "round": "first", "vote": "" },
    { "queen": "himeka",       "round": "first", "vote": "" },
    { "queen": "kisaragi-rei", "round": "first", "vote": "" },
    { "queen": "minami-yuzu",  "round": "first", "vote": "" },
    { "queen": "momose-tomo",  "round": "first", "vote": "" },
    { "queen": "neomaru",      "round": "first", "vote": "" },
    { "queen": "nijiho",       "round": "first", "vote": "" },
    { "queen": "remiremi",     "round": "first", "vote": "" },
    { "queen": "runa",         "round": "first", "vote": "" },
    { "queen": "shingeki-noa", "round": "first", "vote": "" },
    { "queen": "yamatorino",   "round": "first", "vote": "" },
    { "queen": "yuipis",       "round": "first", "vote": "" },

    { "queen": "airi",         "round": "final", "vote": "" },
    { "queen": "aizawa-emiri", "round": "final", "vote": "" },
    { "queen": "assun",        "round": "final", "vote": "" },
    { "queen": "himeka",       "round": "final", "vote": "" },
    { "queen": "kisaragi-rei", "round": "final", "vote": "" },
    { "queen": "minami-yuzu",  "round": "final", "vote": "" },
    { "queen": "momose-tomo",  "round": "final", "vote": "" },
    { "queen": "neomaru",      "round": "final", "vote": "" },
    { "queen": "nijiho",       "round": "final", "vote": "" },
    { "queen": "remiremi",     "round": "final", "vote": "" },
    { "queen": "runa",         "round": "final", "vote": "" },
    { "queen": "shingeki-noa", "round": "final", "vote": "" },
    { "queen": "yamatorino",   "round": "final", "vote": "" },
    { "queen": "yuipis",       "round": "final", "vote": "" }
  ],
```

**参考実装**: `src/data/lastcall.json` の `episodes[0]`（id `001`）が comment 込みの完全な実例。迷ったらこれを見る。

> 固定 14 クイーンの slug は `queens` 配列の各 `slug` と一致する。
> クイーンが増減した場合はこのスケルトンも更新すること。

---

## B. SNS リンク運用（Instagram / TikTok / YouTube / X / website）

### 対応キーと形式

`src/content.config.ts` の `snsSchema` が定義。queens・cinderellas の各エントリの `sns` オブジェクトに入れる。

| キー | プラットフォーム |
|------|------------------|
| `instagram` | Instagram |
| `tiktok` | TikTok |
| `youtube` | YouTube |
| `x` | X (Twitter) |
| `website` | 公式サイト等 |

- **値は必ずフル URL**（例 `https://www.instagram.com/<user>/`）。URL 以外は Zod で落ちる。
- 上記以外のキーは追加不可。
- UI（`src/components/SnsLinks.astro`）は**値のあるキーだけ**自動でアイコン表示する。空キーは書かない。

### 掲載基準（プロジェクト規約・厳守）

- **本人公式アカウントのみ**。同名別人の誤掲載に注意。**最終確認は人間が行う**こと。
- SNS は**リンクのみ**。写真・画像の転載は禁止（著作権 / 肖像権 / パブリシティ権）。
  → CLAUDE.md「No performer photos」参照。
- 確証が取れないアカウントは**空のまま**にする。推測で埋めない。

### 手順

1. `src/data/lastcall.json` の `queens` または `cinderellas` 配列から対象を `slug` で探す。
2. その `sns` オブジェクトにキーと URL を追記。
   ```json
   "sns": {
     "instagram": "https://www.instagram.com/<user>/",
     "tiktok": "https://www.tiktok.com/@<user>",
     "youtube": "https://www.youtube.com/@<channel>"
   }
   ```
3. `npm run build` で URL 形式を検証。

TikTok / YouTube は現状ゼロだが、本人公式があれば同形式で追加可能（スキーマ・UI 対応済み）。

---

## C. 新エピソード追加手順

1. `src/data/lastcall.json` の `cinderellas` 配列に新しい志願者を追加（`slug` / `name` / `episodeId` / `result` / `sns`）。
2. `episodes` 配列に新しい回を追加（`id` / `title` / `airedAt` / `youtubeId` / `cinderella`=志願者の `slug` / `votes` / `sources`）。
3. 票が取れていれば A のスケルトンを `votes` に貼る（未記録なら `"votes": []` でも可、サイトは UNKNOWN 表示）。
4. `npm run build` → push（GitHub Actions が自動デプロイ）。

> YouTube メタデータの一括取得は CLAUDE.md「YouTube metadata via yt-dlp」を参照。

---

## D. 欠落チェックリスト（スナップショット: 2026-06-03）

> これは**スナップショット**。最新状態は末尾の `jq` を再実行して確認すること。
> 埋めたらチェックを付け、ズレてきたらコマンドで作り直す。

### 票未入力エピソード（14 本 / `votes: []`）

- [ ] 002
- [ ] 004
- [ ] 005
- [ ] 006
- [ ] 007
- [ ] 008
- [ ] 009
- [ ] 010
- [ ] 012
- [ ] 013
- [ ] 014
- [ ] 015
- [ ] 017
- [ ] 018

（入力済み: 001 / 003 / 019）

### SNS 欠落クイーン（2 名）

- [ ] nijiho
- [ ] runa

### SNS 欠落シンデレラ（11 名）

- [ ] 007-cinderella
- [ ] 017-cinderella
- [ ] 018-cinderella
- [ ] chisato
- [ ] emma
- [ ] fukuda-aika
- [ ] hayama-midori
- [ ] kobayashi-ryoka
- [ ] tameya-haruka
- [ ] toyoda-rika
- [ ] yoshihara-yumeji
- [ ] yuna

### TikTok / YouTube

全人物で未設定。本人公式があれば任意で追加（必須ではない）。

### 再生成コマンド（可視化用ワンライナー）

単一ファイルを `jq` で集計する。プロジェクトルートで実行（`jq` 未導入なら `brew install jq`）。

```bash
# 票未入力のエピソード id 一覧
jq -r '.episodes[] | select((.votes // []) | length == 0) | .id' src/data/lastcall.json

# SNS が 1 つも無い人物（queens + cinderellas）
jq -r '(.queens[], .cinderellas[]) | select((.sns // {}) | length == 0) | .slug' src/data/lastcall.json
```
