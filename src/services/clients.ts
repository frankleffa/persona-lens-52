/**
 * Service for fetching manager clients from Supabase.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Client } from "@/lib/types";

export interface ManagerClient extends Client {
    email?: string;
}

/** Fetch all clients linked to a manager user. */
export async function fetchManagerClients(userId: string): Promise<ManagerClient[]> {
    const { data, error } = await supabase
        .from("client_manager_links")
        .select("client_user_id, client_label")
        .eq("manager_id", userId);

    if (error) throw error;

    const clients: ManagerClient[] = [];

    for (const row of data || []) {
        const label = row.client_label || "Cliente";
        const initials = label
            .split(" ")
            .map((w: string) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
        clients.push({
            id: row.client_user_id,
            name: label,
            company: "",
            avatarInitials: initials,
        });
    }

    return clients;
}
