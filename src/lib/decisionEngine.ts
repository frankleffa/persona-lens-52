export type HealthStatus =
  | "CRITICAL"
  | "ATTENTION"
  | "STABLE"
  | "GROWING";

export type StrategyType =
  | "REVENUE"
  | "DEMAND"
  | "MESSAGE";

export interface MetricsSnapshot {
  spend: number;
  revenue?: number;
  roas?: number;
  cpa?: number;
  conversions: number;
}

function calculateVariation(current: number, previous: number): number {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return ((current - previous) / previous) * 100;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

const RECOMMENDATION_MAP: Record<HealthStatus, string> = {
  CRITICAL:
    "Performance em queda relevante. Revisar criativos, segmentação e estrutura imediatamente.",
  ATTENTION:
    "Oscilação detectada. Monitorar métricas e testar variações estratégicas.",
  STABLE: "Performance estável. Manter estratégia e acompanhar tendências.",
  GROWING: "Performance positiva. Avaliar aumento gradual de orçamento.",
};

const PRIORITY_MAP: Record<HealthStatus, number> = {
  CRITICAL: 1,
  ATTENTION: 2,
  STABLE: 3,
  GROWING: 4,
};

export function calculateClientHealth(
  strategyType: StrategyType,
  current: MetricsSnapshot,
  previous: MetricsSnapshot
): {
  status: HealthStatus;
  score: number;
  variation: number;
  recommendation: string;
  priority: number;
} {
  const currentRoas = current.roas ?? 0;
  const previousRoas = previous.roas ?? 0;
  const currentCpa = current.cpa ?? 0;
  const previousCpa = previous.cpa ?? 0;

  const roasVariation = calculateVariation(currentRoas, previousRoas);
  const cpaVariation = calculateVariation(currentCpa, previousCpa);
  const conversionVariation = calculateVariation(current.conversions, previous.conversions);

  let status: HealthStatus = "STABLE";
  let score = 50;
  let variation = 0;

  switch (strategyType) {
    case "REVENUE": {
      variation = roasVariation;
      score = 50 + (roasVariation * 0.8);

      if (roasVariation < -20) {
        status = "CRITICAL";
        score -= 10;
      } else if (roasVariation < -10) {
        status = "ATTENTION";
      } else if (roasVariation > 10) {
        status = "GROWING";
      } else {
        status = "STABLE";
      }
      break;
    }

    case "DEMAND": {
      const efficiency = -cpaVariation;
      const growth = conversionVariation;

      variation = conversionVariation;
      score = 50 + (efficiency * 0.5) + (growth * 0.3);

      if (cpaVariation > 25) {
        status = "CRITICAL";
      } else if (cpaVariation > 15) {
        status = "ATTENTION";
      } else if (conversionVariation > 15) {
        status = "GROWING";
      } else {
        status = "STABLE";
      }
      break;
    }

    case "MESSAGE": {
      const efficiency = -cpaVariation;
      const growth = conversionVariation;

      variation = conversionVariation;
      score = 50 + (efficiency * 0.5) + (growth * 0.3);

      if (cpaVariation > 30) {
        status = "CRITICAL";
        score -= 8;
      } else if (conversionVariation < -25) {
        status = "ATTENTION";
        score -= 5;
      } else if (conversionVariation > 15) {
        status = "GROWING";
      } else {
        status = "STABLE";
      }
      break;
    }

    default: {
      const _exhaustive: never = strategyType;
      throw new Error(`Unsupported strategy type: ${_exhaustive}`);
    }
  }

  const clampedScore = clamp(score);

  return {
    status,
    score: Number(clampedScore.toFixed(2)),
    variation: Number(variation.toFixed(2)),
    recommendation: RECOMMENDATION_MAP[status],
    priority: PRIORITY_MAP[status],
  };
}
