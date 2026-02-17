
import { type LucideIcon } from "lucide-react";

export type MetricType = "revenue" | "cost" | "volume" | "efficiency";
export type TrendDirection = "up" | "down" | "neutral";
export type Sentiment = "positive" | "negative" | "neutral";
export type MetricFormat = "currency" | "percentage" | "multiplier" | "number";

export interface MetricData {
    id: string;
    title: string;
    value: number;
    previousValue?: number;
    format?: MetricFormat;
    metricType?: MetricType;
    icon?: LucideIcon;
    target?: number;
}

export const getMetricSentiment = (metricType: MetricType, direction: TrendDirection): Sentiment => {
    if (direction === "neutral") return "neutral";

    if (metricType === "revenue" || metricType === "volume" || metricType === "efficiency") {
        return direction === "up" ? "positive" : "negative";
    }

    if (metricType === "cost") {
        return direction === "up" ? "negative" : "positive";
    }

    return "neutral";
};

export const formatMetricValue = (value: number, format: MetricFormat = "number"): string => {
    if (format === "currency") {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }
    if (format === "percentage") {
        return `${value.toFixed(2)}%`;
    }
    if (format === "multiplier") {
        return `${value.toFixed(2)}x`;
    }
    return new Intl.NumberFormat('pt-BR').format(value);
};

export interface TrendResult {
    percentageChange: number;
    direction: TrendDirection;
    absoluteDifference: number;
    severityLevel: "low" | "medium" | "high";
    sentiment: Sentiment;
    formattedValue: string;
    formattedPrevious?: string;
}

export const calculateTrend = (
    current: number,
    previous: number | undefined,
    metricType: MetricType = "revenue",
    format: MetricFormat = "number",
    thresholds = { low: 5, medium: 15 }
): TrendResult => {
    const formattedValue = formatMetricValue(current, format);
    const formattedPrevious = previous !== undefined ? formatMetricValue(previous, format) : undefined;

    if (previous === undefined || previous === 0) {
        return {
            percentageChange: 0,
            direction: "neutral",
            absoluteDifference: 0,
            severityLevel: "low",
            sentiment: "neutral",
            formattedValue,
            formattedPrevious
        };
    }

    const difference = current - previous;
    const percentageChange = (difference / previous) * 100;
    const absoluteDifference = Math.abs(difference);
    const absPercentage = Math.abs(percentageChange);

    let direction: TrendDirection = "neutral";
    if (difference > 0) direction = "up";
    if (difference < 0) direction = "down";

    let severityLevel: "low" | "medium" | "high" = "low";
    if (absPercentage > thresholds.medium) severityLevel = "high";
    else if (absPercentage > thresholds.low) severityLevel = "medium";

    const sentiment = getMetricSentiment(metricType, direction);

    return {
        percentageChange,
        direction,
        absoluteDifference,
        severityLevel,
        sentiment,
        formattedValue,
        formattedPrevious
    };
};
