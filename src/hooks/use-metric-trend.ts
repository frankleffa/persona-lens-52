
import { useMemo } from 'react';
import {
    calculateTrend,
    TrendResult,
    MetricType,
    MetricFormat,
    MetricData
} from '@/lib/metrics';

export interface UseMetricTrendOptions {
    metricType?: MetricType;
    format?: MetricFormat;
    thresholds?: { low: number; medium: number };
}

export const useMetricTrend = (
    current: number,
    previous?: number,
    options: UseMetricTrendOptions = {}
): TrendResult => {
    const { metricType = 'revenue', format = 'number', thresholds } = options;

    return useMemo(() => {
        return calculateTrend(current, previous, metricType, format, thresholds);
    }, [current, previous, metricType, format, thresholds]);
};

export const useMultipleMetricsTrends = (
    metrics: MetricData[],
    globalThresholds?: { low: number; medium: number }
) => {
    return useMemo(() => {
        return metrics.map((metric) => ({
            ...metric,
            trend: calculateTrend(
                metric.value,
                metric.previousValue,
                metric.metricType,
                metric.format,
                globalThresholds
            )
        }));
    }, [metrics, globalThresholds]);
};
