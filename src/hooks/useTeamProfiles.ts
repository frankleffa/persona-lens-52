import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export function useTeamProfiles() {
  return useQuery({
    queryKey: ["team-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      if (error) throw error;
      return (data || []) as TeamProfile[];
    },
  });
}
