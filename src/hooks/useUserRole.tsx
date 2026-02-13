import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "manager" | "client";

interface UserRoleData {
  role: AppRole;
  loading: boolean;
  managerId: string | null; // for clients: their linked manager
}

export function useUserRole(): UserRoleData {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole>("manager");
  const [loading, setLoading] = useState(true);
  const [managerId, setManagerId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchRole() {
      setLoading(true);

      // Get role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .limit(1);

      const userRole = (roles?.[0]?.role as AppRole) || "manager";
      setRole(userRole);

      // If client, get linked manager
      if (userRole === "client") {
        const { data: link } = await supabase
          .from("client_manager_links")
          .select("manager_id")
          .eq("client_user_id", user!.id)
          .limit(1);

        setManagerId(link?.[0]?.manager_id || null);
      }

      setLoading(false);
    }

    fetchRole();
  }, [user]);

  return { role, loading, managerId };
}
