"use client";

import { useMemo, useState } from "react";
import type { NewsItem } from "@/lib/types";

interface Props {
  news: NewsItem[];
}

export default function NewsTabs({ news }: Props) {
  const categories = useMemo(() => {
    const map: Record<string, NewsItem[]> = {};
    news.forEach((n) => {
      if (!map[n.category]) map[n.category] = [];
      map[n.category].push(n);
    });
    return map;
  }, [news]);

  const tabs = ["전체", ...Object.keys(categories)];
  const [active, setActive] = useState("전체");

  const visible = active === "전체" ? news : categories[active] || [];

  return (
    <div className="news-section">
      <div className="news-tabs">
        {tabs.map((t) => {
          const count = t === "전체" ? news.length : categories[t]?.length || 0;
          return (
            <button
              key={t}
              type="button"
              className={`news-tab ${active === t ? "active" : ""}`}
              onClick={() => setActive(t)}
            >
              {t} ({count})
            </button>
          );
        })}
      </div>
      <ul className="news-list">
        {visible.map((n, idx) => (
          <li key={`${n.link}-${idx}`}>
            <span className="num">{idx + 1}.</span>
            <div>
              <span className="cat">{n.category}</span>
              <a href={n.link} target="_blank" rel="noopener noreferrer">
                {n.title}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
