"use client";

import { useEffect, useMemo, useState } from "react";

/** Quebra "R$ 84.320", "3,71x", "2,84%" em prefixo + número + sufixo (pt-BR). */
function parse(str: string) {
  const s = String(str).trim();
  const m = s.match(/-?[\d.,]+/);
  if (!m) return { prefix: s, value: 0, decimals: 0, suffix: "" };
  const numStr = m[0];
  const idx = m.index ?? 0;
  const prefix = s.slice(0, idx);
  const suffix = s.slice(idx + numStr.length);

  let value: number;
  let decimals: number;
  if (numStr.includes(",")) {
    // pt-BR: vírgula é decimal, ponto é milhar
    decimals = numStr.split(",")[1].length;
    value = parseFloat(numStr.replace(/\./g, "").replace(",", "."));
  } else if (numStr.includes(".")) {
    const parts = numStr.split(".");
    if (parts.length === 2 && parts[1].length < 3) {
      // ponto como decimal (ex.: "3.5")
      decimals = parts[1].length;
      value = parseFloat(numStr);
    } else {
      // ponto como milhar (ex.: "84.320")
      decimals = 0;
      value = parseFloat(numStr.replace(/\./g, ""));
    }
  } else {
    decimals = 0;
    value = parseFloat(numStr);
  }
  return { prefix, value, decimals, suffix };
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function AnimatedNumber({
  value,
  className,
  duration = 900,
}: {
  value: string;
  className?: string;
  duration?: number;
}) {
  const { prefix, value: target, decimals, suffix } = useMemo(() => parse(value), [value]);
  const [n, setN] = useState(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target === 0) {
      setN(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setN(target * easeOut(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  const formatted = n.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
