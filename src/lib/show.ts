import { getCollection, type CollectionEntry } from "astro:content";
import { siteLink, absUrl } from "./url";

/**
 * 番組（show）次元の単一の真実。
 * LAST CALL（キャバ嬢オーディション, ゴールド）と HOSTCALL（ホストオーディション, プラチナ）を
 * 1 つのデータ層（queens / episodes コレクション）で扱うためのラベル・パス・整形をここに集約する。
 * ラベルは show から導出（ロスター側に持たせない）。色は globals.css の [data-show] スコープが担う。
 */
export type Show = "lastcall" | "hostcall";
export const SHOWS: Show[] = ["lastcall", "hostcall"];
export const DEFAULT_SHOW: Show = "lastcall";

export interface ShowMeta {
  key: Show;
  /** 表示ブランド名 */
  brand: string;
  /** 中黒ドットで分割するロックアップ用（["LAST","CALL"] → LAST·CALL） */
  brandParts: [string, string];
  /** ロスター（審査員）の呼称 */
  rosterLabel: string; // クイーン / ホスト
  rosterLabelEn: string; // Queens / Hosts
  /** 審査員プロフィールの URL セグメント */
  rosterPath: string; // queens / hosts
  /** 候補者（志願者）の呼称。1 回 = 1 候補者 */
  candidateLabel: string; // シンデレラ / 候補者
  candidateLabelEn: string; // Cinderellas / Challengers（節見出し・複数） */
  candidateTagEn: string; // Cinderella / Challenger（カード内・単数） */
  /** GitHub Pages base 配下のセクションプレフィックス（"" / "/hostcall"） */
  basePath: string;
  /** 公式サイト */
  officialUrl: string;
  /** 公式 YouTube（両番組共通チャンネル） */
  youtube: string;
  /** アクセント色の呼称（表示用） */
  accentLabel: string; // ゴールド / プラチナ
  /** 放送枠 */
  airDay: string;
  /** SEO/説明用の 1 行 */
  description: string;
}

export const SHOW_META: Record<Show, ShowMeta> = {
  lastcall: {
    key: "lastcall",
    brand: "LAST CALL",
    brandParts: ["LAST", "CALL"],
    rosterLabel: "クイーン",
    rosterLabelEn: "Queens",
    rosterPath: "queens",
    candidateLabel: "シンデレラ",
    candidateLabelEn: "Cinderellas",
    candidateTagEn: "Cinderella",
    basePath: "",
    officialUrl: "https://lastcall.jp/",
    youtube: "https://www.youtube.com/@LASTCALL_OFFICIAL",
    accentLabel: "ゴールド",
    airDay: "日曜 21:00",
    description:
      "YouTubeオーディション番組「LAST CALL（ラストコール）」の各回・出演者・投票結果をまとめる非公式ファンサイト。",
  },
  hostcall: {
    key: "hostcall",
    brand: "HOSTCALL",
    brandParts: ["HOST", "CALL"],
    rosterLabel: "ホスト",
    rosterLabelEn: "Hosts",
    rosterPath: "hosts",
    // TODO: 番組の正式呼称が判明したら差替（シンデレラ相当のホスト志願者）
    candidateLabel: "候補者",
    candidateLabelEn: "Challengers",
    candidateTagEn: "Challenger",
    basePath: "/hostcall",
    // TODO: HOSTCALL 専用 URL があれば差替（現状は共通の LAST CALL / チャンネル）
    officialUrl: "https://lastcall.jp/",
    youtube: "https://www.youtube.com/@LASTCALL_OFFICIAL",
    accentLabel: "プラチナ",
    airDay: "月曜 21:00",
    description:
      "YouTubeオーディション番組「HOSTCALL（ホストコール）」の各回・出演ホスト・投票結果をまとめる非公式ファンサイト。",
  },
};

/** show（未指定なら既定）に対応するメタを返す。 */
export function showMeta(show: Show | undefined): ShowMeta {
  return SHOW_META[show ?? DEFAULT_SHOW];
}

// ---- コレクションの show 別スライス ----
// 既存データは全て lastcall。schema の .default("lastcall") で show は必ず入るが、
// 後方互換のため ?? DEFAULT_SHOW で保険をかける。

export async function episodesForShow(
  show: Show
): Promise<CollectionEntry<"episodes">[]> {
  const all = await getCollection("episodes");
  return all.filter((e) => (e.data.show ?? DEFAULT_SHOW) === show);
}

export async function rosterForShow(
  show: Show
): Promise<CollectionEntry<"queens">[]> {
  const all = await getCollection("queens");
  return all.filter((j) => (j.data.show ?? DEFAULT_SHOW) === show);
}

// ---- 内部リンク（base path 込み） ----

export function homeHref(show: Show): string {
  return siteLink(`${SHOW_META[show].basePath}/`);
}
export function peopleHref(show: Show): string {
  return siteLink(`${SHOW_META[show].basePath}/people/`);
}
export function episodeHref(show: Show, id: string): string {
  return siteLink(`${SHOW_META[show].basePath}/episodes/${id}/`);
}
export function rosterHref(show: Show, slug: string): string {
  return siteLink(`${SHOW_META[show].basePath}/${SHOW_META[show].rosterPath}/${slug}/`);
}

// ---- 絶対 URL（JSON-LD / フィード用） ----

export function homeAbsUrl(show: Show): string {
  return absUrl(`${SHOW_META[show].basePath}/`);
}
export function episodeAbsUrl(show: Show, id: string): string {
  return absUrl(`${SHOW_META[show].basePath}/episodes/${id}/`);
}
export function rosterAbsUrl(show: Show, slug: string): string {
  return absUrl(`${SHOW_META[show].basePath}/${SHOW_META[show].rosterPath}/${slug}/`);
}

/** タイトルから番組プレフィックス（【LAST...】/【HOST...】）を除去。 */
export function cleanTitle(title: string): string {
  return title.replace(/【(LAST|HOST).*$/, "").trim();
}
