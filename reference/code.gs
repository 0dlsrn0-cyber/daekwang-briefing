// ============================================================
// 대광건영 로제비앙 부동산 동향 일일 브리핑 시스템 v3.8
// Code.gs : Google News RSS + ECOS 금리 + AI 심층 분석
// v3.8: GitHub AI(Azure)/Cohere/OpenRouter 폴백 추가 + 프리미엄 이메일 리디자인
// ============================================================

const DEFAULT_FOCUS = "";
const SEARCH_QUERIES = [
  { category: "정책/세금",    query: "부동산 (정책 OR 세금 OR 규제 OR 대출)" },
  { category: "분양/청약",    query: "아파트 (분양 OR 청약 OR 모델하우스 OR 건설사)" },
  { category: "시장동향",     query: "부동산 (동향 OR 실거래 OR 전세 OR 매매)" },
  { category: "매크로/원자재", query: "(원자재 OR 철근 OR 시멘트 OR 건설자재 OR 환율 OR 연준 OR 기준금리 OR 인플레이션 OR PF) (건설 OR 부동산 OR 경제)" }
];

function testAuth() {
  var doc = DocumentApp.create('권한_테스트_임시_문서');
  DriveApp.getFileById(doc.getId()).setTrashed(true);
  Logger.log('권한 승인 완료!');
}

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('로제비앙 부동산 동향 일일 브리핑')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ────────────────────────────────────────────────────────────
// ECOS API 공통 호출
// ────────────────────────────────────────────────────────────
function fetchECOS_(apiKey, statCode, cycle, months, item1, item2) {
  var today = new Date();
  var endM = Utilities.formatDate(today, 'GMT+9', 'yyyyMM');
  var startObj = new Date();
  startObj.setMonth(startObj.getMonth() - (months || 18));
  var startM = Utilities.formatDate(startObj, 'GMT+9', 'yyyyMM');
  var url = 'https://ecos.bok.or.kr/api/StatisticSearch/' + apiKey + '/json/kr/1/500/' + statCode + '/' + cycle + '/' + startM + '/' + endM + '/';
  if (item1) url += item1 + '/';
  if (item1 && item2) url += item2 + '/';
  try {
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var json = JSON.parse(response.getContentText());
    if (json.RESULT && json.RESULT.CODE && json.RESULT.CODE.startsWith('INFO-')) throw new Error('인증 오류: ' + json.RESULT.MESSAGE);
    return (json.StatisticSearch && json.StatisticSearch.row) ? json.StatisticSearch.row : [];
  } catch (e) { throw new Error(statCode + ' 조회 실패: ' + e.message); }
}

function getLatestByName_(rows) {
  if (!rows || !rows.length) return null;
  var kws = Array.prototype.slice.call(arguments, 1);
  var matched = rows.filter(function(r) {
    var allNames = [r.ITEM_NAME1, r.ITEM_NAME2, r.ITEM_NAME3, r.ITEM_NAME4].filter(Boolean).join('|');
    return kws.every(function(kw) { return allNames.indexOf(kw) >= 0; });
  });
  if (!matched.length) return null;
  return matched.sort(function(a, b) { return b.TIME.localeCompare(a.TIME); })[0];
}

function getLatest_(rows) {
  if (!rows || !rows.length) return null;
  return rows.sort(function(a, b) { return b.TIME.localeCompare(a.TIME); })[0];
}

function formatDate_(time) {
  if (!time || time.length < 6) return '-';
  return time.substring(0, 4) + '년 ' + time.substring(4, 6) + '월';
}

function getSortedRowsForItem_(rows, itemCode1) {
  if (!rows || !rows.length) return [];
  var code = String(itemCode1);
  return rows.filter(function(r) { return String(r.ITEM_CODE1 || '') === code; })
    .sort(function(a, b) { return String(b.TIME).localeCompare(String(a.TIME)); });
}

function getSortedRowsByName_(rows) {
  if (!rows || !rows.length) return [];
  var keywords = Array.prototype.slice.call(arguments, 1);
  return rows.filter(function(r) {
    var allNames = [r.ITEM_NAME1, r.ITEM_NAME2, r.ITEM_NAME3, r.ITEM_NAME4].filter(Boolean).join('|');
    return keywords.every(function(kw) { return allNames.indexOf(kw) >= 0; });
  }).sort(function(a, b) { return String(b.TIME).localeCompare(String(a.TIME)); });
}

function getSortedUniqueByTime_(rows) {
  if (!rows || !rows.length) return [];
  var sorted = rows.slice().sort(function(a, b) { return String(b.TIME).localeCompare(String(a.TIME)); });
  var seen = {}, out = [];
  sorted.forEach(function(r) {
    var t = String(r.TIME || '');
    if (!t || seen[t]) return;
    seen[t] = true; out.push(r);
  });
  return out;
}

function makeRate_(row, label, sublabel) {
  if (!row || row.DATA_VALUE === null || row.DATA_VALUE === '') return { label: label, sublabel: sublabel, rate: null };
  return { label: label, sublabel: sublabel, rate: parseFloat(row.DATA_VALUE).toFixed(2), date: formatDate_(row.TIME), rawTime: row.TIME };
}

function buildTrendFromSortedRows_(sortedRows, label) {
  function pick(idx) {
    var row = sortedRows[idx];
    if (!row || row.DATA_VALUE === null || row.DATA_VALUE === '') return null;
    return { rate: parseFloat(row.DATA_VALUE).toFixed(2), date: formatDate_(row.TIME), rawTime: row.TIME };
  }
  function deltaPp(a, b) {
    if (!a || !b || a.rate == null || b.rate == null) return null;
    return (parseFloat(a.rate) - parseFloat(b.rate)).toFixed(2);
  }
  var cur = pick(0), m3 = pick(3), m6 = pick(6), m12 = pick(12);
  return {
    label: label || '',
    current: cur,
    ago3m:  m3  ? { rate: m3.rate,  date: m3.date,  rawTime: m3.rawTime,  changeFromPastToNowPp: cur ? deltaPp(cur, m3)  : null } : null,
    ago6m:  m6  ? { rate: m6.rate,  date: m6.date,  rawTime: m6.rawTime,  changeFromPastToNowPp: cur ? deltaPp(cur, m6)  : null } : null,
    ago12m: m12 ? { rate: m12.rate, date: m12.date, rawTime: m12.rawTime, changeFromPastToNowPp: cur ? deltaPp(cur, m12) : null } : null,
    monthsAvailable: sortedRows.length
  };
}

// ────────────────────────────────────────────────────────────
// 전체 ECOS 지표 조회
// ────────────────────────────────────────────────────────────
function fetchAllRates(ecosApiKey) {
  var key = (ecosApiKey || '').toString().trim();
  if (!key) return { success: false, rates: {}, trends: {}, errors: ['ECOS API 키 없음'] };
  var rates = {}, trends = {}, errors = [], MONTHS = 18;

  try {
    var rows121 = fetchECOS_(key, '121Y006', 'M', MONTHS);
    var mortgageRows  = getSortedRowsForItem_(rows121, '1020000');
    var householdRows = getSortedRowsForItem_(rows121, '1010000');
    var creditRows    = getSortedRowsForItem_(rows121, '1020200');
    var corpRows      = getSortedRowsForItem_(rows121, '1030000');
    rates.mortgage  = makeRate_(mortgageRows[0]  || getLatestByName_(rows121, '주택담보대출'), '주택담보대출',  '예금은행 가중평균 (신규취급액)');
    trends.mortgage = buildTrendFromSortedRows_(mortgageRows.length ? mortgageRows : getSortedRowsByName_(rows121, '주택담보대출'), '주택담보대출');
    rates.household  = makeRate_(householdRows[0] || getLatestByName_(rows121, '가계대출'), '가계대출', '예금은행 가중평균 (신규취급액)');
    trends.household = buildTrendFromSortedRows_(householdRows.length ? householdRows : getSortedRowsByName_(rows121, '가계대출'), '가계대출');
    rates.credit  = makeRate_(creditRows[0] || getLatestByName_(rows121, '신용대출'), '신용대출', '예금은행 가중평균 (신규취급액)');
    trends.credit = buildTrendFromSortedRows_(creditRows.length ? creditRows : getSortedRowsByName_(rows121, '신용대출'), '신용대출');
    rates.corporate  = makeRate_(corpRows[0] || getLatestByName_(rows121, '기업대출'), '기업대출', '예금은행 가중평균 (신규취급액)');
    trends.corporate = buildTrendFromSortedRows_(corpRows.length ? corpRows : getSortedRowsByName_(rows121, '기업대출'), '기업대출');
  } catch (e) { errors.push('121Y006: ' + e.message); }

  try {
    var rows722 = fetchECOS_(key, '722Y001', 'M', MONTHS);
    var series722 = getSortedUniqueByTime_(rows722);
    rates.baseRate  = makeRate_(series722[0] || getLatest_(rows722), '기준금리', '통화정책 기준금리');
    trends.baseRate = buildTrendFromSortedRows_(series722.length ? series722 : rows722.sort(function(a,b){ return String(b.TIME).localeCompare(String(a.TIME)); }), '기준금리');
  } catch (e) { errors.push('722Y001: ' + e.message); }

  try {
    var rows721 = fetchECOS_(key, '721Y001', 'M', MONTHS);
    var bond3Rows  = getSortedRowsByName_(rows721, '국고채(3년)').length  ? getSortedRowsByName_(rows721, '국고채(3년)')  : getSortedRowsByName_(rows721, '국고채', '3년');
    var bond10Rows = getSortedRowsByName_(rows721, '국고채(10년)').length ? getSortedRowsByName_(rows721, '국고채(10년)') : getSortedRowsByName_(rows721, '국고채', '10년');
    var cdRows     = getSortedRowsByName_(rows721, 'CD(91일)').length     ? getSortedRowsByName_(rows721, 'CD(91일)')     : rows721.filter(function(r){ return (r.ITEM_NAME1||'').indexOf('CD')>=0; }).sort(function(a,b){ return String(b.TIME).localeCompare(String(a.TIME)); });
    rates.bond3y  = makeRate_(bond3Rows[0]  || getLatestByName_(rows721, '국고채(3년)'),  '국고채 3년',  '시장 지표금리');
    trends.bond3y = buildTrendFromSortedRows_(bond3Rows, '국고채 3년');
    rates.bond10y  = makeRate_(bond10Rows[0] || getLatestByName_(rows721, '국고채(10년)'), '국고채 10년', '장기 지표금리');
    trends.bond10y = buildTrendFromSortedRows_(bond10Rows, '국고채 10년');
    rates.cd  = makeRate_(cdRows[0] || getLatestByName_(rows721, 'CD(91일)'), 'CD 91일', '단기 지표금리');
    trends.cd = buildTrendFromSortedRows_(cdRows, 'CD 91일물');
  } catch (e) { errors.push('721Y001: ' + e.message); }

  try {
    var csiRows = fetchECOS_(key, '511Y002', 'M', MONTHS, 'FMFB', '99988');
    csiRows.sort(function(a,b){ return String(b.TIME).localeCompare(String(a.TIME)); });
    rates.csi = makeRate_(csiRows[0], '주택가격전망CSI', '소비자동향 · 100 초과=상승 전망');
    trends.csi = buildTrendFromSortedRows_(csiRows, '주택가격전망CSI');
  } catch (e) { errors.push('511Y002_FMFB: ' + e.message); }

  try {
    var debtRows = fetchECOS_(key, '511Y002', 'M', MONTHS, 'FMDD', '99988');
    debtRows.sort(function(a,b){ return String(b.TIME).localeCompare(String(a.TIME)); });
    rates.debtCsi = makeRate_(debtRows[0], '가계부채전망CSI', '소비자동향 · 100 초과=부채증가 전망');
    trends.debtCsi = buildTrendFromSortedRows_(debtRows, '가계부채전망CSI');
  } catch (e) { errors.push('511Y002_FMDD: ' + e.message); }

  try {
    var ccsiRows = fetchECOS_(key, '511Y002', 'M', MONTHS, 'FME');
    ccsiRows.sort(function(a,b){ return String(b.TIME).localeCompare(String(a.TIME)); });
    rates.ccsi = makeRate_(ccsiRows[0], '소비자심리(CCSI)', '복합심리지수 · 100=장기평균');
    trends.ccsi = buildTrendFromSortedRows_(ccsiRows, '소비자심리(CCSI)');
  } catch (e) { errors.push('511Y002_FME: ' + e.message); }

  return {
    success: errors.length === 0 || Object.keys(rates).some(function(k){ return rates[k] && rates[k].rate; }),
    rates: rates, trends: trends,
    errors: errors.length ? errors : null,
    fetchedAt: Utilities.formatDate(new Date(), 'GMT+9', 'yyyy-MM-dd HH:mm')
  };
}

function buildRateTextForPrompt_(ratesData, trendsData) {
  var lines = [];
  lines.push('【한국은행 ECOS 최신 금리 및 심리지표 스냅샷】');
  var CSI_KEYS = { csi: true, debtCsi: true, ccsi: true };
  var rateKeys = ['baseRate', 'mortgage', 'household', 'corporate', 'bond3y', 'bond10y', 'cd', 'credit', 'csi', 'debtCsi', 'ccsi'];
  rateKeys.forEach(function(k) {
    var v = ratesData[k];
    if (!v || !v.label) return;
    var isCsi = !!CSI_KEYS[k];
    var rateStr = v.rate ? v.rate + (isCsi ? 'p' : '%') : '조회불가';
    lines.push('  · ' + v.label + ': ' + rateStr + (v.date ? ' (' + v.date + ' 기준)' : ''));
  });
  lines.push('');
  lines.push('【CSI 해석 기준】');
  lines.push('  · 주택가격전망CSI: 100 초과 → 향후 주택가격 상승 응답자 > 하락 응답자');
  lines.push('  · 가계부채전망CSI: 100 초과 → 향후 가계부채 증가 전망 응답자 우세 (수분양자 자금조달 압박 신호)');
  lines.push('  · 소비자심리지수(CCSI): 100=장기평균, 100 초과 → 소비심리 낙관 (청약·계약 의향 긍정적 영향)');
  lines.push('');
  lines.push('【지표 변화 추이 (3·6·12개월 전 대비)】');
  var trendKeys = ['baseRate', 'mortgage', 'bond3y', 'bond10y', 'cd', 'household', 'corporate', 'credit', 'csi', 'debtCsi', 'ccsi'];
  trendKeys.forEach(function(k) {
    var t = trendsData[k];
    if (!t || !t.current) return;
    var isCsi = !!CSI_KEYS[k];
    var unit = isCsi ? 'p' : '%', dUnit = isCsi ? 'p' : 'pp';
    var cur  = t.current.rate + unit + ' (' + (t.current.date || '') + ')';
    var p3   = t.ago3m  ? t.ago3m.rate  + unit : 'n/a';
    var p12  = t.ago12m ? t.ago12m.rate + unit : 'n/a';
    var d3   = t.ago3m  && t.ago3m.changeFromPastToNowPp  != null ? (parseFloat(t.ago3m.changeFromPastToNowPp)  > 0 ? '+' : '') + t.ago3m.changeFromPastToNowPp  + dUnit : '-';
    var d12  = t.ago12m && t.ago12m.changeFromPastToNowPp != null ? (parseFloat(t.ago12m.changeFromPastToNowPp) > 0 ? '+' : '') + t.ago12m.changeFromPastToNowPp + dUnit : '-';
    lines.push('  · ' + (t.label || k) + ': 현재 ' + cur + ' | 3M전 ' + p3 + ' (Δ' + d3 + ') | 12M전 ' + p12 + ' (Δ' + d12 + ')');
  });
  var mortRate = ratesData.mortgage && ratesData.mortgage.rate ? parseFloat(ratesData.mortgage.rate) : null;
  if (mortRate) {
    lines.push('');
    lines.push('【DSR 40% 기준 월상환 추산 (주담대 ' + mortRate + '%, 30년 원리금균등)】');
    var r = mortRate / 100 / 12, n = 360;
    [5, 7, 10].forEach(function(억) {
      var loan = 억 * 1e8 * 0.7;
      var monthly = r === 0 ? loan / n : loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      lines.push('  · 분양가 ' + 억 + '억 (LTV 70%): 월 약 ' + Math.round(monthly / 10000) + '만원');
    });
  }
  return lines.join('\n');
}

function fetchAllNews() {
  var allNews = [], seenTitles = {}, errors = [];
  SEARCH_QUERIES.forEach(function(item) {
    try {
      var encodedQuery = encodeURIComponent(item.query + ' when:1d');
      var url = 'https://news.google.com/rss/search?q=' + encodedQuery + '&hl=ko&gl=KR&ceid=KR:ko';
      var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (res.getResponseCode() !== 200) { errors.push(item.category + ': HTTP ' + res.getResponseCode()); return; }
      var items = XmlService.parse(res.getContentText()).getRootElement().getChild('channel').getChildren('item');
      var count = 0;
      items.forEach(function(it) {
        if (count >= 10) return;
        var rawTitle = it.getChildText('title') || '';
        var link = it.getChildText('link') || '';
        var title = rawTitle.indexOf(' - ') > -1 ? rawTitle.substring(0, rawTitle.lastIndexOf(' - ')) : rawTitle;
        if (!seenTitles[title] && title) {
          seenTitles[title] = true;
          allNews.push({ category: item.category, title: title, link: link, pubDate: it.getChildText('pubDate') || '' });
          count++;
        }
      });
    } catch (e) { errors.push(item.category + ': ' + e.message); }
  });
  return { success: true, news: allNews, errors: errors };
}

function runBriefing(params) {
  try {
    var aiKey = params.aiKey, aiModel = params.aiModel || 'gemini';
    var focusPoint = params.focusPoint, ecosKey = params.ecosKey || '';
    if (!aiKey || !aiKey.trim()) return { success: false, error: 'AI API 키가 입력되지 않았습니다.' };
    var newsResult = fetchAllNews();
    if (!newsResult.success || newsResult.news.length === 0) return { success: false, error: '뉴스 수집 실패 또는 오늘 기사 없음' };
    var rateData = null;
    if (ecosKey && ecosKey.trim()) {
      try { rateData = fetchAllRates(ecosKey.trim()); }
      catch (rateErr) { rateData = { success: false, rates: {}, trends: {}, errors: [rateErr.message] }; }
    }
    var aiReport = '';
    try { aiReport = callAiAnalysis(aiKey.trim(), aiModel, newsResult.news, focusPoint, rateData); }
    catch (apiErr) {
      aiReport = "## [안내] AI 서버 과부하로 인한 분석 일시 지연\n\n수집된 뉴스와 금리 데이터를 먼저 확인해 주세요.\n\n*오류: " + apiErr.message + "*";
    }
    return {
      success: true, news: newsResult.news, aiReport: aiReport,
      ts: Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm'),
      newsCount: newsResult.news.length, focusPoint: focusPoint || '',
      rateData: rateData, aiModel: aiModel
    };
  } catch (err) {
    Logger.log('[치명 오류] ' + err.stack);
    return { success: false, error: err.message };
  }
}

function callAiAnalysis(aiKey, aiModel, newsList, focusPoint, rateData) {
  var newsText = newsList.map(function(n) { return '[' + n.category + '] ' + n.title; }).join('\n');
  var hasFocus = focusPoint && focusPoint.trim();
  var rateBlock = '';
  if (rateData && rateData.success && rateData.rates) {
    rateBlock = '\n\n' + buildRateTextForPrompt_(rateData.rates, rateData.trends || {}) + '\n';
  }

  var mainPrompt = '당신은 대광그룹 주택관리팀의 수석 부동산 전략 분석가입니다. 단순 정보 요약이 아니라, **시행사(디벨로퍼) 입장**에서 사업성과 리스크를 입체적으로 판단하는 것이 당신의 핵심 역할입니다.\n\n' +
    '아래 오늘 수집된 4개 카테고리 뉴스' + (rateBlock ? '와 **한국은행 ECOS 실시간 금리·심리지표 데이터**' : '') + '를 읽고, 내부 임원진이 무릎을 탁 칠 만한 심층 분석 브리핑을 작성하세요.\n\n' +
    '[오늘의 수집 뉴스]\n' + newsText + '\n' + rateBlock + '\n' +
    '[★ 디벨로퍼 관점 분석 핵심 지침 ★]\n' +
    '- 시행사는 뉴스를 "어디에 사업지를 잡을 것인가", "지금이 분양 타이밍인가", "원가 구조가 바뀌는가", "수분양자 자금 조달이 가능한가"의 렌즈로 읽습니다.\n' +
    '- 매크로/원자재 뉴스는 반드시 "공사원가 → 사업수지 → 분양가 설정"의 연결고리로 분석하세요.\n';

  if (rateBlock) {
    mainPrompt +=
      '- **데이터 활용 필수**: ECOS 실제 수치를 인용하여 PF 조달금리 및 잔금대출 환경을 정량적으로 진단하세요.\n' +
      '- **CSI 3종 활용 의무**: 아래 3가지 심리지표를 반드시 분석에 통합하세요.\n' +
      '  ① 주택가격전망CSI → 향후 주택가격 상승 기대 수준 (분양 타이밍 판단 기준)\n' +
      '  ② 가계부채전망CSI → 수분양자의 대출 부담 심리 (계약취소·미분양 선행 지표)\n' +
      '  ③ 소비자심리지수(CCSI) → 전반적 소비·구매 심리 (청약수요 온도계)\n' +
      '  → 이 3가지 지표를 금리 데이터와 교차 분석하여 "수분양자 심리 지형도"를 그려주세요.\n';
  }

  mainPrompt +=
    '- PF 대출 환경, 인허가 흐름, 미분양 리스크, 지역별 수급 온도차를 아우르는 종합 시각을 유지하세요.\n' +
    '- 뻔한 뉴스 재나열 금물. 기사들을 관통하는 숨겨진 패러다임 변화와 선제적 대응 방향을 도출하세요.\n\n' +
    '[분석 출력 지침]\n' +
    '- "수신, 참조, 발신" 등 불필요한 서두나 "이상입니다" 같은 맺음말 절대 금지.\n' +
    '- 단락 구분은 \'가, 나, 다\', \'1), 2), 3)\', \'①, ②, ③\' 체계 사용. 마크다운 불릿 금지.\n' +
    '- 핵심 문장은 **굵게** 처리. 표 사용 금지.\n\n' +
    '[필수 구조]\n\n' +
    '## 1. 시장 핵심 인사이트 — 디벨로퍼가 읽어야 할 오늘의 판세\n' +
    '4개 카테고리 뉴스 전체를 꿰뚫는 하나의 거시적 흐름을 4~6문장으로 압축하세요.\n\n';

  if (rateBlock) {
    mainPrompt +=
      '## 2. 원가·정책 리스크와 사업수지 영향\n가, 나, 다로 나누어 각 2~3문장 이상 서술.\n\n' +
      '## 3. 분양·입지 전략 및 선제 대응 방안\n' +
      '핵심 트렌드 3가지를 뽑고 반드시 아래 포맷으로만 작성하세요.\n' +
      '① [전략 키워드]\n- 왜(근거): (내용)\n- 무엇을(액션): (내용)\n\n' +
      '## 4. 금융·심리 환경 정량 진단\n' +
      'ECOS 수치와 CSI 3종을 기반으로 분석하세요.\n' +
      '가. 기준금리·시장금리 추이 (방향, 변동폭, PF금리 추정)\n' +
      '나. 수분양자 자금조달 여건 (주담대 수준, DSR 부담 정량화)\n' +
      '다. 소비자 심리 지형도 (주택가격전망·부채전망·CCSI 종합 진단)\n' +
      '각 항목 2~3문장 이상 서술.\n\n';
  } else {
    mainPrompt +=
      '## 2. 원가·금융 환경 변화와 사업수지 영향 분석\n가, 나, 다 각 2~3문장.\n\n' +
      '## 3. 분양·입지 전략 및 선제 대응 방안\n' +
      '핵심 트렌드 3가지를 뽑고 반드시 아래 포맷으로만 작성하세요.\n' +
      '① [전략 키워드]\n- 왜(근거): (내용)\n- 무엇을(액션): (내용)\n\n';
  }

  mainPrompt += '자, 최고의 브리핑 작성을 시작하세요.';

  if (hasFocus) {
    var focusSectionNum = rateBlock ? '5' : '4';
    mainPrompt += '\n\n## ' + focusSectionNum + '. 중점 분석 — ' + focusPoint.trim() + '\n' +
      '위 분석과 별개로, 이 이슈에 집중한 독자적 심층 분석을 작성하세요.\n' +
      (rateBlock ? '금리·CSI 데이터가 관련되면 반드시 수치를 인용하세요.\n' : '') +
      '리스크와 기회 양면, 실행 가능한 대응 스탠스, 최소 6문장 이상.';
  }

  if      (aiModel === 'claude')      return callClaude(aiKey, mainPrompt);
  else if (aiModel === 'grok')        return callGrok(aiKey, mainPrompt);
  else if (aiModel === 'perplexity')  return callPerplexity(aiKey, mainPrompt);
  else if (aiModel === 'openai')      return callOpenAI(aiKey, mainPrompt);
  else if (aiModel === 'mistral')     return callMistral(aiKey, mainPrompt);
  else if (aiModel === 'github')      return callGithubAzure(aiKey, mainPrompt);
  else if (aiModel === 'cohere')      return callCohere(aiKey, mainPrompt);
  else if (aiModel === 'openrouter')  return callOpenRouter(aiKey, mainPrompt);
  else                                return callGemini(aiKey, mainPrompt);
}

// ────────────────────────────────────────────────────────────
// AI API 호출 함수들
// ────────────────────────────────────────────────────────────
function callGemini(aiKey, prompt) {
  var payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.6, maxOutputTokens: 8192 } };
  var res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + aiKey,
    { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Gemini API 오류: ' + res.getContentText());
  var data = JSON.parse(res.getContentText());
  if (data.candidates && data.candidates.length > 0) return data.candidates[0].content.parts[0].text;
  throw new Error('Gemini 응답 구조 오류');
}

function callClaude(aiKey, prompt) {
  var payload = { model: 'claude-opus-4-7', max_tokens: 8192, temperature: 0.6, messages: [{ role: 'user', content: prompt }] };
  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages',
    { method: 'post', contentType: 'application/json', headers: { 'x-api-key': aiKey, 'anthropic-version': '2023-06-01' }, payload: JSON.stringify(payload), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Claude API 오류: ' + res.getContentText());
  var data = JSON.parse(res.getContentText());
  if (data.content && data.content.length > 0) return data.content[0].text;
  throw new Error('Claude 응답 구조 오류');
}

function callGrok(aiKey, prompt) {
  var payload = { model: 'grok-3', temperature: 0.6, messages: [{ role: 'user', content: prompt }] };
  var res = UrlFetchApp.fetch('https://api.x.ai/v1/chat/completions',
    { method: 'post', contentType: 'application/json', headers: { 'Authorization': 'Bearer ' + aiKey }, payload: JSON.stringify(payload), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Grok API 오류: ' + res.getContentText());
  var data = JSON.parse(res.getContentText());
  if (data.choices && data.choices.length > 0) return data.choices[0].message.content;
  throw new Error('Grok 응답 구조 오류');
}

function callPerplexity(aiKey, prompt) {
  var payload = { model: 'sonar-pro', temperature: 0.6, messages: [{ role: 'user', content: prompt }] };
  var res = UrlFetchApp.fetch('https://api.perplexity.ai/chat/completions',
    { method: 'post', contentType: 'application/json', headers: { 'Authorization': 'Bearer ' + aiKey }, payload: JSON.stringify(payload), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Perplexity API 오류: ' + res.getContentText());
  var data = JSON.parse(res.getContentText());
  if (data.choices && data.choices.length > 0) return data.choices[0].message.content;
  throw new Error('Perplexity 응답 구조 오류');
}

function callOpenAI(aiKey, prompt) {
  var payload = { model: 'gpt-4o', temperature: 0.6, max_tokens: 8192, messages: [{ role: 'user', content: prompt }] };
  var res = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions',
    { method: 'post', contentType: 'application/json', headers: { 'Authorization': 'Bearer ' + aiKey }, payload: JSON.stringify(payload), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('OpenAI API 오류: ' + res.getContentText());
  var data = JSON.parse(res.getContentText());
  if (data.choices && data.choices.length > 0) return data.choices[0].message.content;
  throw new Error('OpenAI 응답 구조 오류');
}

function callMistral(aiKey, prompt) {
  var payload = { model: 'mistral-large-latest', temperature: 0.6, max_tokens: 8192, messages: [{ role: 'user', content: prompt }] };
  var res = UrlFetchApp.fetch('https://api.mistral.ai/v1/chat/completions',
    { method: 'post', contentType: 'application/json', headers: { 'Authorization': 'Bearer ' + aiKey }, payload: JSON.stringify(payload), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Mistral API 오류: ' + res.getContentText());
  var data = JSON.parse(res.getContentText());
  if (data.choices && data.choices.length > 0) return data.choices[0].message.content;
  throw new Error('Mistral 응답 구조 오류');
}

// GitHub Models — gpt-4o-mini → Phi-4 → Llama-3.3-70B (Rate limit 폴백)
// 엔드포인트: https://models.github.ai/inference (GA 이후 공식 URL)
function callGithubAzure(aiKey, prompt) {
  var props = PropertiesService.getScriptProperties();
  var token = aiKey || props.getProperty('GITHUB_TOKEN') || '';
  if (!token) throw new Error('GitHub 토큰이 없습니다. Script Properties에 GITHUB_TOKEN을 설정하거나 API 키 입력란에 입력하세요.');
  var MODELS = ['openai/gpt-4o-mini', 'microsoft/phi-4', 'meta/llama-3.3-70b-instruct'];
  var ENDPOINT = 'https://models.github.ai/inference/chat/completions';
  var lastError = '';
  for (var i = 0; i < MODELS.length; i++) {
    var model = MODELS[i];
    Logger.log('[GitHub] 시도: ' + model);
    var res = UrlFetchApp.fetch(ENDPOINT, {
      method: 'post', contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + token },
      payload: JSON.stringify({ model: model, messages: [{ role: 'user', content: prompt }], temperature: 0.6, max_tokens: 4096 }),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    Logger.log('[GitHub] ' + model + ' → HTTP ' + code);
    if (code === 429 || code === 503) { lastError = 'Rate limit (' + model + ')'; Logger.log('[GitHub] 폴백 → ' + (MODELS[i+1]||'모두 실패')); continue; }
    if (code !== 200) { lastError = model + ' HTTP ' + code + ': ' + res.getContentText().substring(0, 200); Logger.log('[GitHub] 오류: ' + lastError); continue; }
    var data = JSON.parse(res.getContentText());
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      Logger.log('[GitHub] 성공: ' + model);
      return data.choices[0].message.content;
    }
    lastError = model + ' 응답 구조 이상: ' + JSON.stringify(data).substring(0, 200);
    Logger.log('[GitHub] 구조 오류 → 다음 모델');
  }
  throw new Error('GitHub Models: 모든 모델 실패. 마지막 오류: ' + lastError);
}

// Cohere Command A (2025-03) — v2 Chat API
function callCohere(aiKey, prompt) {
  var props = PropertiesService.getScriptProperties();
  var key = aiKey || props.getProperty('COHERE_API_KEY') || '';
  if (!key) throw new Error('Cohere API 키가 없습니다. Script Properties에 COHERE_API_KEY를 설정하거나 API 키 입력란에 입력하세요.');
  var res = UrlFetchApp.fetch('https://api.cohere.com/v2/chat', {
    method: 'post', contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + key },
    payload: JSON.stringify({ model: 'command-a-03-2025', messages: [{ role: 'user', content: prompt }], max_tokens: 8192, temperature: 0.6 }),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  Logger.log('[Cohere] HTTP ' + code);
  if (code !== 200) throw new Error('Cohere API 오류 (HTTP ' + code + '): ' + res.getContentText());
  var data = JSON.parse(res.getContentText());
  Logger.log('[Cohere] 응답 키: ' + Object.keys(data).join(', '));
  // v2 응답: data.message.content[].{type, text}
  if (data.message && data.message.content && data.message.content.length > 0) {
    var textParts = data.message.content.filter(function(c) { return c.type === 'text' && c.text; });
    if (textParts.length > 0) return textParts[0].text;
  }
  // 폴백: v1 스타일 응답
  if (data.text) return data.text;
  throw new Error('Cohere 응답 구조 오류: ' + JSON.stringify(data).substring(0, 300));
}

// OpenRouter — Llama 4 Scout → Qwen3 30B → Mistral Small (무료 폴백)
function callOpenRouter(aiKey, prompt) {
  var props = PropertiesService.getScriptProperties();
  var key = aiKey || props.getProperty('OPENROUTER_API_KEY') || '';
  if (!key) throw new Error('OpenRouter API 키가 없습니다. Script Properties에 OPENROUTER_API_KEY를 설정하거나 API 키 입력란에 입력하세요.');
  var MODELS = [
    'meta-llama/llama-4-scout:free',
    'qwen/qwen3-30b-a3b:free',
    'mistralai/mistral-small-3.1-24b-instruct:free'
  ];
  var OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
  var lastError = '';
  for (var i = 0; i < MODELS.length; i++) {
    var model = MODELS[i];
    Logger.log('[OpenRouter] 시도: ' + model);
    var res = UrlFetchApp.fetch(OR_URL, {
      method: 'post', contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + key, 'HTTP-Referer': 'https://daekwang.com', 'X-Title': 'Daekwang Briefing System' },
      payload: JSON.stringify({ model: model, messages: [{ role: 'user', content: prompt }], temperature: 0.6, max_tokens: 4096 }),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    Logger.log('[OpenRouter] ' + model + ' → HTTP ' + code);
    if (code === 429 || code === 404 || code >= 500) {
      lastError = model + ' HTTP ' + code + ': ' + res.getContentText().substring(0, 200);
      Logger.log('[OpenRouter] 폴백 → ' + (MODELS[i+1] || '모두 실패'));
      continue;
    }
    if (code !== 200) {
      lastError = model + ' HTTP ' + code + ': ' + res.getContentText().substring(0, 200);
      Logger.log('[OpenRouter] 비정상 코드: ' + lastError);
      continue;
    }
    var data = JSON.parse(res.getContentText());
    // error 필드가 있으면 폴백
    if (data.error) {
      lastError = model + ' error: ' + JSON.stringify(data.error).substring(0, 200);
      Logger.log('[OpenRouter] API error → 폴백');
      continue;
    }
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      Logger.log('[OpenRouter] 성공: ' + model);
      return data.choices[0].message.content;
    }
    lastError = model + ' 응답 구조 이상';
    Logger.log('[OpenRouter] 구조 오류 → 폴백');
  }
  throw new Error('OpenRouter: 모든 모델 실패. 마지막 오류: ' + lastError);
}

// ────────────────────────────────────────────────────────────
// 이메일 발송
// ────────────────────────────────────────────────────────────
function sendBriefingEmail(params) {
  var result = params.result, recipients = params.recipients, senderName = params.senderName;
  try {
    var today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
    var subject = '[로제비앙] 부동산 동향 심층 분석 브리핑 (' + today + ')';
    var htmlBody = buildBriefingEmailHtml(result);
    var emailList = recipients.split(/[,;]/).map(function(e) { return e.trim(); }).filter(function(e) { return e; });
    emailList.forEach(function(email) {
      MailApp.sendEmail({ to: email, subject: subject, htmlBody: htmlBody, name: senderName || '대광건영 로제비앙' });
    });
    return { success: true, sentTo: emailList.length };
  } catch (err) {
    Logger.log('[메일 발송 오류] ' + err.stack);
    return { success: false, error: err.message };
  }
}

function setupScheduler(params) {
  try {
    ScriptApp.getProjectTriggers().forEach(function(t) { if (t.getHandlerFunction() === 'scheduledRun') ScriptApp.deleteTrigger(t); });
    var parts = (params.schedTime || '08:00').split(':');
    ScriptApp.newTrigger('scheduledRun').timeBased().everyDays(1).atHour(parseInt(parts[0],10)).nearMinute(parseInt(parts[1]||'0',10)).inTimezone('Asia/Seoul').create();
    var props = PropertiesService.getScriptProperties();
    props.setProperties({
      sched_aiKey: params.aiKey || '', sched_aiModel: params.aiModel || 'gemini',
      sched_ecosKey: params.ecosKey || '', sched_focusPoint: params.focusPoint || '',
      sched_recipients: params.recipients || '', sched_senderName: params.senderName || '대광그룹 주택관리팀',
      sched_time: params.schedTime || '08:00'
    });
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

function deleteScheduler() {
  try {
    ScriptApp.getProjectTriggers().forEach(function(t) { if (t.getHandlerFunction() === 'scheduledRun') ScriptApp.deleteTrigger(t); });
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

function scheduledRun() {
  var props = PropertiesService.getScriptProperties();
  var aiKey = props.getProperty('sched_aiKey') || '';
  if (!aiKey) { Logger.log('[스케줄러] API 키 없음'); return; }
  var result = runBriefing({
    aiKey: aiKey, aiModel: props.getProperty('sched_aiModel') || 'gemini',
    ecosKey: props.getProperty('sched_ecosKey') || '', focusPoint: props.getProperty('sched_focusPoint') || ''
  });
  var recipients = props.getProperty('sched_recipients') || '';
  if (result.success && recipients) {
    sendBriefingEmail({ result: result, recipients: recipients, senderName: props.getProperty('sched_senderName') || '대광그룹 주택관리팀' });
  }
}

// ────────────────────────────────────────────────────────────
// 전역 마크다운 헬퍼
// ────────────────────────────────────────────────────────────
function mdToHtml(text) {
  return text
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong style="color:#1B365D;">$1</strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#1B365D;">$1</strong>')
    .replace(/\*([^*\s][^*]*)\*/g, '<em>$1</em>');
}

// ────────────────────────────────────────────────────────────
// ★ 프리미엄 이메일 HTML (v3.8)
// ────────────────────────────────────────────────────────────
function buildBriefingEmailHtml(result) {
  var news = result.news, aiReport = result.aiReport, ts = result.ts;
  var newsCount = result.newsCount, rateData = result.rateData, aiModel = result.aiModel;

  var MODEL_LABELS = {
    'gemini':      'Google Gemini 2.5 Flash',
    'claude':      'Claude Opus 4.7',
    'grok':        'xAI Grok-3',
    'perplexity':  'Perplexity Sonar Pro',
    'openai':      'OpenAI GPT-4o',
    'mistral':     'Mistral Large',
    'github':      'GitHub AI · gpt-4o-mini / DeepSeek-R1 / Llama',
    'cohere':      'Cohere Command A (2025)',
    'openrouter':  'OpenRouter · Llama 4 / Qwen3 / Gemma 3 (Free)'
  };
  var modelLabel = MODEL_LABELS[aiModel] || (aiModel || 'AI 분석 엔진');
  var today = (ts || '').split(' ')[0] || ts;
  var hasEcos = !!(rateData && rateData.success && rateData.rates);

  // ── News HTML ──
  var categories = {};
  (news || []).forEach(function(n) { if (!categories[n.category]) categories[n.category] = []; categories[n.category].push(n); });
  var rowNum = 0;
  var newsHtml = Object.keys(categories).map(function(cat) {
    var items = categories[cat];
    var rows = items.map(function(n) {
      rowNum++;
      var bg = (rowNum % 2 === 1) ? '#FFFFFF' : '#F8FAFC';
      return '<tr><td style="background:' + bg + ';padding:9px 0;border-bottom:1px solid #EFF2F8;">' +
        '<table width="100%" cellpadding="0" cellspacing="0"><tr>' +
        '<td width="22" valign="top" style="font-size:11px;color:#C9A84C;font-weight:700;padding-top:3px;">' + rowNum + '.</td>' +
        '<td><a href="' + n.link + '" style="font-size:13px;color:#1B365D;text-decoration:none;line-height:1.75;font-weight:500;">' + n.title + '</a></td>' +
        '</tr></table></td></tr>';
    }).join('');
    return '<div style="margin-bottom:22px;">' +
      '<div style="margin-bottom:8px;">' +
      '<span style="display:inline-block;background:#1B365D;padding:4px 10px;border-radius:3px;font-size:10px;font-weight:800;color:#FFFFFF;letter-spacing:1.5px;">' + cat + '</span>' +
      '<span style="font-size:11px;color:#9AA3AE;margin-left:8px;">' + items.length + '건</span>' +
      '</div>' +
      '<table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #1B365D;">' + rows + '</table>' +
      '</div>';
  }).join('');

  // ── ECOS Rate HTML ──
  var rateHtml = '';
  if (hasEcos) {
    var rd = rateData.rates;
    var rateItems = [
      { label: '기준금리',       rate: rd.baseRate,  csi: false },
      { label: '주택담보대출',    rate: rd.mortgage,  csi: false },
      { label: '가계대출',        rate: rd.household, csi: false },
      { label: '기업대출',        rate: rd.corporate, csi: false },
      { label: '국고채 3년',      rate: rd.bond3y,    csi: false },
      { label: '국고채 10년',     rate: rd.bond10y,   csi: false },
      { label: 'CD 91일',         rate: rd.cd,        csi: false },
      { label: '신용대출',        rate: rd.credit,    csi: false },
      { label: '주택가격전망CSI', rate: rd.csi,       csi: true  },
      { label: '가계부채전망CSI', rate: rd.debtCsi,   csi: true  },
      { label: '소비자심리(CCSI)',rate: rd.ccsi,      csi: true  }
    ];

    // Rate cards grid
    rateHtml = '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Malgun Gothic,Apple SD Gothic Neo,dotum,sans-serif;">';
    for (var ri = 0; ri < rateItems.length; ri++) {
      if (ri % 4 === 0) rateHtml += '<tr>';
      var item = rateItems[ri];
      var val = item.rate && item.rate.rate ? item.rate.rate + (item.csi ? 'p' : '%') : 'N/A';
      var isCSI = item.csi;
      var valColor = isCSI ? '#059669' : '#1B365D';
      rateHtml += '<td width="25%" style="padding:10px 6px;text-align:center;border:1px solid #E8EDF5;background:#FFFFFF;">' +
        '<div style="font-size:10px;color:#8892A4;font-weight:700;margin-bottom:4px;letter-spacing:-0.3px;">' + item.label + '</div>' +
        '<div style="font-size:16px;font-weight:900;color:' + valColor + ';line-height:1;font-family:Malgun Gothic,Apple SD Gothic Neo,dotum,sans-serif;letter-spacing:0;">' + val + '</div>' +
        '</td>';
      if (ri % 4 === 3 || ri === rateItems.length - 1) rateHtml += '</tr>';
    }
    rateHtml += '</table>';

    // Trend table
    if (rateData.trends) {
      var CSI_KEYS_MAP = { csi: true, debtCsi: true, ccsi: true };
      var trendOrder = ['baseRate', 'mortgage', 'bond3y', 'bond10y', 'cd', 'csi', 'debtCsi', 'ccsi'];
      var trendRows = '';
      trendOrder.forEach(function(key) {
        var t = rateData.trends[key];
        if (!t || !t.current) return;
        var isCsi = !!CSI_KEYS_MAP[key];
        var unit = isCsi ? 'p' : '%', dUnit = isCsi ? 'p' : 'pp';
        var d3 = t.ago3m && t.ago3m.changeFromPastToNowPp != null ? t.ago3m.changeFromPastToNowPp : null;
        var d12 = t.ago12m && t.ago12m.changeFromPastToNowPp != null ? t.ago12m.changeFromPastToNowPp : null;
        function colorDelta(v) {
          if (v === null) return '<td style="text-align:right;color:#9CA3AF;border:1px solid #E8EDF5;padding:6px 8px;">-</td>';
          var n = parseFloat(v);
          var color = n > 0.005 ? '#DC2626' : n < -0.005 ? '#059669' : '#9CA3AF';
          return '<td style="text-align:right;color:' + color + ';font-weight:700;border:1px solid #E8EDF5;padding:6px 8px;font-size:11px;">' + (n > 0 ? '+' : '') + v + dUnit + '</td>';
        }
        trendRows += '<tr>' +
          '<td style="padding:6px 8px;font-weight:600;border:1px solid #E8EDF5;font-size:11px;color:#1B365D;">' + (t.label || key) + '</td>' +
          '<td style="text-align:right;border:1px solid #E8EDF5;padding:6px 8px;font-size:11px;">' + (t.current.rate ? t.current.rate + unit : '-') + '</td>' +
          '<td style="text-align:right;border:1px solid #E8EDF5;padding:6px 8px;font-size:11px;">' + (t.ago3m  ? t.ago3m.rate  + unit : '-') + '</td>' +
          '<td style="text-align:right;border:1px solid #E8EDF5;padding:6px 8px;font-size:11px;">' + (t.ago12m ? t.ago12m.rate + unit : '-') + '</td>' +
          colorDelta(d3) + colorDelta(d12) + '</tr>';
      });

      rateHtml += '<div style="margin-top:14px;font-family:Malgun Gothic,Apple SD Gothic Neo,dotum,sans-serif;">' +
        '<div style="font-size:10px;font-weight:700;color:#1B365D;margin-bottom:6px;letter-spacing:0.5px;">지표 변화 추이 (3M · 12M 전 대비)</div>' +
        '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' +
        '<tr style="background:#1B365D;">' +
        '<th style="padding:7px 8px;text-align:left;color:#FFFFFF;font-size:10px;font-weight:600;border:1px solid #264D85;">지표</th>' +
        '<th style="padding:7px 8px;text-align:right;color:#FFFFFF;font-size:10px;font-weight:600;border:1px solid #264D85;">현재</th>' +
        '<th style="padding:7px 8px;text-align:right;color:#FFFFFF;font-size:10px;font-weight:600;border:1px solid #264D85;">3M 전</th>' +
        '<th style="padding:7px 8px;text-align:right;color:#FFFFFF;font-size:10px;font-weight:600;border:1px solid #264D85;">12M 전</th>' +
        '<th style="padding:7px 8px;text-align:right;color:#C9A84C;font-size:10px;font-weight:600;border:1px solid #264D85;">Δ3M</th>' +
        '<th style="padding:7px 8px;text-align:right;color:#C9A84C;font-size:10px;font-weight:600;border:1px solid #264D85;">Δ12M</th>' +
        '</tr>' + trendRows + '</table></div>';

      // DSR strip
      if (rd.mortgage && rd.mortgage.rate) {
        var annualRate = parseFloat(rd.mortgage.rate);
        var r = annualRate / 100 / 12, n = 360;
        var dsrRows = '';
        [[5, '5억'], [7, '7억'], [10, '10억']].forEach(function(pair) {
          var loan = pair[0] * 1e8 * 0.7;
          var monthly = r === 0 ? loan / n : loan * (r * Math.pow(1+r,n)) / (Math.pow(1+r,n) - 1);
          dsrRows += '<td style="text-align:center;border:1px solid #E8EDF5;padding:8px;font-weight:700;color:#1B365D;font-size:13px;">월 ' + Math.round(monthly/10000).toLocaleString() + '만원</td>';
        });
        rateHtml += '<div style="margin-top:14px;font-family:Malgun Gothic,Apple SD Gothic Neo,dotum,sans-serif;">' +
          '<div style="font-size:10px;font-weight:700;color:#1B365D;margin-bottom:6px;">DSR 40% 기준 월상환 추산 <span style="font-weight:400;color:#6B7280;">(주담대 ' + rd.mortgage.rate + '%, 30년 원리금균등, LTV 70%)</span></div>' +
          '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' +
          '<tr style="background:#F8FAFC;">' +
          '<th style="padding:7px 8px;text-align:center;border:1px solid #E8EDF5;font-size:10px;color:#6B7280;font-weight:600;">분양가 5억</th>' +
          '<th style="padding:7px 8px;text-align:center;border:1px solid #E8EDF5;font-size:10px;color:#6B7280;font-weight:600;">분양가 7억</th>' +
          '<th style="padding:7px 8px;text-align:center;border:1px solid #E8EDF5;font-size:10px;color:#6B7280;font-weight:600;">분양가 10억</th>' +
          '</tr><tr>' + dsrRows + '</tr></table></div>';
      }
    }
  }

  // ── AI Report HTML ──
  function emailMdToHtml(t) {
    return t
      .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong style="color:#0D1F3C;font-weight:800;">$1</strong>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#0D1F3C;font-weight:700;">$1</strong>')
      .replace(/\*([^*\s][^*]*)\*/g, '<em style="color:#264D85;">$1</em>');
  }

  var SECTION_STYLES = [
    { numBg: '#1B365D', numColor: '#C9A84C', borderColor: '#1B365D', headerBg: '#F3F6FB', contentBg: '#F7FAFF', itemBorder: '#D8E2F2' },
    { numBg: '#264D85', numColor: '#FFFFFF', borderColor: '#264D85', headerBg: '#F3F7FD', contentBg: '#F8FBFF', itemBorder: '#D9E6F7' },
    { numBg: '#1A4D3C', numColor: '#FFFFFF', borderColor: '#1A4D3C', headerBg: '#F3FAF7', contentBg: '#F7FCFA', itemBorder: '#D8ECE4' },
    { numBg: '#4D1A3C', numColor: '#FFFFFF', borderColor: '#4D1A3C', headerBg: '#FCF5FA', contentBg: '#FFF9FD', itemBorder: '#EAD8E4' }
  ];

  var sections = [], curTitle = '', curLines = [], inSec = false;
  (aiReport || '').split('\n').forEach(function(line) {
    if (line.indexOf('## ') === 0) {
      if (inSec) sections.push({ title: curTitle, lines: curLines.slice(), isFocus: curTitle.indexOf('중점 분석') >= 0 });
      curTitle = line.replace(/^##\s+/, '').replace(/^\d+\.\s*/, '').replace(/^★\s*/, '');
      curLines = []; inSec = true;
    } else if (inSec) { curLines.push(line); }
  });
  if (inSec && curTitle) sections.push({ title: curTitle, lines: curLines, isFocus: curTitle.indexOf('중점 분석') >= 0 });

  var reportHtml = sections.map(function(sec, idx) {
    var s = sec.isFocus
      ? { numBg: '#7B5E2A', numColor: '#FFE89A', borderColor: '#C9A84C', headerBg: '#FFF8E1', contentBg: '#FFFCF2', itemBorder: '#E8D7A4' }
      : SECTION_STYLES[idx % SECTION_STYLES.length];
    var num = idx < 9 ? '0' + (idx + 1) : String(idx + 1);
    if (sec.isFocus) num = '★';

    var contentHtml = sec.lines.map(function(line) {
      var t = line.trim();
      if (!t) return '<div style="height:5px;"></div>';
      if (/^[-─━=]{3,}$/.test(t)) return '<div style="height:6px;"></div>';
      var processed = emailMdToHtml(t)
        .replace(/^-\s*(왜[^:]*:|무엇을[^:]*:)/, '- <strong style="color:' + s.borderColor + ';">$1</strong>');
      var isLvl1 = /^[가-하]\./.test(t) || /^[①-⑨]/.test(t) || /^\d+\)/.test(t);
      var isLvl2 = /^[-·•]\s/.test(t);
      if (isLvl1) {
        return '<div style="margin:8px 0;padding:9px 12px;background:#FFFFFF;border:1px solid ' + s.itemBorder + ';border-radius:4px;font-size:13px;color:#2D3748;line-height:1.85;letter-spacing:-0.2px;">' + processed + '</div>';
      }
      if (isLvl2) {
        return '<div style="margin:5px 0 5px 12px;font-size:12.5px;color:#4A5568;line-height:1.8;">' + processed + '</div>';
      }
      return '<div style="font-size:13.5px;color:#2D3748;line-height:1.85;margin:5px 0;letter-spacing:-0.3px;">' + processed + '</div>';
    }).join('');

    var contentWrapper = '<div style="background:' + s.contentBg + ';border-top:1px solid ' + s.itemBorder + ';padding:16px 18px 18px;">' + contentHtml + '</div>';

    return '<div style="margin-bottom:24px;background:#FFFFFF;border:1px solid ' + s.itemBorder + ';border-top:4px solid ' + s.borderColor + ';border-radius:6px;">' +
      '<table width="100%" cellpadding="0" cellspacing="0" style="background:' + s.headerBg + ';">' +
      '<tr>' +
      '<td width="42" valign="middle" style="padding:13px 0 13px 16px;">' +
      '<div style="width:30px;height:30px;background:' + s.numBg + ';border-radius:4px;text-align:center;line-height:30px;font-size:' + (sec.isFocus?'14':'12') + 'px;font-weight:900;color:' + s.numColor + ';font-family:Malgun Gothic,Apple SD Gothic Neo,dotum,sans-serif;letter-spacing:0;">' + num + '</div>' +
      '</td>' +
      '<td valign="middle" style="padding:13px 16px 13px 10px;">' +
      '<div style="font-size:15px;font-weight:800;color:#0D1F3C;letter-spacing:-0.5px;line-height:1.45;">' + sec.title + '</div>' +
      '</td></tr></table>' +
      contentWrapper + '</div>';
  }).join('');

  if (!reportHtml) {
    reportHtml = '<div style="font-size:13.5px;color:#2D3748;line-height:1.85;padding:18px 20px;border:1px solid #D8E2F2;border-top:4px solid #1B365D;background:#F7FAFF;border-radius:6px;">' + emailMdToHtml(aiReport || '') + '</div>';
  }

  // ── Assemble email ──
  return '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>' +
    '<body style="margin:0;padding:20px;background:#E4EBF5;font-family:\'Malgun Gothic\',\'Apple SD Gothic Neo\',dotum,sans-serif;">' +
    '<table width="680" align="center" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;width:100%;margin:0 auto;background:#FFFFFF;">' +

    // [1] Top classification banner
    '<tr><td style="background:#060F20;padding:6px 24px;">' +
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td style="font-size:9px;color:#C9A84C;font-weight:700;letter-spacing:2.5px;">INTERNAL USE ONLY</td>' +
    '<td style="font-size:9px;color:#374050;letter-spacing:1px;text-align:right;">DAEKWANG GROUP &middot; HOUSING MANAGEMENT TEAM</td>' +
    '</tr></table></td></tr>' +

    // [2] Header
    '<tr><td style="background:linear-gradient(135deg,#060F20 0%,#172A45 100%);padding:0;">' +
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td style="padding:36px 24px 36px 32px;" valign="top">' +
    '<div style="font-size:10px;color:#C9A84C;font-weight:700;letter-spacing:3px;margin-bottom:14px;">DAEKWANG GROUP &middot; LOGEBIEN</div>' +
    '<div style="font-size:24px;font-weight:900;color:#FFFFFF;letter-spacing:-1.5px;line-height:1.2;margin-bottom:10px;">부동산 동향<br>심층 분석 브리핑</div>' +
    '<div style="font-size:11px;color:#4A5E70;letter-spacing:0.5px;">Real Estate Market Intelligence Report</div>' +
    (hasEcos ? '<div style="margin-top:10px;display:inline-block;background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.3);border-radius:3px;padding:3px 10px;font-size:10px;color:#C9A84C;letter-spacing:1px;">&#127979; ECOS 11대 지표 통합 분석</div>' : '') +
    '</td>' +
    '<td style="padding:32px 32px 32px 0;vertical-align:top;width:185px;">' +
    '<table cellpadding="0" cellspacing="0" align="right" style="background:rgba(255,255,255,0.05);border:1px solid rgba(201,168,76,0.2);border-radius:6px;">' +
    '<tr><td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">' +
    '<div style="font-size:9px;color:#4A5E70;letter-spacing:2px;margin-bottom:4px;">REPORT DATE</div>' +
    '<div style="font-size:12px;color:#FFFFFF;font-weight:700;">' + today + '</div>' +
    '</td></tr>' +
    '<tr><td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">' +
    '<div style="font-size:9px;color:#4A5E70;letter-spacing:2px;margin-bottom:4px;">수집 기사</div>' +
    '<div style="font-size:20px;color:#C9A84C;font-weight:900;line-height:1;">' + newsCount + '<span style="font-size:10px;color:#4A5E70;font-weight:400;"> 건</span></div>' +
    '</td></tr>' +
    '<tr><td style="padding:12px 16px;">' +
    '<div style="font-size:9px;color:#4A5E70;letter-spacing:2px;margin-bottom:4px;">AI ENGINE</div>' +
    '<div style="font-size:10px;color:#8A9BB0;line-height:1.5;">' + modelLabel + '</div>' +
    '</td></tr>' +
    '</table></td>' +
    '</tr></table></td></tr>' +

    // [3] Gold accent line
    '<tr><td style="height:3px;font-size:0;line-height:0;background:linear-gradient(90deg,#6A4F28,#C9A84C,#E5C96A,#C9A84C,#6A4F28);">&nbsp;</td></tr>' +

    // [4] Report label
    '<tr><td style="padding:18px 32px 12px;background:#FAFBFD;border-bottom:1px solid #EDF0F7;">' +
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td><span style="font-size:11px;font-weight:800;color:#C9A84C;letter-spacing:2px;">AI DEEP ANALYSIS REPORT</span>' +
    (hasEcos ? '<span style="font-size:9px;color:#059669;font-weight:600;margin-left:10px;background:#ECFDF5;padding:2px 8px;border-radius:3px;border:1px solid #A7F3D0;">ECOS LIVE</span>' : '') +
    '</td>' +
    '<td style="text-align:right;"><span style="background:#1B365D;border-radius:3px;padding:4px 10px;font-size:9px;color:#FFFFFF;font-weight:700;letter-spacing:1px;">대광그룹 주택관리팀</span></td>' +
    '</tr></table></td></tr>' +

    // [5] AI report body
    '<tr><td style="padding:24px 32px 20px;background:#FAFBFD;">' + reportHtml + '</td></tr>' +

    // [6] ECOS section (if available)
    (hasEcos ?
      '<tr><td style="padding:0 32px 28px;background:#FAFBFD;">' +
      '<div style="border-top:2px solid #1B365D;padding-top:18px;">' +
      '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;"><tr>' +
      '<td><span style="background:linear-gradient(135deg,#1B365D,#264D85);color:#FFFFFF;font-size:10px;font-weight:800;padding:4px 10px;border-radius:3px;letter-spacing:1px;">ECOS DATA</span>' +
      '<span style="font-size:13px;font-weight:700;color:#1B365D;margin-left:8px;">한국은행 금융·심리 11대 지표</span></td>' +
      '<td style="text-align:right;"><span style="font-size:10px;color:#9AA3AE;">' + (rateData.fetchedAt || today) + ' 기준</span></td>' +
      '</tr></table>' +
      rateHtml +
      '</div></td></tr>'
    : '') +

    // [7] Visual break
    '<tr><td style="background:linear-gradient(to right,#DDE3F0,#E8EDF5,#DDE3F0);height:8px;font-size:0;">&nbsp;</td></tr>' +

    // [8] News header
    '<tr><td style="padding:26px 32px 14px;background:#FFFFFF;">' +
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td><span style="font-size:14px;font-weight:800;color:#0D1F3C;letter-spacing:-0.5px;">수집 뉴스 원문</span></td>' +
    '<td style="text-align:right;"><span style="font-size:11px;color:#9AA3AE;">총 ' + newsCount + '건</span></td>' +
    '</tr><tr><td colspan="2" style="padding-top:6px;"><div style="height:2px;background:linear-gradient(90deg,#1B365D,rgba(27,54,93,0));"></div></td></tr>' +
    '</table></td></tr>' +

    // [9] News items
    '<tr><td style="padding:0 32px 32px;background:#FFFFFF;">' + newsHtml + '</td></tr>' +

    // [10] Footer
    '<tr><td style="background:linear-gradient(135deg,#060F20,#0D1F3C);padding:28px 32px;">' +
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td valign="top">' +
    '<div style="font-size:20px;font-weight:900;color:#FFFFFF;letter-spacing:-1px;margin-bottom:6px;">대광<span style="color:#C9A84C;">로제비앙</span></div>' +
    '<div style="font-size:11px;color:#374050;line-height:1.7;">대광그룹 주택관리팀<br>Daekwang Group &middot; Housing Management Team</div>' +
    '</td>' +
    '<td style="text-align:right;vertical-align:top;padding-left:20px;">' +
    '<div style="font-size:10px;color:#374050;line-height:1.9;">본 보고서는 Google News RSS' + (hasEcos ? ', 한국은행 ECOS API' : '') + ' 및 AI가<br>자동 생성한 참고 자료입니다. 단독 의사결정에 활용 금지.<br><span style="color:#2A3040;">&copy; Daekwang Group. All rights reserved.</span></div>' +
    '</td></tr></table></td></tr>' +

    // [11] Bottom classification strip
    '<tr><td style="background:#C9A84C;padding:5px 24px;">' +
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td style="font-size:9px;color:#3A2800;font-weight:800;letter-spacing:2.5px;">CONFIDENTIAL</td>' +
    '<td style="font-size:9px;color:#5A4000;letter-spacing:1px;text-align:right;">외부 유출 금지 &middot; For Internal Distribution Only</td>' +
    '</tr></table></td></tr>' +

    '</table></body></html>';
}

// 뉴스 파싱 필수 유틸리티
String.prototype.rsplit = function(sep, maxsplit) {
  var parts = this.split(sep);
  if (maxsplit !== undefined && parts.length > maxsplit + 1) {
    return [parts.slice(0, parts.length - maxsplit).join(sep)].concat(parts.slice(parts.length - maxsplit));
  }
  return parts;
};
