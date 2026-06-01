import { defineCollection, reference, z } from "astro:content";
import { glob } from "astro/loaders";

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
  loader: glob({ pattern: "**/*.json", base: "src/content/queens" }),
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
  loader: glob({ pattern: "**/*.json", base: "src/content/cinderellas" }),
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
  loader: glob({ pattern: "**/*.json", base: "src/content/episodes" }),
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
