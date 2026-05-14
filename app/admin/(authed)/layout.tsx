import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function logoutAction() {
  "use server";
  const store = await cookies();
  store.delete("admin_token");
  redirect("/");
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="admin-header">
        <div className="admin-header-inner">
          <Link href="/" className="admin-back">
            ← 홈
          </Link>
          <nav className="admin-nav">
            <Link href="/admin" className="admin-nav-link">
              대시보드
            </Link>
            <Link href="/admin/history" className="admin-nav-link">
              기록
            </Link>
            <Link href="/admin/stats" className="admin-nav-link">
              통계
            </Link>
            <Link href="/admin/settings" className="admin-nav-link">
              설정
            </Link>
            <form action={logoutAction} className="admin-logout-form">
              <button type="submit" className="admin-logout">
                로그아웃
              </button>
            </form>
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}
