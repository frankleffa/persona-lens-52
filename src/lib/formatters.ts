/**
 * Formatting utilities for Brazilian Real currency, numbers, percentages, and multipliers.
 */

export function formatCurrency(value: number): string {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatNumber(value: number): string {
    return value.toLocaleString("pt-BR");
}

export function formatPercent(value: number): string {
    return `${value.toFixed(2)}%`;
}

export function formatMultiplier(value: number): string {
    return value > 0 ? `${value.toFixed(2)}x` : "—";
}
