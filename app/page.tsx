import HomeView from "@/components/HomeView";
import { aiAvailability } from "@/lib/ai/keys";

// 환경변수(설정된 키 슬롯)를 런타임마다 읽기 위해 동적 렌더
export const dynamic = "force-dynamic";

export default function HomePage() {
  return <HomeView availability={aiAvailability()} />;
}
