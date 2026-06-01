import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { siteLink, absUrl } from "../lib/url";

// 新着エピソードの購読導線。スポイラー配慮で合否・投票はフィードに含めず、
// 回数・タイトル・放送日のみを出力する。
export async function GET() {
  const episodes = (await getCollection("episodes")).sort(
    (a, b) => b.data.airedAt.getTime() - a.data.airedAt.getTime()
  );

  return rss({
    title: "LAST CALL 非公式ファンサイト",
    description:
      "YouTubeオーディション番組「LAST CALL」の各回アーカイブ。新しい回が追加されると更新されます。",
    site: absUrl("/"),
    items: episodes.map((ep) => ({
      title: `第${ep.data.id}回 ${ep.data.title}`,
      pubDate: ep.data.airedAt,
      link: siteLink(`/episodes/${ep.data.id}/`),
      description: `${ep.data.airedAt.getFullYear()}年放送`,
    })),
    customData: `<language>ja</language>`,
  });
}
