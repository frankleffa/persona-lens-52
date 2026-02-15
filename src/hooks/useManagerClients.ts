import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface ManagerClient {
  id: string;
  client_label: string;
  is_demo: boolean;
}

interface UseManagerClientsResult {
  clients: ManagerClient[];
  loading: boolean;
}

export function useManagerClients(enabled = true): UseManagerClientsResult {
  const { user } = useAuth();
  const [clients, setClients] = useState<ManagerClient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !user?.id) {
      setClients([]);
      setLoading(false);
      return;
    }

    async function fetchManagerClients() {
      setLoading(true);

      const { data, error } = await supabase
        .from("client_manager_links")
        .select("client_user_id, client_label, is_demo")
        .eq("manager_id", user.id)
        .order("client_label", { ascending: true });

      if (error) {
        console.error("Failed to load manager clients", error);
        setClients([]);
      } else {
        setClients(
          (data ?? []).map((client) => ({
            id: client.client_user_id,
            client_label: client.client_label,
            is_demo: client.is_demo ?? false,
          })),
        );
      }

      setLoading(false);
    }

    fetchManagerClients();
  }, [enabled, user?.id]);

  return { clients, loading };
}
