
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { type LucideIcon, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { useMetricTrend } from '@/hooks/use-metric-trend';
import { MetricType, MetricFormat } from '@/lib/metrics';
import { cn } from '@/lib/utils';

interface MetricCardProps {
    title: string;
    value: number;
    previousValue?: number;
    format?: MetricFormat;
    metricType?: MetricType;
    icon?: LucideIcon;
    target?: number;
    className?: string;
    onClick?: () => void;
}

export const MetricCard = ({
    title,
    value,
    previousValue,
    format = "number",
    metricType = "revenue",
    icon: Icon,
    target,
    className,
    onClick
}: MetricCardProps) => {
    const trend = useMetricTrend(value, previousValue, { metricType, format });

    const getSentimentColor = (sentiment: string) => {
        switch (sentiment) {
            case 'positive': return 'text-emerald-500';
            case 'negative': return 'text-rose-500';
            default: return 'text-muted-foreground';
        }
    };

    const getTrendIcon = (direction: string) => {
        if (direction === 'up') return <ArrowUp className="h-4 w-4" />;
        if (direction === 'down') return <ArrowDown className="h-4 w-4" />;
        return <Minus className="h-4 w-4" />;
    };

    return (
        <Card
            className={cn('overflow-hidden transition-all hover:shadow-md', className, onClick && 'cursor-pointer')}
            onClick={onClick}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{trend.formattedValue}</div>

                {previousValue !== undefined && (
                    <div className="flex items-center mt-1 text-xs">
                        <span className={cn("flex items-center font-medium", getSentimentColor(trend.sentiment))}>
                            {getTrendIcon(trend.direction)}
                            <span className="ml-1">{Math.abs(trend.percentageChange).toFixed(1)}%</span>
                        </span>
                        <span className="ml-2 text-muted-foreground">
                            vs mês anterior
                        </span>
                    </div>
                )}

                {metricType === 'efficiency' && target && (
                    <div className="mt-2 text-xs text-muted-foreground">
                        Meta: {format === 'percentage' ? `${target}%` : target}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
