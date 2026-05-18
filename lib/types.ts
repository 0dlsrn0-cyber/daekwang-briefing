export type AiModel =
  | "gemini"
  | "gemini3"
  | "gemini31"
  | "claude"
  | "openai"
  | "grok"
  | "mistral"
  | "perplexity"
  | "github"
  | "cohere"
  | "openrouter";

export interface NewsItem {
  category: string;
  title: string;
  link: string;
  pubDate: string;
  body?: string;
}

export interface NewsResult {
  success: boolean;
  news: NewsItem[];
  errors: string[];
}

export interface RatePoint {
  rate: string | null;
  date?: string;
  rawTime?: string;
}

export interface Rate {
  label: string;
  sublabel: string;
  rate: string | null;
  date?: string;
  rawTime?: string;
}

export interface TrendPoint {
  rate: string;
  date: string;
  rawTime: string;
  changeFromPastToNowPp: string | null;
}

export interface Trend {
  label: string;
  current: { rate: string; date: string; rawTime: string } | null;
  ago3m: TrendPoint | null;
  ago6m: TrendPoint | null;
  ago12m: TrendPoint | null;
  monthsAvailable: number;
}

export type RatesMap = Partial<Record<RateKey, Rate>>;
export type TrendsMap = Partial<Record<RateKey, Trend>>;

export type RateKey =
  | "baseRate"
  | "mortgage"
  | "household"
  | "corporate"
  | "bond3y"
  | "bond10y"
  | "cd"
  | "credit"
  | "csi"
  | "debtCsi"
  | "ccsi";

export interface RateData {
  success: boolean;
  rates: RatesMap;
  trends: TrendsMap;
  errors: string[] | null;
  fetchedAt?: string;
}

export interface BriefingResult {
  success: boolean;
  news?: NewsItem[];
  aiReport?: string;
  ts?: string;
  newsCount?: number;
  focusPoint?: string;
  rateData?: RateData | null;
  aiModel?: AiModel;
  error?: string;
  runId?: string;
}

export interface BriefingParams {
  aiKey: string;
  aiModel: AiModel;
  focusPoint?: string;
  ecosKey?: string;
}
