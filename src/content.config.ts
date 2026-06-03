import { defineCollection, reference, z } from "astro:content";
import data from "./data/lastcall.json";

const snsSchema = z
  .object({
    x: z.string().url().optional(),
    instagram: z.string().url().optional(),
    tiktok: z.string().url().optional(),
    youtube: z.string().url().optional(),
    website: z.string().url().optional(),
  })
  .default({});

const queens = defineCollection({
  // 単一ファイル src/data/lastcall.json の queens 配列をスライス供給する inline loader。
  // 各エントリの slug を Astro エントリ id（= URL スラッグ / 参照キー）に割り当てる。
  loader: () => data.queens.map(({ slug, ...rest }) => ({ id: slug, ...rest })),
  schema: z.object({
    name: z.string(),
    nameKana: z.string().optional(),
    age: z.number().int().positive().optional(),
    area: z.string().optional(),
    store: z.string().optional(),
    storeUrl: z.string().url().optional(),
    bio: z.string().optional(),
    sns: snsSchema,
  }),
});

// シンデレラ（志願者）はエピソードに 1:1 で埋め込む（旧 cinderellas コレクションは廃止）。
const cinderellaSchema = z.object({
  name: z.string(),
  age: z.number().int().positive().optional(),
  background: z.string().optional(),
  result: z.enum(["pass", "fail"]), // エピソード全体の合否（合否セレクトで設定）
  sns: snsSchema,
});

const episodes = defineCollection({
  // episodes は各エントリが自前の id（"001" 等）を持つのでそのまま Astro エントリ id に使う。
  loader: () => data.episodes.map((e) => ({ ...e })),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    airedAt: z.coerce.date(),
    youtubeId: z.string(),
    summary: z.string().optional(),
    cinderella: cinderellaSchema,
    // 出演クイーンのラインナップ（回ごとに可変）。VoteTable / マトリクスはこれを列挙する。
    lineup: z.array(reference("queens")).default([]),
    votes: z
      .array(
        z.object({
          queen: reference("queens"),
          // ファーストコール = 番組前半の暫定票（LAST CALL / NOTHING）、
          // 最終ジャッジ = 合否確定票（合格 / 不合格）。round 未指定は最終扱い（後方互換）。
          round: z.enum(["first", "final"]).default("final"),
          vote: z.enum(["LAST CALL", "NOTHING", "合格", "不合格"]),
        })
      )
      .default([]),
    sources: z.array(z.string().url()).default([]),
  }),
});

export const collections = { queens, episodes };
