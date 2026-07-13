import rss from "@astrojs/rss";
import { absUrl } from "../lib/url";
import { SHOWS, SHOW_META, episodesForShow, episodeHref } from "../lib/show";

// 新着エピソードの購読導線（両番組統合）。スポイラー配慮で合否・投票はフィードに含めず、
// 回数・タイトル・放送日のみを出力する。各アイテムは番組名でプレフィックスする。
export async function GET() {
  const perShow = await Promise.all(
    SHOWS.map(async (show) =>
      (await episodesForShow(show)).map((ep) => ({ ep, show }))
    )
  );
  const all = perShow
    .flat()
    .sort((a, b) => b.ep.data.airedAt.getTime() - a.ep.data.airedAt.getTime());

  return rss({
    title: "LAST CALL / HOSTCALL 非公式アーカイブ",
    description:
      "YouTubeオーディション番組「LAST CALL」「HOSTCALL」の各回アーカイブ。新しい回が追加されると更新されます。",
    site: absUrl("/"),
    items: all.map(({ ep, show }) => ({
      title: `【${SHOW_META[show].brand}】第${ep.data.id}回 ${ep.data.title}`,
      pubDate: ep.data.airedAt,
      link: episodeHref(show, ep.data.id),
      description: `${ep.data.airedAt.getFullYear()}年放送`,
    })),
    customData: `<language>ja</language>`,
  });
}
