import SettingsView from "./SettingsView";
import AiHealthCheck from "./AiHealthCheck";
import { getStoredAccessKey } from "@/lib/access-key-store";
import { aiAvailability } from "@/lib/ai/keys";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminSettingsPage() {
  let currentKey = "";
  let error: string | null = null;
  try {
    currentKey = await getStoredAccessKey();
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="page-wrapper">
      <header className="site-header">
        <div className="brand-badge">ADMIN</div>
        <h1>
          관리자 <span>설정</span>
        </h1>
        <p className="subtitle">사이트 접근키 · AI 프로바이더 헬스체크</p>
      </header>

      {error && (
        <div className="card">
          <div className="card-body">
            <div className="alert">{error}</div>
          </div>
        </div>
      )}

      <SettingsView initialKey={currentKey} />
      <AiHealthCheck availability={aiAvailability()} />
    </div>
  );
}
