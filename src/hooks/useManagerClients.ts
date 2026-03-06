import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface ManagerClient {
  id: string;
  client_label: string;
  is_demo: boolean;
}

async function fetchManagerClients(userId: string): Promise<ManagerClient[]> {
  const { data, error } = await supabase
    .from("client_manager_links")
    .select("client_user_id, client_label, is_demo")
    .eq("manager_id", userId)
    .order("client_label", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((client) => ({
    id: client.client_user_id,
    client_label: client.client_label,
    is_demo: client.is_demo ?? false,
  }));
}

export function useManagerClients(enabled = true) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["managerClients", user?.id],
    queryFn: () => fetchManagerClients(user!.id),
    enabled: !!user?.id && enabled,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  return { clients: data ?? [], loading: isLoading };
}
