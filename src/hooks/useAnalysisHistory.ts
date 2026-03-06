import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { AnalysisReport } from "./useDeepAnalysis";
import type { AutomationLog } from "./useAutomation";

export interface TimelineItem {
    type: "report" | "automation";
    date: string;
    data: AnalysisReport | AutomationLog;
}

export interface WeeklyAverage {
    current: number;
    previous: number;
}

export function useAnalysisHistory(
    clientId: string | undefined,
    days: number = 30
) {
    // Fetch analysis reports for the period
    const reportsQuery = useQuery({
        queryKey: ["analysis-history-reports", clientId, days],
        queryFn: async (): Promise<AnalysisReport[]> => {
            if (!clientId) return [];

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffStr = cutoffDate.toISOString();

            const { data, error } = await (supabase
                .from("analysis_reports" as any)
                .select("*") as any)
                .eq("client_id", clientId)
                .gte("created_at", cutoffStr)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return (data as AnalysisReport[]) ?? [];
        },
        enabled: !!clientId,
        staleTime: 5 * 60 * 1000,
    });

    // Fetch automation logs for the period
    const logsQuery = useQuery({
        queryKey: ["analysis-history-logs", clientId, days],
        queryFn: async (): Promise<AutomationLog[]> => {
            if (!clientId) return [];

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffStr = cutoffDate.toISOString();

            const { data, error } = await (supabase
                .from("automation_log" as any)
                .select("*") as any)
                .eq("client_id", clientId)
                .gte("created_at", cutoffStr)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return (data as AutomationLog[]) ?? [];
        },
        enabled: !!clientId,
        staleTime: 5 * 60 * 1000,
    });

    // Build unified timeline
    const reports = reportsQuery.data ?? [];
    const logs = logsQuery.data ?? [];

    const timeline: TimelineItem[] = [
        ...reports.map((r) => ({
            type: "report" as const,
            date: r.created_at || "",
            data: r,
        })),
        ...logs.map((l) => ({
            type: "automation" as const,
            date: l.created_at || "",
            data: l,
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate weekly score averages
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const currentWeekReports = reports.filter(
        (r) => r.created_at && new Date(r.created_at) >= sevenDaysAgo
    );
    const previousWeekReports = reports.filter(
        (r) =>
            r.created_at &&
            new Date(r.created_at) >= fourteenDaysAgo &&
            new Date(r.created_at) < sevenDaysAgo
    );

    const avgScore = (arr: AnalysisReport[]): number => {
        if (arr.length === 0) return 0;
        return arr.reduce((s, r) => s + (r.score || 0), 0) / arr.length;
    };

    const weeklyAverage: WeeklyAverage = {
        current: Math.round(avgScore(currentWeekReports) * 10) / 10,
        previous: Math.round(avgScore(previousWeekReports) * 10) / 10,
    };

    return {
        reports,
        logs,
        timeline,
        weeklyAverage,
        isLoading: reportsQuery.isLoading || logsQuery.isLoading,
    };
}
