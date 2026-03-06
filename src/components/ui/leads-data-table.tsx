"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import { ChevronDown, MoreHorizontal } from "lucide-react";

export interface Lead {
  id: string;
  name: string;
  email: string;
  source: string;
  sourceType: "organic" | "campaign";
  status: "pre-sale" | "closed" | "lost" | "closing" | "new";
  size: number;
  interest: number[];
  probability: "low" | "mid" | "high";
  lastAction: string;
}

interface LeadsTableProps {
  title?: string;
  leads?: Lead[];
  onLeadAction?: (leadId: string, action: string) => void;
  className?: string;
}

const defaultLeads: Lead[] = [
  {
    id: "1",
    name: "Andy Shepard",
    email: "a.shepard@gmail.com",
    source: "ORGANIC",
    sourceType: "organic",
    status: "pre-sale",
    size: 120000,
    interest: [45, 52, 48, 55, 58, 60, 57, 62, 65, 63],
    probability: "mid",
    lastAction: "Sep 12, 2024"
  },
  {
    id: "2",
    name: "Emily Thompson",
    email: "e.thompson@gmail.com",
    source: "SB2024",
    sourceType: "campaign",
    status: "closed",
    size: 200000,
    interest: [30, 35, 42, 48, 55, 62, 68, 70, 75, 78],
    probability: "high",
    lastAction: "Sep 13, 2024"
  },
  {
    id: "3",
    name: "Michael Carter",
    email: "m.carter@gmail.com",
    source: "SUMMER2",
    sourceType: "campaign",
    status: "pre-sale",
    size: 45000,
    interest: [70, 68, 65, 60, 58, 55, 52, 48, 45, 42],
    probability: "low",
    lastAction: "Sep 12, 2024"
  },
  {
    id: "4",
    name: "David Anderson",
    email: "d.anderson@gmail.com",
    source: "DTJ25",
    sourceType: "campaign",
    status: "pre-sale",
    size: 80000,
    interest: [25, 28, 32, 38, 45, 52, 58, 62, 68, 70],
    probability: "high",
    lastAction: "Sep 12, 2024"
  },
  {
    id: "5",
    name: "Lily Hernandez",
    email: "l.hernandez@gmail.com",
    source: "ORGANIC",
    sourceType: "organic",
    status: "lost",
    size: 110000,
    interest: [60, 58, 55, 50, 45, 42, 38, 35, 30, 28],
    probability: "low",
    lastAction: "Sep 12, 2024"
  },
  {
    id: "6",
    name: "Christopher Wilson",
    email: "c.wilson@gmail.com",
    source: "SB2024",
    sourceType: "campaign",
    status: "closed",
    size: 2120000,
    interest: [40, 42, 45, 48, 50, 52, 55, 58, 60, 62],
    probability: "mid",
    lastAction: "Sep 12, 2024"
  },
  {
    id: "7",
    name: "Isabella Lopez",
    email: "i.lopez@gmail.com",
    source: "ORGANIC",
    sourceType: "organic",
    status: "closing",
    size: 20000,
    interest: [35, 38, 42, 46, 50, 55, 60, 65, 68, 72],
    probability: "high",
    lastAction: "Sep 12, 2024"
  },
  {
    id: "8",
    name: "Sophia Morgan",
    email: "s.morgan@gmail.com",
    source: "AFF20",
    sourceType: "campaign",
    status: "new",
    size: 95000,
    interest: [55, 52, 48, 45, 40, 38, 35, 32, 30, 28],
    probability: "low",
    lastAction: "Sep 11, 2024"
  },
  {
    id: "9",
    name: "John Davis",
    email: "j.davis@gmail.com",
    source: "ORGANIC",
    sourceType: "organic",
    status: "pre-sale",
    size: 200000,
    interest: [30, 35, 40, 45, 50, 55, 60, 58, 62, 65],
    probability: "mid",
    lastAction: "Sep 11, 2024"
  }
];

export function LeadsTable({
  title = "Leads",
  leads: initialLeads = defaultLeads,
  onLeadAction,
  className = ""
}: LeadsTableProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const shouldReduceMotion = useReducedMotion();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleLeadSelection = (leadId: string, selected: boolean) => {
    const newSelected = new Set(selectedLeads);
    if (selected) {
      newSelected.add(leadId);
    } else {
      newSelected.delete(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedLeads(new Set(leads.map(lead => lead.id)));
    } else {
      setSelectedLeads(new Set());
    }
  };

  const isSelected = (leadId: string) => selectedLeads.has(leadId);
  const isAllSelected = selectedLeads.size === leads.length && leads.length > 0;
  const isIndeterminate = selectedLeads.size > 0 && selectedLeads.size < leads.length;

  const handleLeadAction = (leadId: string, action: string) => {
    if (onLeadAction) {
      onLeadAction(leadId, action);
    }
  };

  const handleSort = () => {
    const newOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(newOrder);

    const sortedLeads = [...leads].sort((a, b) => {
      const aDate = new Date(a.lastAction === "Engage" ? "2024-09-15" : a.lastAction);
      const bDate = new Date(b.lastAction === "Engage" ? "2024-09-15" : b.lastAction);
      return newOrder === "asc" ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
    });

    setLeads(sortedLeads);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const getSourcePill = (source: string, sourceType: "organic" | "campaign") => {
    const isOrganic = sourceType === "organic";

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide border ${
          isOrganic
            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
            : "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400 dark:border-sky-500/30"
        }`}
      >
        {source}
        {!isOrganic && <span className="text-[9px] opacity-60">↗</span>}
      </span>
    );
  };

  const getStatusPill = (status: Lead["status"]) => {
    const statusConfig = {
      "pre-sale": {
        bg: "bg-orange-50 dark:bg-orange-900/20",
        text: "text-orange-600 dark:text-orange-400",
        border: "border-orange-200 dark:border-orange-800/30",
        label: "PRE-SALE"
      },
      "closed": {
        bg: "bg-green-50 dark:bg-green-900/20",
        text: "text-green-600 dark:text-green-400",
        border: "border-green-200 dark:border-green-800/30",
        label: "CLOSED"
      },
      "lost": {
        bg: "bg-red-50 dark:bg-red-900/20",
        text: "text-red-600 dark:text-red-400",
        border: "border-red-200 dark:border-red-800/30",
        label: "LOST"
      },
      "closing": {
        bg: "bg-blue-50 dark:bg-blue-900/20",
        text: "text-blue-600 dark:text-blue-400",
        border: "border-blue-200 dark:border-blue-800/30",
        label: "CLOSING"
      },
      "new": {
        bg: "bg-purple-50 dark:bg-purple-900/20",
        text: "text-purple-600 dark:text-purple-400",
        border: "border-purple-200 dark:border-purple-800/30",
        label: "NEW"
      }
    };

    const config = statusConfig[status];
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide border ${config.bg} ${config.text} ${config.border}`}
      >
        {config.label}
      </span>
    );
  };

  const renderSparkline = (data: number[]) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const isUpTrend = data[data.length - 1] > data[0];

    const points = data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * 60;
        const y = 20 - ((value - min) / range) * 15;
        return `${x},${y}`;
      })
      .join(" ");

    const upColor = isDark ? "#22c55e" : "#16a34a";
    const downColor = isDark ? "#f87171" : "#dc2626";

    return (
      <svg width="60" height="24" viewBox="0 0 60 24" className="overflow-visible">
        <defs>
          <linearGradient id={`grad-${isUpTrend ? "up" : "down"}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUpTrend ? upColor : downColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isUpTrend ? upColor : downColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          points={points}
          fill="none"
          stroke={isUpTrend ? upColor : downColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  const getProbabilityIcon = (probability: Lead["probability"]) => {
    const barCount = probability === "low" ? 1 : probability === "mid" ? 2 : 3;
    const probabilityColors = {
      low: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/30",
      mid: "bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/30",
      high: "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30"
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide border ${probabilityColors[probability]}`}>
        <span className="flex items-end gap-[2px] h-3">
          {[1, 2, 3].map((bar) => (
            <span
              key={bar}
              className={`w-[3px] rounded-sm transition-colors ${
                bar <= barCount ? "bg-current" : "bg-current/20"
              }`}
              style={{ height: `${bar * 4}px` }}
            />
          ))}
        </span>
        <span className="capitalize">{probability}</span>
      </span>
    );
  };

  const rowVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.98,
      filter: "blur(4px)"
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 25,
        mass: 0.7,
      },
    },
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Table Container */}
      <div className="w-full overflow-x-auto rounded-xl border border-border/50 bg-card">
        {/* Table Headers */}
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[40px_1.5fr_100px_100px_90px_80px_80px_120px] items-center px-4 py-3 border-b border-border/50 bg-muted/30">
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isIndeterminate;
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-muted-foreground/40 text-muted-foreground focus:ring-muted-foreground/20 focus:ring-2 accent-muted-foreground bg-background"
              />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Size</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Interest</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Probability</span>
            <button
              onClick={handleSort}
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 hover:text-foreground transition-colors"
            >
              Last Action
              <ChevronDown className={`w-3 h-3 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Table Rows */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } } }}
          >
            {leads.map((lead) => (
              <motion.div key={lead.id} variants={shouldReduceMotion ? {} : rowVariants}>
                <div
                  className={`group grid grid-cols-[40px_1.5fr_100px_100px_90px_80px_80px_120px] items-center px-4 py-3 border-b border-border/30 transition-colors hover:bg-muted/20 ${
                    isSelected(lead.id) ? "bg-primary/5" : ""
                  }`}
                  onMouseEnter={() => {
                    setHoveredRow(lead.id);
                    setHoveredAction(lead.id);
                  }}
                  onMouseLeave={() => {
                    setHoveredRow(null);
                    setHoveredAction(null);
                  }}
                >
                  {/* Checkbox */}
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isSelected(lead.id)}
                      onChange={(e) => handleLeadSelection(lead.id, e.target.checked)}
                      className="w-4 h-4 rounded border-muted-foreground/40 text-muted-foreground focus:ring-muted-foreground/20 focus:ring-2 accent-muted-foreground bg-background"
                    />
                  </div>

                  {/* Lead Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                      {lead.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                    </div>
                  </div>

                  {/* Source */}
                  <div>{getSourcePill(lead.source, lead.sourceType)}</div>

                  {/* Status */}
                  <div>{getStatusPill(lead.status)}</div>

                  {/* Size */}
                  <div>
                    <span className="text-sm font-mono font-medium text-foreground">
                      {formatCurrency(lead.size)}
                    </span>
                  </div>

                  {/* Interest */}
                  <div>{renderSparkline(lead.interest)}</div>

                  {/* Probability */}
                  <div>{getProbabilityIcon(lead.probability)}</div>

                  {/* Last Action */}
                  <div className="flex items-center justify-end">
                    <span className="text-xs text-muted-foreground">
                      {hoveredAction === lead.id ? (
                        <button
                          onClick={() => handleLeadAction(lead.id, "engage")}
                          className="flex items-center gap-2 px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-medium shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                        >
                          Engage
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </button>
                      ) : (
                        <span>{lead.lastAction}</span>
                      )}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <AnimatePresence>
        {selectedLeads.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-3"
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-card border border-border/50 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">
                  {selectedLeads.size} selected leads
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => console.log("Engage leads")}
                  className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-medium transition-colors"
                >
                  Engage
                </button>

                <button
                  onClick={() => console.log("Create group")}
                  className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground/80 rounded-lg text-xs font-medium transition-colors"
                >
                  Create group
                </button>

                <button
                  onClick={() => console.log("Download CSV")}
                  className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground/80 rounded-lg text-xs font-medium transition-colors"
                >
                  Download as .CSV
                </button>

                <button
                  onClick={() => console.log("Delete leads")}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400/80 border border-red-500/20 dark:border-red-400/30 rounded-lg text-xs font-medium transition-colors"
                >
                  Delete leads
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
