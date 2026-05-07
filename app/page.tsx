import { createClient } from "@/lib/supabase/server";
import HomeView from "@/components/HomeView";
import { signOut } from "./actions";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <HomeView email={user?.email} onSignOut={signOut} />;
}
