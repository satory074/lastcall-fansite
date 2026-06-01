import { getCollection } from "astro:content";
import { siteLink } from "../lib/url";

// クライアント検索用の軽量インデックス。
// スポイラー配慮: 合否・投票・コメントは一切含めず、名前・回・属性のみ。
type Item = {
  type: "episode" | "cinderella" | "judge";
  label: string;
  sub: string;
  url: string;
  terms: string;
};

export async function GET() {
  const [episodes, cinderellas, judges] = await Promise.all([
    getCollection("episodes"),
    getCollection("cinderellas"),
    getCollection("judges"),
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
  }

  for (const c of cinderellas) {
    items.push({
      type: "cinderella",
      label: c.data.name,
      sub: `第${c.data.episodeId}回 出演`,
      url: siteLink(`/cinderellas/${c.id}/`),
      terms: `${c.data.name} ${c.id}`.toLowerCase(),
    });
  }

  for (const j of judges) {
    const sub = [j.data.area, j.data.store].filter(Boolean).join(" · ");
    items.push({
      type: "judge",
      label: j.data.name,
      sub: sub || "審査員",
      url: siteLink(`/judges/${j.id}/`),
      terms: `${j.data.name} ${j.data.nameKana ?? ""} ${j.data.area ?? ""} ${j.data.store ?? ""} ${j.id}`.toLowerCase(),
    });
  }

  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json" },
  });
}
