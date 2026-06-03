# メンテナンス運用ガイド

LAST CALL 非公式ファンサイトの**データ実務手順**。
エピソード追加も票（ファースト/最終）も出演ラインナップも SNS も、
**編集するのは単一ファイル [`src/data/lastcall.json`](./src/data/lastcall.json) だけ**。

> 設計思想・スキーマ・スポイラー保護などの**仕組み**は [`CLAUDE.md`](./CLAUDE.md) を参照。
> こちらは「実際に手を動かす手順」に絞る。

## GUIエディタ（推奨）

生JSONを手で書く代わりに、ブラウザで編集できるローカルツールがある。**`npm run edit` 推奨**:

```bash
npm run edit
```

ローカルサーバが起動してブラウザが開き、**`src/data/lastcall.json` が自動で読み込まれる**。

1. タブは **エピソード / クイーン** の2つ。
2. エピソードを選ぶ（または「＋新規エピソード」、id 自動採番）。
   - **YouTube**: youtubeId を入れると title / airedAt を自動取得（サムネ表示）。
   - **シンデレラ**: name・年齢・**合否（合格 / 不合格）**・SNS をその場で入力（エピソードに埋め込み）。
   - **出演ラインナップ & 票**: クイーン一覧の**チェックで出演を選び**、出演クイーンに
     ファースト（LAST CALL / NOTHING）と最終（合格 / 不合格）を選ぶ。色分け表示。
3. **「ファイルに保存」**ボタンで `src/data/lastcall.json` に直接書き戻し。
4. `npm run build` → push。

> **ファイルを直接ダブルクリック（`file://`）**だとブラウザ制限で自動読み込み・直接保存ができない。
> その場合は「JSONを読み込み」で手動選択 →「ダウンロード」で差し替え。`npm run edit` ならこの制限はない。

## データファイルの構造

`src/data/lastcall.json` は **2 つ**のトップレベル配列を持つ（`src/content.config.ts` の inline loader が2コレクションに分配）。
**シンデレラは各エピソードに埋め込み**（独立配列は無い）。

```json
{
  "queens":   [ /* 全クイーンのマスタ。slug + プロフィール + sns(+storeUrl) */ ],
  "episodes": [ /* 各回。id + メタ + cinderella(埋め込み) + lineup + votes */ ]
}
```

- **`slug`**（queens）と **`id`**（episodes）が参照キー兼 URL スラッグ。
  - episode の `lineup[]` と `votes[].queen` は queen の `slug` を指す。
  - 1 文字でも誤ると `npm run build` が落ちる（＝検証になる）。
- **票の値**: ファースト = `LAST CALL` / `NOTHING`、最終 = `合格` / `不合格`。
- **合否**（番組としての結果）は `episode.cinderella.result`（`"pass"` / `"fail"`）。
- **検証はビルド**: `npm run build`（または `npm run typecheck`）。

---

## 新エピソードを手書きで追加する（GUIを使わない場合）

`episodes[]` に1エントリ追加するだけ。

```json
{
  "id": "020",
  "title": "（YouTubeの動画タイトル）",
  "airedAt": "2026-06-06",
  "youtubeId": "（watch?v= の後ろ）",
  "cinderella": {
    "name": "山田はなこ",
    "age": 25,
    "result": "fail",
    "sns": { "instagram": "https://www.instagram.com/xxxx/" }
  },
  "lineup": ["airi", "kisaragi-rei", "neomaru"],
  "votes": [
    { "queen": "airi",         "round": "first", "vote": "LAST CALL" },
    { "queen": "kisaragi-rei", "round": "first", "vote": "NOTHING" },
    { "queen": "airi",         "round": "final", "vote": "合格" },
    { "queen": "kisaragi-rei", "round": "final", "vote": "不合格" }
  ]
}
```

- `cinderella` は**埋め込みオブジェクト**（旧 cinderellas 配列は廃止）。`result` が番組の合否。
- `lineup` = その回に出演したクイーンの slug。**ここに無いクイーンはそのエピソードに出ない**。
- `votes` は lineup のクイーンのみ。票の取れたラウンドだけでも可（未記録は `UNKNOWN` 表示）。
- 完全な実例は `episodes` の id `001` / `003` / `019`（14名ラインナップ＋全票）。

## SNS リンク運用

- **クイーンの SNS** → `queens[].sns`（`instagram` / `x` / `tiktok` / `youtube` / `website`、フルURL）。店舗URLは `storeUrl`。
- **シンデレラの SNS** → `episodes[].cinderella.sns`。
- **本人公式のみ・写真は載せずリンクのみ・確証が無ければ空**（CLAUDE.md の規約）。

---

## 欠落チェックリスト（スナップショット: 2026-06-03）

> スナップショット。最新は末尾のコマンドで再生成。

### 出演ラインナップ・票が未入力のエピソード（14 本）

- [ ] 002 / 004 / 005 / 006 / 007 / 008 / 009 / 010 / 012 / 013 / 014 / 015 / 017 / 018

（入力済み: 001 / 003 / 019）

### SNS 欠落クイーン（2 名）

- [ ] nijiho
- [ ] runa

### SNS 欠落シンデレラ（埋め込み・回で指定）

001 / 002 / 003 / 004 / 005 / 006 / 007 / 008 / 014 / 017 / 018 / 019（の各 `cinderella.sns` が空）

### 再生成コマンド（`jq`）

```bash
# 出演ラインナップ未入力のエピソード id
jq -r '.episodes[] | select((.lineup // []) | length == 0) | .id' src/data/lastcall.json

# SNS が空のクイーン slug
jq -r '.queens[] | select((.sns // {}) | length == 0) | .slug' src/data/lastcall.json

# cinderella の SNS が空のエピソード id
jq -r '.episodes[] | select((.cinderella.sns // {}) | length == 0) | .id' src/data/lastcall.json
```
