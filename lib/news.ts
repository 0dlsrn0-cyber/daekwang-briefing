import type { NewsItem, NewsResult } from "./types";
import { fetchArticleBody } from "./article-body";

export const AI_DX_CATEGORY = "부동산 AI/DX";
const BODY_PER_CATEGORY = 4;
const PER_CATEGORY_MAX = 10;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// 네이버·다음 공통 검색어. 공백은 AND 결합이라 2단어 이내로 재현율을 확보한다.
const CATEGORY_QUERIES: { category: string; queries: string[] }[] = [
  { category: "정책/세금", queries: ["부동산 정책", "부동산 규제", "양도세 종부세"] },
  { category: "분양/청약", queries: ["아파트 분양", "청약 경쟁률"] },
  { category: "시장동향", queries: ["아파트 전세", "집값 매매"] },
  {
    category: "매크로/원자재",
    queries: ["부동산 PF", "기준금리 환율", "건설 공사비"],
  },
  { category: "투자·운용", queries: ["리츠 부동산", "부동산 펀드"] },
  { category: AI_DX_CATEGORY, queries: ["건설 AI", "프롭테크"] },
];

// 오늘의 핵심 기사 선정용 키워드 가중치 (제목 기준)
const LEAD_KEYWORDS: { re: RegExp; w: number }[] = [
  { re: /공급\s*(대책|확대|방안)|비아파트|도시형\s*생활주택|빌라\s*공급/, w: 5 },
  { re: /국토(교통)?부|정부.{0,8}(대책|방안|발표|추진)|규제\s*완화/, w: 4 },
  { re: /분양가\s*상한제|분상제|토지거래허가|재건축|재개발/, w: 3 },
  { re: /기준금리|금통위|금리\s*(인상|인하|동결)/, w: 3 },
  { re: /전세사기|역전세|미분양|전세난/, w: 3 },
  { re: /\bPF\b|프로젝트\s*파이낸싱|부실|유동성/, w: 2 },
  { re: /청약|경쟁률|미달/, w: 2 },
  { re: /환율|국고채|물가/, w: 2 },
];

function scoreNews(title: string): number {
  let s = 0;
  for (const k of LEAD_KEYWORDS) if (k.re.test(title)) s += k.w;
  return s;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

function cleanText(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

// 중복 제거용 제목 정규화: 한글·영숫자만 남겨 매체별 동일 기사를 한 건으로 묶는다.
function normTitle(t: string): string {
  return t.replace(/[^가-힣a-zA-Z0-9]/g, "").toLowerCase();
}

// 두 소스를 번갈아 섞어, 상한에 걸려도 양쪽이 고루 반영되게 한다.
function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

type RawItem = { title: string; link: string; pubDate: string };

async function fetchDaum(query: string): Promise<RawItem[]> {
  const url = `https://search.daum.net/search?w=news&sort=recency&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const re =
    /<strong class="tit-g[^"]*">\s*<a href="(https?:\/\/v\.daum\.net\/v\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const out: RawItem[] = [];
  for (const m of html.matchAll(re)) {
    const title = cleanText(m[2]);
    if (title.length < 6) continue;
    out.push({ title, link: m[1], pubDate: "" });
  }
  return out;
}

async function fetchNaver(
  query: string,
  id: string,
  secret: string,
): Promise<RawItem[]> {
  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=15&sort=date`;
  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": id,
      "X-Naver-Client-Secret": secret,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as {
    items?: { title?: string; link?: string; originallink?: string; pubDate?: string }[];
  };
  return (data.items ?? [])
    .map((it) => ({
      title: cleanText(it.title ?? ""),
      link: (it.link || it.originallink || "").trim(),
      pubDate: (it.pubDate ?? "").trim(),
    }))
    .filter((x) => x.title && x.link);
}

export async function fetchAllNews(): Promise<NewsResult> {
  const errors: string[] = [];
  const id = process.env.NAVER_CLIENT_ID?.trim();
  const secret = process.env.NAVER_CLIENT_SECRET?.trim();
  const naverOn = !!(id && secret);
  if (!naverOn) {
    errors.push("네이버 API 키 미설정 — 다음(Daum) 소스만 사용");
  }

  const daumByCat = new Map<string, RawItem[]>();
  const naverByCat = new Map<string, RawItem[]>();
  for (const c of CATEGORY_QUERIES) {
    daumByCat.set(c.category, []);
    naverByCat.set(c.category, []);
  }

  // 다음: 병렬 수집
  const daumJobs = CATEGORY_QUERIES.flatMap((c) =>
    c.queries.map((q) => ({ category: c.category, q })),
  );
  const daumResults = await Promise.all(
    daumJobs.map(async (j) => ({
      category: j.category,
      items: await fetchDaum(j.q).catch((e) => {
        errors.push(`Daum/${j.category}/${j.q}: ${(e as Error).message}`);
        return [] as RawItem[];
      }),
    })),
  );
  for (const r of daumResults) daumByCat.get(r.category)!.push(...r.items);

  // 네이버: 분당 호출 제한(429) 회피를 위해 순차 수집
  if (naverOn) {
    for (const c of CATEGORY_QUERIES) {
      for (const q of c.queries) {
        try {
          const items = await fetchNaver(q, id!, secret!);
          naverByCat.get(c.category)!.push(...items);
        } catch (e) {
          errors.push(`Naver/${c.category}/${q}: ${(e as Error).message}`);
        }
        await new Promise((r) => setTimeout(r, 120));
      }
    }
  }

  // 두 소스를 번갈아 섞고 전역 중복 제거(정규화 제목) + 카테고리별 상한
  const seen = new Set<string>();
  const allNews: NewsItem[] = [];
  for (const c of CATEGORY_QUERIES) {
    const merged = interleave(
      daumByCat.get(c.category)!,
      naverByCat.get(c.category)!,
    );
    let count = 0;
    for (const it of merged) {
      const key = normTitle(it.title);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      allNews.push({
        category: c.category,
        title: it.title,
        link: it.link,
        pubDate: it.pubDate,
      });
      if (++count >= PER_CATEGORY_MAX) break;
    }
  }

  // 본문 수집 대상: 카테고리별 중요도 상위 (AI/DX 제외)
  const bodyTargets: NewsItem[] = [];
  for (const c of CATEGORY_QUERIES) {
    if (c.category === AI_DX_CATEGORY) continue;
    const items = allNews
      .filter((n) => n.category === c.category)
      .sort((a, b) => scoreNews(b.title) - scoreNews(a.title));
    bodyTargets.push(...items.slice(0, BODY_PER_CATEGORY));
  }
  await Promise.all(
    bodyTargets.map(async (item) => {
      const body = await fetchArticleBody(item.link);
      if (body) item.body = body;
    }),
  );

  // 오늘의 핵심 기사: 본문 확보된 기사 중 점수 상위 (최대 2건)
  const bodied = allNews
    .filter((n) => n.body && n.body.trim())
    .sort((a, b) => scoreNews(b.title) - scoreNews(a.title));
  for (const n of bodied.slice(0, 2)) {
    if (scoreNews(n.title) > 0) n.isLead = true;
  }

  return { success: allNews.length > 0, news: allNews, errors };
}
