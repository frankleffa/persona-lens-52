import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "manager" | "client";

interface UserRoleData {
  role: AppRole;
  loading: boolean;
  managerId: string | null;
}

async function fetchUserRole(userId: string): Promise<{ role: AppRole; managerId: string | null }> {
  // Get role
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1);

  const role = (roles?.[0]?.role as AppRole) || "manager";

  // If client, get linked manager
  let managerId: string | null = null;
  if (role === "client") {
    const { data: link } = await supabase
      .from("client_manager_links")
      .select("manager_id")
      .eq("client_user_id", userId)
      .limit(1);

    managerId = link?.[0]?.manager_id || null;
  }

  return { role, managerId };
}

export function useUserRole(): UserRoleData {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: () => fetchUserRole(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes — role rarely changes
    retry: 2,
  });

  return {
    role: data?.role ?? "manager",
    loading: isLoading,
    managerId: data?.managerId ?? null,
  };
}
