import { mdToHtml } from "@/lib/markdown";

interface Section {
  title: string;
  body: string;
  isFocus: boolean;
}

function parseReport(aiReport: string): Section[] {
  const sections: Section[] = [];
  let curTitle = "";
  let curLines: string[] = [];
  let inSec = false;

  aiReport.split("\n").forEach((line) => {
    if (line.startsWith("## ")) {
      if (inSec) {
        sections.push({
          title: curTitle,
          body: curLines.join("\n"),
          isFocus: curTitle.indexOf("중점 분석") >= 0,
        });
      }
      curTitle = line
        .replace(/^##\s+/, "")
        .replace(/^\d+\.\s*/, "")
        .replace(/^★\s*/, "");
      curLines = [];
      inSec = true;
    } else if (inSec) {
      curLines.push(line);
    }
  });
  if (inSec && curTitle) {
    sections.push({
      title: curTitle,
      body: curLines.join("\n"),
      isFocus: curTitle.indexOf("중점 분석") >= 0,
    });
  }
  return sections;
}

function renderSectionBody(body: string): string {
  return body
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t) return "<br/>";
      const processed = mdToHtml(t);
      const isLvl1 =
        /^[가-하]\./.test(t) || /^[①-⑨]/.test(t) || /^\d+\)/.test(t);
      if (isLvl1) {
        return `<div class="indent">${processed}</div>`;
      }
      return `<div>${processed}</div>`;
    })
    .join("");
}

export default function ReportSections({ aiReport }: { aiReport: string }) {
  const sections = parseReport(aiReport);
  if (sections.length === 0) {
    return (
      <div
        className="report-section-body"
        dangerouslySetInnerHTML={{ __html: mdToHtml(aiReport) }}
      />
    );
  }
  return (
    <>
      {sections.map((sec, idx) => (
        <div
          key={idx}
          className={`report-section ${sec.isFocus ? "focus" : ""}`}
        >
          <div className="report-section-header">
            <div className="report-section-num">
              {sec.isFocus ? "★" : String(idx + 1).padStart(2, "0")}
            </div>
            <div className="report-section-title">{sec.title}</div>
          </div>
          <div
            className="report-section-body"
            dangerouslySetInnerHTML={{
              __html: renderSectionBody(sec.body),
            }}
          />
        </div>
      ))}
    </>
  );
}
