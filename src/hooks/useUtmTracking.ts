import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UtmTrackingRow {
  campaign: string;
  medium: string;
  source: string;
  quantidade: number;
  valor: number;
}

export type UtmTrackingSource = "orders" | "leads";

interface RawOrder {
  amount: number | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_source: string | null;
}

interface RawLead {
  ltv_total: number | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_source: string | null;
}

const NULL_LABEL = "(não definido)";
const norm = (v: string | null | undefined) => (v && v.trim() !== "" ? v.trim() : NULL_LABEL);

export function useUtmTracking(clientId: string | undefined, source: UtmTrackingSource = "orders") {
  const [rows, setRows] = useState<UtmTrackingRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!clientId) {
        setRows([]);
        return;
      }
      setLoading(true);

      let raw: Array<{ amount: number; utm_campaign: string | null; utm_medium: string | null; utm_source: string | null }> = [];

      if (source === "orders") {
        const { data, error } = await supabase
          .from("meta_orders")
          .select("amount, utm_campaign, utm_medium, utm_source, customer_id, meta_customers!inner(client_id)")
          .eq("meta_customers.client_id", clientId)
          .limit(10000);
        if (!error && data) {
          raw = (data as unknown as RawOrder[]).map((r) => ({
            amount: Number(r.amount) || 0,
            utm_campaign: r.utm_campaign,
            utm_medium: r.utm_medium,
            utm_source: r.utm_source,
          }));
        }
      } else {
        const { data, error } = await supabase
          .from("leads")
          .select("ltv_total, utm_campaign, utm_medium, utm_source")
          .eq("client_id", clientId)
          .limit(10000);
        if (!error && data) {
          raw = (data as RawLead[]).map((r) => ({
            amount: Number(r.ltv_total) || 0,
            utm_campaign: r.utm_campaign,
            utm_medium: r.utm_medium,
            utm_source: r.utm_source,
          }));
        }
      }

      const map = new Map<string, UtmTrackingRow>();
      for (const r of raw) {
        const campaign = norm(r.utm_campaign);
        const medium = norm(r.utm_medium);
        const src = norm(r.utm_source);
        const key = `${campaign}|${medium}|${src}`;
        const existing = map.get(key);
        if (existing) {
          existing.quantidade += 1;
          existing.valor += r.amount;
        } else {
          map.set(key, { campaign, medium, source: src, quantidade: 1, valor: r.amount });
        }
      }

      const out = Array.from(map.values()).sort((a, b) => b.valor - a.valor);
      if (!cancelled) {
        setRows(out);
        setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [clientId, source]);

  return { rows, loading };
}
