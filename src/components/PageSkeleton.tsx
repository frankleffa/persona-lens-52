import { Skeleton } from "@/components/ui/skeleton";

export default function PageSkeleton() {
    return (
        <div className="min-h-screen bg-background lg:pl-64">
            <div className="pt-20 lg:pt-8 p-4 sm:p-6 lg:px-8 max-w-7xl mx-auto space-y-8 animate-pulse">

                {/* Topbar Skeleton */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-2 border-b border-border">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 !rounded-none bg-surface/50" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-48 !rounded-none bg-surface/50" />
                            <Skeleton className="h-4 w-64 !rounded-none bg-surface/50" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-9 w-[220px] !rounded-none bg-surface/50" />
                        <Skeleton className="h-9 w-24 !rounded-none bg-surface/50" />
                    </div>
                </div>

                {/* KPI Row Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={`kpi-${i}`} className="p-5 border border-border bg-surface">
                            <div className="flex items-center justify-between mb-4">
                                <Skeleton className="h-4 w-24 !rounded-none bg-surface/80" />
                                <Skeleton className="h-5 w-5 !rounded-none bg-surface/80" />
                            </div>
                            <Skeleton className="h-8 w-20 !rounded-none bg-surface/80 mb-2" />
                            <Skeleton className="h-3 w-32 !rounded-none bg-surface/80" />
                        </div>
                    ))}
                </div>

                {/* Content Row 1 Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 border border-border bg-surface p-6 min-h-[400px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <Skeleton className="h-5 w-40 !rounded-none bg-surface/80" />
                            <Skeleton className="h-8 w-32 !rounded-none bg-surface/80" />
                        </div>
                        <Skeleton className="flex-1 w-full !rounded-none bg-surface/80" />
                    </div>
                    <div className="border border-border bg-surface p-6 min-h-[400px]">
                        <Skeleton className="h-5 w-32 !rounded-none bg-surface/80 mb-6" />
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={`list-${i}`} className="h-12 w-full !rounded-none bg-surface/80" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content Row 2 Skeleton */}
                <div className="border border-border bg-surface p-6 min-h-[300px]">
                    <Skeleton className="h-5 w-48 !rounded-none bg-surface/80 mb-6" />
                    <Skeleton className="h-full w-full min-h-[200px] !rounded-none bg-surface/80" />
                </div>

            </div>
        </div>
    );
}
