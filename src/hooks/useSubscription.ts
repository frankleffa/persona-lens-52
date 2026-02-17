import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCallback } from "react";

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string | null;
  status: string;
  started_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
  plan?: {
    id: string;
    name: string;
    max_clients: number;
    max_ad_accounts: number;
    features: Record<string, unknown>;
  } | null;
}

export function useSubscription() {
  const { user } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async (): Promise<Subscription | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        plan: data.plans as Subscription["plan"],
      };
    },
    enabled: !!user?.id,
  });

  const isActive = subscription?.status === "active";
  const maxClients = subscription?.plan?.max_clients ?? 0;
  const maxAdAccounts = subscription?.plan?.max_ad_accounts ?? 0;

  const hasFeature = useCallback(
    (featureKey: string): boolean => {
      if (!subscription?.plan?.features) return false;
      return subscription.plan.features[featureKey] === true;
    },
    [subscription]
  );

  return {
    subscription,
    isLoading,
    isActive,
    maxClients,
    maxAdAccounts,
    planName: subscription?.plan?.name ?? null,
    hasFeature,
  };
}
