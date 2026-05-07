import { XMLParser } from "fast-xml-parser";
import type { NewsItem, NewsResult } from "./types";

const SEARCH_QUERIES = [
  { category: "정책/세금", query: "부동산 (정책 OR 세금 OR 규제 OR 대출)" },
  { category: "분양/청약", query: "아파트 (분양 OR 청약 OR 모델하우스 OR 건설사)" },
  { category: "시장동향", query: "부동산 (동향 OR 실거래 OR 전세 OR 매매)" },
  {
    category: "매크로/원자재",
    query:
      "(원자재 OR 철근 OR 시멘트 OR 건설자재 OR 환율 OR 연준 OR 기준금리 OR 인플레이션 OR PF) (건설 OR 부동산 OR 경제)",
  },
];

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
});

export async function fetchAllNews(): Promise<NewsResult> {
  const allNews: NewsItem[] = [];
  const seenTitles = new Set<string>();
  const errors: string[] = [];

  await Promise.all(
    SEARCH_QUERIES.map(async (item) => {
      try {
        const encodedQuery = encodeURIComponent(item.query + " when:1d");
        const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=ko&gl=KR&ceid=KR:ko`;
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          },
        });
        if (!res.ok) {
          errors.push(`${item.category}: HTTP ${res.status}`);
          return;
        }
        const xml = await res.text();
        const parsed = parser.parse(xml);
        const items = parsed?.rss?.channel?.item ?? [];
        const list = Array.isArray(items) ? items : [items];

        let count = 0;
        for (const it of list) {
          if (count >= 10) break;
          const rawTitle = (it.title ?? "").toString();
          const link = (it.link ?? "").toString();
          const lastDash = rawTitle.lastIndexOf(" - ");
          const title = lastDash > -1 ? rawTitle.substring(0, lastDash) : rawTitle;
          if (!title || seenTitles.has(title)) continue;
          seenTitles.add(title);
          allNews.push({
            category: item.category,
            title,
            link,
            pubDate: (it.pubDate ?? "").toString(),
          });
          count++;
        }
      } catch (e) {
        errors.push(`${item.category}: ${(e as Error).message}`);
      }
    }),
  );

  return { success: true, news: allNews, errors };
}
