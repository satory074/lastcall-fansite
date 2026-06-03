import { getCollection } from "astro:content";
import { siteLink } from "../lib/url";

// クライアント検索用の軽量インデックス。
// スポイラー配慮: 合否・投票・コメントは一切含めず、名前・回・属性のみ。
type Item = {
  type: "episode" | "cinderella" | "queen";
  label: string;
  sub: string;
  url: string;
  terms: string;
};

export async function GET() {
  const [episodes, queens] = await Promise.all([
    getCollection("episodes"),
    getCollection("queens"),
  ]);

  const items: Item[] = [];

  for (const ep of episodes) {
    const clean = ep.data.title.replace(/【LAST.*$/, "").trim();
    items.push({
      type: "episode",
      label: `第${ep.data.id}回 ${clean}`,
      sub: ep.data.airedAt.toISOString().slice(0, 10),
      url: siteLink(`/episodes/${ep.data.id}/`),
      terms: `${ep.data.id} ${ep.data.title} ${clean}`.toLowerCase(),
    });
    // シンデレラはエピソードに埋め込み。検索ヒット先はエピソードページ。
    const c = ep.data.cinderella;
    items.push({
      type: "cinderella",
      label: c.name,
      sub: `第${ep.data.id}回 出演`,
      url: siteLink(`/episodes/${ep.data.id}/`),
      terms: `${c.name} ${ep.data.id}`.toLowerCase(),
    });
  }

  for (const j of queens) {
    items.push({
      type: "queen",
      label: j.data.name,
      sub: j.data.store || "クイーン",
      url: siteLink(`/queens/${j.id}/`),
      terms: `${j.data.name} ${j.data.nameKana ?? ""} ${j.data.store ?? ""} ${j.id}`.toLowerCase(),
    });
  }

  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json" },
  });
}
