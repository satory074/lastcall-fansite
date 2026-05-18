# LAST CALL 非公式ファンサイト

[LAST CALL（ラストコール）](https://lastcall.jp/) の各回・出演者・投票結果をまとめる非公式ファンサイト。

## 開発

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # → dist/
npm run preview  # 本番ビルドのローカル確認
```

## データ更新

各回のJSONを追加・編集 → push（main） → GitHub Actions が自動デプロイ。

- `src/content/episodes/NNN.json` ：各回（YouTube ID、シンデレラ参照、14名の投票）
- `src/content/cinderellas/<slug>.json` ：シンデレラのプロフィールとSNS
- `src/content/judges/<slug>.json` ：審査員（固定14名）のプロフィールとSNS

スキーマは `src/content.config.ts` 参照。ビルド時にZodで検証される。

## 注意

本サイトは非公式のファンサイトです。番組・出演者・運営とは無関係です。
画像・動画は公式YouTubeの埋め込みのみ使用しています。
