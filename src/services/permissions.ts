/**
 * Service for loading and saving client metric permissions.
 */

import { supabase } from "@/lib/supabase";
import { METRIC_DEFINITIONS, type MetricKey } from "@/lib/types";

export type PermissionMap = Record<string, boolean>;

/** Load permissions for a client, defaulting all metrics to visible. */
export async function loadClientPermissions(clientId: string): Promise<PermissionMap> {
    const { data, error } = await supabase
        .from("client_metric_visibility")
        .select("metric_key, is_visible")
        .eq("client_user_id", clientId);

    if (error) throw error;

    const map: PermissionMap = {};
    // Default all metrics to visible
    METRIC_DEFINITIONS.forEach((m) => {
        map[m.key] = true;
    });
    // Override with DB values
    data?.forEach((row) => {
        map[row.metric_key] = row.is_visible;
    });

    return map;
}

/** Save permission overrides for a client. */
export async function saveClientPermissions(
    clientId: string,
    permissions: PermissionMap
): Promise<void> {
    const rows = Object.entries(permissions).map(([metric_key, is_visible]) => ({
        client_user_id: clientId,
        metric_key,
        is_visible,
    }));

    const { error } = await supabase
        .from("client_metric_visibility")
        .upsert(rows, { onConflict: "client_user_id,metric_key" });

    if (error) throw error;
}
