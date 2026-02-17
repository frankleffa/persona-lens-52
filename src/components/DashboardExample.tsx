
import React from 'react';
import { MetricCard } from './MetricCard';
import { useMultipleMetricsTrends } from '@/hooks/use-metric-trend';
import { MetricData } from '@/lib/metrics';
import { DollarSign, Wallet, Users, Target, Activity, Percent } from 'lucide-react';

const MOCK_METRICS: MetricData[] = [
    {
        id: '1',
        title: 'Receita Total',
        value: 45200.50,
        previousValue: 38000.00,
        metricType: 'revenue',
        format: 'currency',
        icon: DollarSign
    },
    {
        id: '2',
        title: 'Investimento (Ads)',
        value: 12500.00,
        previousValue: 10000.00,
        metricType: 'cost',
        format: 'currency',
        icon: Wallet
    },
    {
        id: '3',
        title: 'Leads Gerados',
        value: 850,
        previousValue: 720,
        metricType: 'volume',
        format: 'number',
        icon: Users
    },
    {
        id: '4',
        title: 'Custo por Lead (CPL)',
        value: 14.70,
        previousValue: 13.88,
        metricType: 'cost',
        format: 'currency',
        icon: Target
    },
    {
        id: '5',
        title: 'ROAS',
        value: 3.61,
        previousValue: 3.80,
        metricType: 'efficiency',
        format: 'multiplier',
        icon: Activity
    },
    {
        id: '6',
        title: 'Taxa de Conversão',
        value: 2.4,
        previousValue: 2.1,
        metricType: 'efficiency',
        format: 'percentage',
        icon: Percent
    },
];

export const DashboardExample = () => {
    // Using the hook to demonstrate its capability (e.g. for future filtering/sorting)
    const metricsWithTrends = useMultipleMetricsTrends(MOCK_METRICS);

    return (
        <div className="p-8 space-y-8 bg-background min-h-screen">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard de Performance</h2>
                    <p className="text-muted-foreground">Visão geral das principais métricas de campanhas.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {metricsWithTrends.map((metric) => (
                    <MetricCard
                        key={metric.id}
                        title={metric.title}
                        value={metric.value}
                        previousValue={metric.previousValue}
                        format={metric.format}
                        metricType={metric.metricType}
                        icon={metric.icon}
                        target={metric.target}
                    />
                ))}
            </div>
        </div>
    );
};
