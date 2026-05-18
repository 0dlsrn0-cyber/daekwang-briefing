import { XMLParser } from "fast-xml-parser";
import type { NewsItem, NewsResult } from "./types";
import { fetchArticleBody } from "./article-body";

export const AI_DX_CATEGORY = "부동산 AI/DX";
const BODY_PER_CATEGORY = 4;

const SEARCH_QUERIES = [
  { category: "정책/세금", query: "부동산 (정책 OR 세금 OR 규제 OR 대출)" },
  { category: "분양/청약", query: "아파트 (분양 OR 청약 OR 모델하우스 OR 건설사)" },
  { category: "시장동향", query: "부동산 (동향 OR 실거래 OR 전세 OR 매매)" },
  {
    category: "매크로/원자재",
    query:
      "(원자재 OR 철근 OR 시멘트 OR 건설자재 OR 환율 OR 연준 OR 기준금리 OR 인플레이션 OR PF) (건설 OR 부동산 OR 경제)",
  },
  {
    category: "투자·운용",
    query:
      "(리츠 OR REITs OR 자산운용 OR AUM OR 운용사 OR 매각 OR 사옥 OR PF OR 신용공여 OR 펀드) (site:dealsite.co.kr OR site:thebell.co.kr OR site:bizhankook.com OR site:investchosun.com OR site:bloter.net OR site:realty.chosun.com)",
  },
  {
    category: AI_DX_CATEGORY,
    query:
      "(부동산 OR 건설 OR 분양 OR 프롭테크 OR 건설사) (AI OR 인공지능 OR 자동화 OR 디지털전환 OR DX OR 스마트건설 OR 빅데이터)",
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

  const seen = new Map<string, number>();
  const bodyTargets: NewsItem[] = [];
  for (const item of allNews) {
    if (item.category === AI_DX_CATEGORY) continue;
    const used = seen.get(item.category) ?? 0;
    if (used >= BODY_PER_CATEGORY) continue;
    bodyTargets.push(item);
    seen.set(item.category, used + 1);
  }
  await Promise.all(
    bodyTargets.map(async (item) => {
      const body = await fetchArticleBody(item.link);
      if (body) item.body = body;
    }),
  );

  return { success: true, news: allNews, errors };
}
