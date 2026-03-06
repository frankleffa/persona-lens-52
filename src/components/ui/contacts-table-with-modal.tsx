"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Download, ChevronDown, X, Mail, Twitter, User } from "lucide-react";

export interface Contact {
  id: string;
  name: string;
  email: string;
  connectionStrength: "Very weak" | "Weak" | "Good" | "Very strong";
  twitterFollowers: number;
  description?: string;
}

interface ContactsTableProps {
  title?: string;
  contacts?: Contact[];
  onContactSelect?: (contactId: string) => void;
  className?: string;
  enableAnimations?: boolean;
}

const defaultContacts: Contact[] = [
  { id: "1", name: "Pierre from Claap", email: "pierre@claap.io", connectionStrength: "Weak", twitterFollowers: 2400, description: "Tech entrepreneur and investor" },
  { id: "2", name: "HardwareSavvy", email: "hardwaresavvy+andr...", connectionStrength: "Very strong", twitterFollowers: 8900, description: "Hardware specialist" },
  { id: "3", name: "Voiceform", email: "harrison@voiceform.c...", connectionStrength: "Good", twitterFollowers: 5200, description: "Voice technology expert" },
  { id: "4", name: "Marketer Milk", email: "hi@marketmilk.com", connectionStrength: "Good", twitterFollowers: 6100, description: "Marketing strategist" },
  { id: "5", name: "Allen from CAST AI", email: "allen@mail.cast.ai", connectionStrength: "Weak", twitterFollowers: 3300, description: "AI infrastructure lead" },
  { id: "6", name: "Marija Krasnovskytė", email: "marija@cast.ai", connectionStrength: "Very weak", twitterFollowers: 1800, description: "Technical advisor" },
  { id: "7", name: "eryn@basistheory.com", email: "eryn@basistheory.com", connectionStrength: "Very weak", twitterFollowers: 2100, description: "Security specialist" },
  { id: "8", name: "Brad Patterson", email: "brad@basistheory.com", connectionStrength: "Good", twitterFollowers: 4500, description: "Product manager" },
  { id: "9", name: "Sarah Chen", email: "sarah.chen@techvault.com", connectionStrength: "Very strong", twitterFollowers: 12400, description: "CEO and founder" },
  { id: "10", name: "David Rodriguez", email: "david.rodriguez@innovate.io", connectionStrength: "Good", twitterFollowers: 7800, description: "Lead developer" },
  { id: "11", name: "Emily Watson", email: "emily.watson@future.co", connectionStrength: "Weak", twitterFollowers: 3900, description: "Marketing director" },
  { id: "12", name: "James Mitchell", email: "james@buildit.dev", connectionStrength: "Very strong", twitterFollowers: 9200, description: "Architect and advisor" },
];

type SortField = "name" | "connectionStrength" | "twitterFollowers";
type SortOrder = "asc" | "desc";

interface StrengthStyle {
  bgColor: string;
  borderColor: string;
  textColor: string;
  dotColor: string;
}

export function ContactsTable({
  title = "Person",
  contacts: initialContacts = defaultContacts,
  onContactSelect,
  className = "",
  enableAnimations = true,
}: ContactsTableProps) {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [filterStrength, setFilterStrength] = useState<string | null>(null);
  const [selectedContactDetail, setSelectedContactDetail] = useState<Contact | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const isDark = !document.documentElement.classList.contains("light");
  const ITEMS_PER_PAGE = 10;

  useEffect(() => { setMounted(true); }, []);

  const handleContactSelect = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]
    );
    onContactSelect?.(contactId);
  };

  const handleSelectAll = () => {
    setSelectedContacts(prev =>
      prev.length === paginatedContacts.length ? [] : paginatedContacts.map(c => c.id)
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(o => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setShowSortMenu(false);
    setCurrentPage(1);
  };

  const handleFilter = (strength: string | null) => {
    setFilterStrength(strength);
    setShowFilterMenu(false);
    setCurrentPage(1);
  };

  const sortedAndFilteredContacts = useMemo(() => {
    let filtered = [...initialContacts];
    if (filterStrength) filtered = filtered.filter(c => c.connectionStrength === filterStrength);
    if (!sortField) return filtered;

    return filtered.sort((a, b) => {
      let aVal: string | number = a[sortField];
      let bVal: string | number = b[sortField];
      if (sortField === "connectionStrength") {
        const map: Record<string, number> = { "Very weak": 0, Weak: 1, Good: 2, "Very strong": 3 };
        aVal = map[aVal as string];
        bVal = map[bVal as string];
      }
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [initialContacts, sortField, sortOrder, filterStrength]);

  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedAndFilteredContacts.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedAndFilteredContacts, currentPage]);

  const totalPages = Math.ceil(sortedAndFilteredContacts.length / ITEMS_PER_PAGE);

  const getStrengthColor = (strength: string): StrengthStyle => {
    const map: Record<string, StrengthStyle> = {
      "Very weak": {
        bgColor: isDark ? "bg-red-500/10" : "bg-red-50",
        borderColor: isDark ? "border-red-500/30" : "border-red-200",
        textColor: isDark ? "text-red-400" : "text-red-600",
        dotColor: isDark ? "bg-red-400" : "bg-red-600",
      },
      Weak: {
        bgColor: isDark ? "bg-orange-500/10" : "bg-orange-50",
        borderColor: isDark ? "border-orange-500/30" : "border-orange-200",
        textColor: isDark ? "text-orange-400" : "text-orange-600",
        dotColor: isDark ? "bg-orange-400" : "bg-orange-600",
      },
      Good: {
        bgColor: isDark ? "bg-blue-500/10" : "bg-blue-50",
        borderColor: isDark ? "border-blue-500/30" : "border-blue-200",
        textColor: isDark ? "text-blue-400" : "text-blue-600",
        dotColor: isDark ? "bg-blue-400" : "bg-blue-600",
      },
      "Very strong": {
        bgColor: isDark ? "bg-green-500/10" : "bg-green-50",
        borderColor: isDark ? "border-green-500/30" : "border-green-200",
        textColor: isDark ? "text-green-400" : "text-green-600",
        dotColor: isDark ? "bg-green-400" : "bg-green-600",
      },
    };
    return map[strength] ?? map["Good"];
  };

  const exportToCSV = () => {
    const headers = ["Name", "Email", "Connection Strength", "Twitter Followers", "Description"];
    const rows = sortedAndFilteredContacts.map(c => [c.name, c.email, c.connectionStrength, c.twitterFollowers, c.description || ""]);
    const csv = [headers.join(","), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `contacts-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const exportToJSON = () => {
    const blob = new Blob([JSON.stringify(sortedAndFilteredContacts, null, 2)], { type: "application/json;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `contacts-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
  };

  const shouldAnimate = enableAnimations && !shouldReduceMotion;

  const rowVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98, filter: "blur(4px)" },
    visible: {
      opacity: 1, y: 0, scale: 1, filter: "blur(0px)",
      transition: { type: "spring" as const, stiffness: 400, damping: 25, mass: 0.7 },
    },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
  };

  return (
    <div className={`w-full max-w-6xl mx-auto ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <span className="text-xs text-muted-foreground bg-muted/20 px-2 py-0.5 rounded-md">
            {sortedAndFilteredContacts.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`px-3 py-1.5 bg-card border border-border text-foreground text-sm hover:bg-muted/30 transition-colors flex items-center gap-2 rounded-md ${filterStrength ? "ring-2 ring-primary/30" : ""}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></svg>
              Filter
              {filterStrength && <span className="text-[10px] bg-primary/20 text-primary px-1.5 rounded-full">1</span>}
            </button>
            {showFilterMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-card border border-border rounded-md shadow-lg overflow-hidden">
                  <button onClick={() => handleFilter(null)} className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors ${!filterStrength ? "bg-muted/30" : ""}`}>
                    All Connections
                  </button>
                  <div className="h-px bg-border" />
                  {["Very strong", "Good", "Weak", "Very weak"].map(s => (
                    <button key={s} onClick={() => handleFilter(s)} className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors ${filterStrength === s ? "bg-muted/30" : ""}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="px-3 py-1.5 bg-card border border-border text-foreground text-sm hover:bg-muted/30 transition-colors flex items-center gap-2 rounded-md"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 18V4" /></svg>
              Sort {sortField && <span className="text-[10px] bg-primary/20 text-primary px-1.5 rounded-full">1</span>}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-card border border-border rounded-md shadow-lg overflow-hidden">
                  <button onClick={() => handleSort("name")} className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors ${sortField === "name" ? "bg-muted/30" : ""}`}>
                    Name {sortField === "name" && `(${sortOrder === "asc" ? "A-Z" : "Z-A"})`}
                  </button>
                  <button onClick={() => handleSort("connectionStrength")} className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors ${sortField === "connectionStrength" ? "bg-muted/30" : ""}`}>
                    Connection {sortField === "connectionStrength" && `(${sortOrder === "asc" ? "↑" : "↓"})`}
                  </button>
                  <button onClick={() => handleSort("twitterFollowers")} className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors ${sortField === "twitterFollowers" ? "bg-muted/30" : ""}`}>
                    Followers {sortField === "twitterFollowers" && `(${sortOrder === "asc" ? "↑" : "↓"})`}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Export */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3 py-1.5 bg-card border border-border text-foreground text-sm hover:bg-muted/30 transition-colors flex items-center gap-2 rounded-md"
            >
              <Download className="w-3.5 h-3.5" />
              Export
              <ChevronDown className="w-3 h-3" />
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-36 bg-card border border-border rounded-md shadow-lg overflow-hidden">
                  <button onClick={() => { exportToCSV(); setShowExportMenu(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors">CSV</button>
                  <button onClick={() => { exportToJSON(); setShowExportMenu(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors border-t border-border">JSON</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-md overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary"
                    checked={selectedContacts.length > 0 && selectedContacts.length === paginatedContacts.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {title}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Connection</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Twitter className="w-3.5 h-3.5" />
                    Followers
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <motion.tbody
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } } }}
            >
              {paginatedContacts.map((contact) => {
                const { bgColor, textColor, dotColor } = getStrengthColor(contact.connectionStrength);
                return (
                  <motion.tr
                    key={contact.id}
                    variants={shouldAnimate ? rowVariants : undefined}
                    className="group border-b border-border/50 hover:bg-muted/10 transition-colors cursor-pointer"
                    onClick={() => setSelectedContactDetail(contact)}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => handleContactSelect(contact.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">{contact.name.charAt(0)}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{contact.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${bgColor} ${textColor}`}>
                        {contact.connectionStrength === "Very strong" ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                        )}
                        {contact.connectionStrength}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground font-mono">{contact.twitterFollowers.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()} className="text-sm text-primary hover:underline">
                        {contact.email}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">{contact.description || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedContactDetail(contact); }}
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </motion.tbody>
          </table>
        </div>

        {/* Modal */}
        <AnimatePresence>
          {selectedContactDetail && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
              onClick={() => setSelectedContactDetail(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="relative w-full max-w-md bg-card border border-border rounded-md shadow-2xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedContactDetail(null)}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full bg-muted/50 hover:bg-muted/70 flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">{selectedContactDetail.name.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{selectedContactDetail.name}</h3>
                      {(() => {
                        const { bgColor, textColor, dotColor } = getStrengthColor(selectedContactDetail.connectionStrength);
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full mt-1 ${bgColor} ${textColor}`}>
                            {selectedContactDetail.connectionStrength === "Very strong" ? (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                            ) : (
                              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                            )}
                            {selectedContactDetail.connectionStrength}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Mail className="w-3 h-3" /> Email
                      </div>
                      <a href={`mailto:${selectedContactDetail.email}`} className="text-sm text-primary hover:underline">
                        {selectedContactDetail.email}
                      </a>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Twitter className="w-3 h-3" /> Twitter Followers
                      </div>
                      <span className="text-sm font-mono text-foreground">{selectedContactDetail.twitterFollowers.toLocaleString()}</span>
                    </div>
                    {selectedContactDetail.description && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Description</div>
                        <p className="text-sm text-foreground">{selectedContactDetail.description}</p>
                      </div>
                    )}
                  </div>

                  <button
                    className="w-full py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
                    onClick={() => { window.location.href = `mailto:${selectedContactDetail.email}`; }}
                  >
                    Send Email
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages} • {sortedAndFilteredContacts.length} contacts
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-card border border-border text-foreground text-xs hover:bg-muted/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-md"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-card border border-border text-foreground text-xs hover:bg-muted/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-md"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
