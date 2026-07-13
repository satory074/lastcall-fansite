import {
  SHOWS,
  SHOW_META,
  episodesForShow,
  rosterForShow,
  cleanTitle,
  episodeHref,
  rosterHref,
} from "../lib/show";

// クライアント検索用の軽量インデックス（両番組統合）。
// スポイラー配慮: 合否・投票・コメントは一切含めず、名前・回・属性のみ。
// typeLabel は show 由来の表示ラベル（シンデレラ/候補者・クイーン/ホスト）を先解決して持たせる。
type Item = {
  type: "episode" | "cinderella" | "queen";
  show: "lastcall" | "hostcall";
  typeLabel: string;
  label: string;
  sub: string;
  url: string;
  terms: string;
};

export async function GET() {
  const items: Item[] = [];

  for (const show of SHOWS) {
    const meta = SHOW_META[show];
    const [episodes, queens] = await Promise.all([
      episodesForShow(show),
      rosterForShow(show),
    ]);

    for (const ep of episodes) {
      const clean = cleanTitle(ep.data.title);
      items.push({
        type: "episode",
        show,
        typeLabel: "回",
        label: `第${ep.data.id}回 ${clean}`,
        sub: `${meta.brand} · ${ep.data.airedAt.toISOString().slice(0, 10)}`,
        url: episodeHref(show, ep.data.id),
        terms: `${ep.data.id} ${ep.data.title} ${clean} ${meta.brand}`.toLowerCase(),
      });
      // 候補者はエピソードに埋め込み。検索ヒット先はエピソードページ。
      const c = ep.data.cinderella;
      items.push({
        type: "cinderella",
        show,
        typeLabel: meta.candidateLabel,
        label: c.name,
        sub: `${meta.brand} 第${ep.data.id}回 出演`,
        url: episodeHref(show, ep.data.id),
        terms: `${c.name} ${ep.data.id} ${meta.brand}`.toLowerCase(),
      });
    }

    for (const j of queens) {
      items.push({
        type: "queen",
        show,
        typeLabel: meta.rosterLabel,
        label: j.data.name,
        sub: j.data.store || meta.rosterLabel,
        url: rosterHref(show, j.id),
        terms: `${j.data.name} ${j.data.nameKana ?? ""} ${j.data.store ?? ""} ${j.id} ${meta.brand}`.toLowerCase(),
      });
    }
  }

  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json" },
  });
}
