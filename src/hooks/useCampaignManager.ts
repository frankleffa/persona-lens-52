import { useState, useCallback, useRef } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  CampaignCreateData,
  AdsetCreateData,
  AdCreateData,
  CampaignStatus,
  Interest,
  FacebookPage,
} from "@/types/campaign-manager";

async function invoke<T = any>(action: string, clientId: string | undefined, data?: Record<string, any>): Promise<T> {
  const body: Record<string, any> = { action };
  if (clientId) body.client_id = clientId;
  if (data) body.data = data;

  const { data: res, error } = await supabase.functions.invoke("manage-campaigns", { body });

  if (error) throw new Error(error.message || "Erro na requisição.");
  if (res?.error) throw new Error(res.message || res.error);
  return res as T;
}

export function useCampaignManager(clientId: string | undefined) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interestQuery, setInterestQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Pages (cached) ──
  const pagesQuery = useQuery({
    queryKey: ["meta-pages", clientId],
    queryFn: () => invoke<FacebookPage[]>("list_pages", undefined),
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000,
  });

  // ── Interest search (debounced) ──
  const interestsQuery = useQuery({
    queryKey: ["meta-interests", interestQuery],
    queryFn: () => invoke<Interest[]>("search_interests", undefined, { query: interestQuery }),
    enabled: interestQuery.length >= 2,
    staleTime: 10 * 60 * 1000,
  });

  const searchInterests = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setInterestQuery("");
      return;
    }
    debounceRef.current = setTimeout(() => setInterestQuery(query), 300);
  }, []);

  // ── Mutations ──

  const createCampaign = useCallback(async (data: CampaignCreateData) => {
    setIsCreating(true);
    setError(null);
    try {
      const result = await invoke<{ campaign_id: string }>("create_campaign", clientId, data as any);
      toast.success("Campanha criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["daily_campaigns"] });
      return result;
    } catch (err: any) {
      const msg = err.message || "Erro ao criar campanha.";
      setError(msg);
      toast.error(msg);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [clientId, queryClient]);

  const createAdset = useCallback(async (data: AdsetCreateData) => {
    setIsCreating(true);
    setError(null);
    try {
      const result = await invoke<{ adset_id: string }>("create_adset", clientId, data as any);
      toast.success("Conjunto de anúncios criado!");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      return result;
    } catch (err: any) {
      const msg = err.message || "Erro ao criar conjunto.";
      setError(msg);
      toast.error(msg);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [clientId, queryClient]);

  const createAd = useCallback(async (data: AdCreateData) => {
    setIsCreating(true);
    setError(null);
    try {
      const result = await invoke<{ ad_id: string; creative_id: string }>("create_ad", clientId, data as any);
      toast.success("Anúncio criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      return result;
    } catch (err: any) {
      const msg = err.message || "Erro ao criar anúncio.";
      setError(msg);
      toast.error(msg);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [clientId, queryClient]);

  const updateStatus = useCallback(async (objectId: string, status: CampaignStatus) => {
    setIsUpdating(true);
    setError(null);
    try {
      await invoke("update_status", clientId, { object_id: objectId, status });
      toast.success(`Status atualizado para ${status}.`);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["daily_campaigns"] });
    } catch (err: any) {
      const msg = err.message || "Erro ao atualizar status.";
      setError(msg);
      toast.error(msg);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [clientId, queryClient]);

  const updateBudget = useCallback(async (objectId: string, dailyBudget: number) => {
    setIsUpdating(true);
    setError(null);
    try {
      await invoke("update_budget", clientId, { object_id: objectId, daily_budget: dailyBudget });
      toast.success("Orçamento atualizado!");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (err: any) {
      const msg = err.message || "Erro ao atualizar orçamento.";
      setError(msg);
      toast.error(msg);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [clientId, queryClient]);

  const duplicateCampaign = useCallback(async (campaignId: string, newName: string, budgetMultiplier?: number) => {
    setIsUpdating(true);
    setError(null);
    try {
      const result = await invoke<{ new_campaign_id: string }>("duplicate_campaign", clientId, {
        campaign_id: campaignId,
        new_name: newName,
        budget_multiplier: budgetMultiplier,
        status: "PAUSED",
      });
      toast.success("Campanha duplicada!");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      return result;
    } catch (err: any) {
      const msg = err.message || "Erro ao duplicar campanha.";
      setError(msg);
      toast.error(msg);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [clientId, queryClient]);

  return {
    createCampaign,
    createAdset,
    createAd,
    updateStatus,
    updateBudget,
    duplicateCampaign,
    searchInterests,
    interests: interestsQuery.data ?? [],
    isSearchingInterests: interestsQuery.isLoading,
    pages: pagesQuery.data ?? [],
    isLoadingPages: pagesQuery.isLoading,
    isCreating,
    isUpdating,
    error,
  };
}
