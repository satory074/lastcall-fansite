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
    bio: z.string().optional(),
    sns: snsSchema,
  }),
});

const cinderellas = defineCollection({
  loader: () => data.cinderellas.map(({ slug, ...rest }) => ({ id: slug, ...rest })),
  schema: z.object({
    name: z.string(),
    age: z.number().int().positive().optional(),
    background: z.string().optional(),
    episodeId: z.string(),
    result: z.enum(["pass", "fail"]),
    sns: snsSchema,
  }),
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
    cinderella: reference("cinderellas"),
    votes: z
      .array(
        z.object({
          queen: reference("queens"),
          // ファーストコール = 番組前半の暫定判定、最終ジャッジ = 合否確定の最終判定。
          // round 未指定の票は最終ジャッジ扱い（後方互換）。
          round: z.enum(["first", "final"]).default("final"),
          vote: z.enum(["LAST CALL", "NOTHING", "NO CALL", "ABSENT"]),
          comment: z.string().optional(),
        })
      )
      .default([]),
    sources: z.array(z.string().url()).default([]),
  }),
});

export const collections = { queens, cinderellas, episodes };
