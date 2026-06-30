import type { NewsItem, NewsResult } from "./types";
import { fetchArticleBody } from "./article-body";

export const AI_DX_CATEGORY = "부동산 AI/DX";
// 관련성(LLM) 판정·분석이 제목이 아닌 본문을 읽도록 후보 본문을 폭넓게 확보한다.
// jina 부하·300s 한도를 감안해 점수 상위 이 건수까지만 수집(초과분은 제목으로만 판단).
const BODY_FETCH_MAX = 45;
const PER_CATEGORY_MAX = 12;
// 발행 24시간 이내 기사만 사용(엄격). 윈도우는 이 값만 조정(예: 36h/48h).
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

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

// ── 관련성 필터 ─────────────────────────────────────────────
// 검색어가 AND라도 다음/네이버가 느슨하게 매칭해 부동산 무관 기사가 섞인다
// (예: "기준금리 환율"→순수 외환·증시, "건설 AI"→일반 AI). 도메인 신호가 없는
// 제목은 분석 투입 전에 제외한다. "조금 더 가져오되 잡음은 강하게 거른다".
//
// STRONG: 명백한 부동산·주택 신호 (잡음 단어가 같이 있어도 통과시킨다)
const STRONG_RE =
  /부동산|주택|주거|아파트|집값|전세|월세|매매|매물|분양|청약|재건축|재개발|정비사업|선도지구|도심복합|모아타운|신통기획|뉴타운|입주|미분양|분양가|임대|계약갱신|오피스텔|빌라|연립|상가|택지|신도시|그린벨트|개발제한|토지거래허가|토허|국토(교통)?부|\bLH\b|SH공사|역세권|\bGTX\b|시공사|시행사|건설사|디벨로퍼|리츠|REITs|모델하우스|견본주택|주담대|주택담보|전세대출|디딤돌|버팀목|분양권|입주권|종부세|종합부동산세|양도세|양도소득세|증여세|취득세|보유세|재산세|공시지가|공시가격|토지/i;
// EXTRA: 디벨로퍼에 의미 있는 거시·금융·원가·프롭테크 신호 (도메인으로 인정)
const EXTRA_RE =
  /\bPF\b|프로젝트\s*파이낸싱|브리지론|공사비|건설|시공능력|자재(값|비|가격)|레미콘|시멘트|기준금리|금통위|한국은행|한은|국고채|회사채|\bDSR\b|\bLTV\b|가계대출|가계부채|환율|원자재|프롭테크|proptech|콘테크/i;
// HARD_NOISE: 증시·생활·스포츠 등 잡음. STRONG 신호가 없으면 제외한다.
const HARD_NOISE_RE =
  /코스피|코스닥|증시|주가|증권가|나스닥|다우|S&P|뉴욕증시|코인|비트코인|이더리움|가상자산|암호화폐|반도체|배터리|2차전지|전기차|스포츠|야구|축구|배구|농구|골프|올림픽|월드컵|연예|아이돌|드라마|영화|배우|가수|예능|날씨|기상|폭염|한파|태풍|확진|백신|코로나/i;

function isRelevant(title: string): boolean {
  const strong = STRONG_RE.test(title);
  if (!strong && !EXTRA_RE.test(title)) return false; // 도메인 신호 자체가 없음
  if (HARD_NOISE_RE.test(title) && !strong) return false; // 강한 부동산 신호 없는 시장·생활 잡음
  return true;
}

// ── 최신성 필터 ─────────────────────────────────────────────
// 네이버는 pubDate(RFC822) 제공. 다음은 미제공이지만 기사 URL
// (v.daum.net/v/<YYYYMMDDHHMMSS>...)에 발행시각(KST)이 박혀 있어 그걸 쓴다.
// 발행시각을 못 구하면 최신순 정렬에 맡기고 통과(포맷 변동 시 전량 누락 방지).
function articleTimeMs(item: RawItem): number | null {
  if (item.pubDate) {
    const t = Date.parse(item.pubDate);
    if (!Number.isNaN(t)) return t;
  }
  const m = item.link.match(/v\.daum\.net\/v\/(\d{14})/);
  if (m) {
    const s = m[1];
    const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}+09:00`;
    const t = Date.parse(iso);
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

function isFresh(item: RawItem): boolean {
  const ms = articleTimeMs(item);
  if (ms == null) return true; // 발행시각 미상 → 최신순 정렬에 위임
  return Date.now() - ms <= MAX_AGE_MS;
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
  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=25&sort=date`;
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
      if (!isRelevant(it.title)) continue;
      if (!isFresh(it)) continue;
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

  // 본문 수집 대상: AI/DX(이메일 하단 별도 블록)를 뺀 후보 전체를 점수순으로
  // 상한(BODY_FETCH_MAX)까지. 관련성 판정·분석이 본문을 읽도록 폭넓게 확보한다.
  const bodyPool = allNews
    .filter((n) => n.category !== AI_DX_CATEGORY)
    .sort((a, b) => scoreNews(b.title) - scoreNews(a.title));
  if (bodyPool.length > BODY_FETCH_MAX) {
    errors.push(
      `본문수집 상한(${BODY_FETCH_MAX}) 초과 — ${bodyPool.length - BODY_FETCH_MAX}건은 제목으로만 판단됨`,
    );
  }
  await Promise.all(
    bodyPool.slice(0, BODY_FETCH_MAX).map(async (item) => {
      const body = await fetchArticleBody(item.link);
      if (body) item.body = body;
    }),
  );

  markLeadArticles(allNews);

  return { success: allNews.length > 0, news: allNews, errors };
}

// 오늘의 핵심 기사(lead): 본문 확보된 기사 중 점수 상위 최대 2건.
// 관련성 필터로 기사 집합이 바뀌면 라우트에서 다시 적용한다.
export function markLeadArticles(news: NewsItem[]): void {
  for (const n of news) n.isLead = false;
  const bodied = news
    .filter((n) => n.body && n.body.trim())
    .sort((a, b) => scoreNews(b.title) - scoreNews(a.title));
  for (const n of bodied.slice(0, 2)) {
    if (scoreNews(n.title) > 0) n.isLead = true;
  }
}
