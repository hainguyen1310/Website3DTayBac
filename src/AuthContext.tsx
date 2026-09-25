import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./utils/supabase";
import { invalidateCache } from "./services/cache";
import type { StaffScope } from "./operations";

export type StaffRole = "admin" | "staff" | "customer";

export type Profile = {
  id: string;
  fullName: string;
  role: StaffRole;
  staffScope: StaffScope;
};

type Auth = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isStaff: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);
export const useAuth = () => useContext(AuthContext)!;

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, staff_scope")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id as string,
    fullName: (data.full_name as string | null) ?? "",
    role: data.role as StaffRole,
    staffScope: data.staff_scope as StaffScope,
  };
}

/**
 * Phiên đăng nhập Supabase Auth và vai trò trong bảng profiles.
 * Chỉ tài khoản có role admin/staff mới đọc được dữ liệu vận hành qua RLS.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (userId: string | null) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      setProfile(await loadProfile(userId));
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void refreshProfile(data.session?.user.id ?? null).finally(() => {
        if (active) setLoading(false);
      });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        invalidateCache("admin:");
        setSession(nextSession);
        // Đọc profiles sau khi Supabase Auth nhả khóa nội bộ.
        window.setTimeout(() => {
          void refreshProfile(nextSession?.user.id ?? null);
        }, 0);
      },
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw new Error(error.message);
      setSession(data.session);
      await refreshProfile(data.user.id);
    },
    [refreshProfile],
  );

  const signOut = useCallback(async () => {
    invalidateCache();
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo<Auth>(
    () => ({
      session,
      profile,
      loading,
      isStaff: profile?.role === "admin" || profile?.role === "staff",
      signIn,
      signOut,
    }),
    [session, profile, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
