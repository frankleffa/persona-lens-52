import { useState, useCallback, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
  X,
  AlertTriangle,
  RotateCcw,
  Plus,
  ImageIcon,
} from "lucide-react";
import { useCampaignManager } from "@/hooks/useCampaignManager";
import {
  OBJECTIVE_LABELS,
  CTA_LABELS,
  type CampaignObjective,
  type CampaignStatus,
  type CallToAction,
  type Interest,
  type CampaignCreateData,
  type AdsetCreateData,
  type AdCreateData,
} from "@/types/campaign-manager";

interface CampaignCreatorProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SPECIAL_AD_CATEGORIES = [
  { value: "CREDIT", label: "Crédito" },
  { value: "HOUSING", label: "Moradia" },
  { value: "EMPLOYMENT", label: "Emprego" },
  { value: "ISSUES_ELECTIONS_POLITICS", label: "Questões Sociais/Política" },
];

const COUNTRIES = [
  { value: "BR", label: "Brasil" },
  { value: "PT", label: "Portugal" },
  { value: "US", label: "Estados Unidos" },
  { value: "AR", label: "Argentina" },
  { value: "MX", label: "México" },
  { value: "CO", label: "Colômbia" },
  { value: "CL", label: "Chile" },
];

const OPTIMIZATION_MAP: Record<string, string> = {
  OUTCOME_SALES: "OFFSITE_CONVERSIONS",
  OUTCOME_LEADS: "LEAD_GENERATION",
  OUTCOME_TRAFFIC: "LINK_CLICKS",
  OUTCOME_AWARENESS: "REACH",
  OUTCOME_ENGAGEMENT: "REACH",
};

const OPTIMIZATION_OPTIONS = [
  { value: "OFFSITE_CONVERSIONS", label: "Conversões no site" },
  { value: "LINK_CLICKS", label: "Cliques no link" },
  { value: "LEAD_GENERATION", label: "Geração de leads" },
  { value: "REACH", label: "Alcance" },
];

type CreationStep = "idle" | "campaign" | "adset" | "ad" | "done" | "error";

export function CampaignCreator({ clientId, open, onOpenChange }: CampaignCreatorProps) {
  const mgr = useCampaignManager(clientId);

  // Wizard step
  const [step, setStep] = useState(1);

  // Step 1: Campaign
  const [name, setName] = useState("");
  const [objective, setObjective] = useState<CampaignObjective>("OUTCOME_SALES");
  const [budget, setBudget] = useState("");
  const [specialCats, setSpecialCats] = useState<string[]>([]);
  const [startPaused, setStartPaused] = useState(true);

  // Step 2: Adset
  const [adsetName, setAdsetName] = useState("");
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("65");
  const [gender, setGender] = useState("0");
  const [countries, setCountries] = useState<string[]>(["BR"]);
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [interestSearch, setInterestSearch] = useState("");
  const [showInterestDropdown, setShowInterestDropdown] = useState(false);
  const [platforms, setPlatforms] = useState({ facebook: true, instagram: true });
  const [positions, setPositions] = useState({ feed: true, stories: true, reels: true });
  const [optimizationGoal, setOptimizationGoal] = useState("OFFSITE_CONVERSIONS");
  const interestRef = useRef<HTMLDivElement>(null);

  // Step 3: Ad
  const [pageId, setPageId] = useState("");
  const [headline, setHeadline] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [linkDesc, setLinkDesc] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [cta, setCta] = useState<CallToAction>("LEARN_MORE");
  const [imageUrl, setImageUrl] = useState("");

  // Creation state
  const [creationStep, setCreationStep] = useState<CreationStep>("idle");
  const [creationError, setCreationError] = useState("");
  const [createdIds, setCreatedIds] = useState<{ campaign_id?: string; adset_id?: string; ad_id?: string }>({});

  // Auto-fill adset name when campaign name changes
  useEffect(() => {
    if (!adsetName || adsetName.endsWith(" - Público 1")) {
      setAdsetName(name ? `${name} - Público 1` : "");
    }
  }, [name]);

  // Auto-select optimization based on objective
  useEffect(() => {
    setOptimizationGoal(OPTIMIZATION_MAP[objective] || "REACH");
  }, [objective]);

  // Interest search
  useEffect(() => {
    mgr.searchInterests(interestSearch);
  }, [interestSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (interestRef.current && !interestRef.current.contains(e.target as Node)) {
        setShowInterestDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const resetWizard = useCallback(() => {
    setStep(1);
    setName("");
    setObjective("OUTCOME_SALES");
    setBudget("");
    setSpecialCats([]);
    setStartPaused(true);
    setAdsetName("");
    setAgeMin("18");
    setAgeMax("65");
    setGender("0");
    setCountries(["BR"]);
    setSelectedInterests([]);
    setInterestSearch("");
    setPlatforms({ facebook: true, instagram: true });
    setPositions({ feed: true, stories: true, reels: true });
    setOptimizationGoal("OFFSITE_CONVERSIONS");
    setPageId("");
    setHeadline("");
    setBodyText("");
    setLinkDesc("");
    setLinkUrl("");
    setCta("LEARN_MORE");
    setImageUrl("");
    setCreationStep("idle");
    setCreationError("");
    setCreatedIds({});
  }, []);

  // ── Validation ──

  const step1Valid = name.trim() && objective && Number(budget) >= 5;
  const step2Valid =
    adsetName.trim() &&
    Number(ageMin) >= 18 &&
    Number(ageMax) <= 65 &&
    Number(ageMin) < Number(ageMax) &&
    countries.length > 0;
  const step3Valid =
    pageId &&
    headline.trim() &&
    bodyText.trim() &&
    linkUrl.trim() &&
    /^https?:\/\/.+/.test(linkUrl);

  // ── Create flow ──

  const handleCreate = useCallback(async () => {
    setCreationStep("campaign");
    setCreationError("");

    const status: CampaignStatus = startPaused ? "PAUSED" : "ACTIVE";
    let campaignId = createdIds.campaign_id;
    let adsetId = createdIds.adset_id;

    try {
      // Step 1: Campaign
      if (!campaignId) {
        const campaignData: CampaignCreateData = {
          name,
          objective,
          daily_budget: Number(budget),
          status,
          special_ad_categories: specialCats,
        };
        const res = await mgr.createCampaign(campaignData);
        campaignId = res.campaign_id;
        setCreatedIds((prev) => ({ ...prev, campaign_id: campaignId }));
      }

      // Step 2: Adset
      setCreationStep("adset");
      if (!adsetId) {
        const pubPlatforms: string[] = [];
        const fbPos: string[] = [];
        const igPos: string[] = [];
        if (platforms.facebook) pubPlatforms.push("facebook");
        if (platforms.instagram) pubPlatforms.push("instagram");
        if (positions.feed) { fbPos.push("feed"); igPos.push("stream"); }
        if (positions.stories) { fbPos.push("story"); igPos.push("story"); }
        if (positions.reels) { fbPos.push("instream_video"); igPos.push("reels"); }

        const adsetData: AdsetCreateData = {
          campaign_id: campaignId!,
          name: adsetName,
          optimization_goal: optimizationGoal,
          billing_event: "IMPRESSIONS",
          targeting: {
            age_min: Number(ageMin),
            age_max: Number(ageMax),
            genders: gender === "0" ? [] : [Number(gender)],
            geo_locations: { countries },
            interests: selectedInterests.length > 0 ? selectedInterests : undefined,
            publisher_platforms: pubPlatforms.length > 0 ? pubPlatforms : undefined,
            facebook_positions: fbPos.length > 0 ? fbPos : undefined,
            instagram_positions: igPos.length > 0 ? igPos : undefined,
          },
          status,
        };
        const res = await mgr.createAdset(adsetData);
        adsetId = res.adset_id;
        setCreatedIds((prev) => ({ ...prev, adset_id: adsetId }));
      }

      // Step 3: Ad
      setCreationStep("ad");
      const adData: AdCreateData = {
        adset_id: adsetId!,
        name: `${name} - Anúncio 1`,
        page_id: pageId,
        creative: {
          headline,
          body: bodyText,
          description: linkDesc || undefined,
          call_to_action: cta,
          link_url: linkUrl,
          image_url: imageUrl || undefined,
        },
        status,
      };
      const adRes = await mgr.createAd(adData);
      setCreatedIds((prev) => ({ ...prev, ad_id: adRes.ad_id }));
      setCreationStep("done");
    } catch (err: any) {
      setCreationError(err.message || "Erro desconhecido.");
      setCreationStep("error");
    }
  }, [
    name, objective, budget, specialCats, startPaused, adsetName, ageMin, ageMax,
    gender, countries, selectedInterests, platforms, positions, optimizationGoal,
    pageId, headline, bodyText, linkDesc, linkUrl, cta, imageUrl, createdIds, mgr,
  ]);

  const isProcessing = creationStep === "campaign" || creationStep === "adset" || creationStep === "ad";

  // ── Render helpers ──

  const toggleSpecialCat = (val: string) =>
    setSpecialCats((prev) => (prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]));

  const toggleCountry = (val: string) =>
    setCountries((prev) => (prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]));

  const addInterest = (interest: Interest) => {
    if (!selectedInterests.find((i) => i.id === interest.id)) {
      setSelectedInterests((prev) => [...prev, interest]);
    }
    setInterestSearch("");
    setShowInterestDropdown(false);
  };

  const removeInterest = (id: string) =>
    setSelectedInterests((prev) => prev.filter((i) => i.id !== id));

  // ── Step indicator ──

  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              s === step
                ? "bg-primary text-primary-foreground"
                : s < step
                  ? "bg-primary/20 text-primary"
                  : "bg-muted/10 text-muted-foreground"
            }`}
          >
            {s < step ? <CheckCircle className="h-4 w-4" /> : s}
          </div>
          <span className={`text-xs font-medium ${s === step ? "text-foreground" : "text-muted-foreground"}`}>
            {s === 1 ? "Campanha" : s === 2 ? "Público" : "Anúncio"}
          </span>
          {s < 3 && <div className="h-px w-6 bg-muted/20" />}
        </div>
      ))}
    </div>
  );

  // ── Creation progress ──

  if (creationStep !== "idle") {
    const steps = [
      { key: "campaign", label: "Criando campanha..." },
      { key: "adset", label: "Criando público..." },
      { key: "ad", label: "Criando anúncio..." },
    ];

    if (creationStep === "done") {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-lg bg-card border-white/5">
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-[#4ADE80]/20 bg-[#4ADE80]/5 p-6 text-center space-y-3">
                <CheckCircle className="mx-auto h-10 w-10 text-[#4ADE80]" />
                <h3 className="text-lg font-bold text-foreground">Campanha criada com sucesso!</h3>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {createdIds.campaign_id && <p>Campanha: <span className="font-mono text-foreground">{createdIds.campaign_id}</span></p>}
                  {createdIds.adset_id && <p>Conjunto: <span className="font-mono text-foreground">{createdIds.adset_id}</span></p>}
                  {createdIds.ad_id && <p>Anúncio: <span className="font-mono text-foreground">{createdIds.ad_id}</span></p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
                <Button className="flex-1" onClick={resetWizard}>
                  <Plus className="h-4 w-4 mr-1" /> Criar outra campanha
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md bg-card border-white/5" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {creationStep === "error" ? "Erro na criação" : "Criando campanha..."}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {steps.map((s) => {
              const isActive = creationStep === s.key;
              const isDone =
                (s.key === "campaign" && ["adset", "ad", "done"].includes(creationStep)) ||
                (s.key === "adset" && ["ad", "done"].includes(creationStep)) ||
                (s.key === "ad" && creationStep === "done");
              const isFailed = creationStep === "error" && isActive;

              return (
                <div key={s.key} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center">
                    {isDone ? (
                      <CheckCircle className="h-5 w-5 text-[#4ADE80]" />
                    ) : isActive && !isFailed ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : isFailed ? (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    ) : (
                      <div className="h-3 w-3 rounded-full bg-muted/20" />
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      isDone ? "text-[#4ADE80]" : isActive ? "text-foreground font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}

            {creationStep === "error" && (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                  <p className="text-xs text-destructive">{creationError}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setCreationStep("idle"); setStep(3); }}>
                    Voltar ao editor
                  </Button>
                  <Button className="flex-1" onClick={handleCreate}>
                    <RotateCcw className="h-4 w-4 mr-1" /> Tentar novamente
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Main wizard ──

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-white/5">
        <DialogHeader>
          <DialogTitle className="text-foreground">Nova Campanha Meta Ads</DialogTitle>
        </DialogHeader>

        <StepIndicator />

        {/* ── STEP 1: Campaign ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nome da campanha *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Black Friday - Conversão"
                className="bg-[var(--surface2)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Objetivo *</Label>
              <Select value={objective} onValueChange={(v) => setObjective(v as CampaignObjective)}>
                <SelectTrigger className="bg-[var(--surface2)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OBJECTIVE_LABELS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{OBJECTIVE_LABELS[objective].description}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Budget diário (R$) *</Label>
              <Input
                type="number"
                min={5}
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Ex: 50.00"
                className="bg-[var(--surface2)]"
              />
              {budget && Number(budget) < 5 && (
                <p className="text-[11px] text-destructive">Mínimo R$ 5,00</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Categorias especiais</Label>
              <p className="text-[10px] text-muted-foreground">Marque apenas se seu anúncio é sobre esses temas</p>
              <div className="grid grid-cols-2 gap-2">
                {SPECIAL_AD_CATEGORIES.map((cat) => (
                  <label
                    key={cat.value}
                    className="flex items-center gap-2 rounded-md border border-white/5 bg-[var(--surface2)] px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <Checkbox
                      checked={specialCats.includes(cat.value)}
                      onCheckedChange={() => toggleSpecialCat(cat.value)}
                    />
                    <span className="text-xs text-foreground">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-white/5 bg-[var(--surface2)] px-4 py-3">
              <div>
                <p className="text-xs font-medium text-foreground">Criar como pausada</p>
                <p className="text-[10px] text-muted-foreground">Recomendado: revise antes de ativar</p>
              </div>
              <Switch checked={startPaused} onCheckedChange={setStartPaused} />
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} disabled={!step1Valid}>
                Próximo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Adset ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nome do conjunto *</Label>
              <Input
                value={adsetName}
                onChange={(e) => setAdsetName(e.target.value)}
                className="bg-[var(--surface2)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Idade mínima</Label>
                <Input
                  type="number"
                  min={18}
                  max={64}
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                  className="bg-[var(--surface2)]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Idade máxima</Label>
                <Input
                  type="number"
                  min={19}
                  max={65}
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                  className="bg-[var(--surface2)]"
                />
              </div>
            </div>
            {Number(ageMin) >= Number(ageMax) && (
              <p className="text-[11px] text-destructive">Idade mínima deve ser menor que a máxima</p>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Gênero</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="bg-[var(--surface2)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Todos</SelectItem>
                  <SelectItem value="1">Homens</SelectItem>
                  <SelectItem value="2">Mulheres</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">País *</Label>
              <div className="flex flex-wrap gap-2">
                {COUNTRIES.map((c) => (
                  <label
                    key={c.value}
                    className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 cursor-pointer text-xs transition-colors ${
                      countries.includes(c.value)
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-white/5 bg-[var(--surface2)] text-muted-foreground hover:bg-white/5"
                    }`}
                  >
                    <Checkbox
                      checked={countries.includes(c.value)}
                      onCheckedChange={() => toggleCountry(c.value)}
                      className="h-3 w-3"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div className="space-y-1.5 relative" ref={interestRef}>
              <Label className="text-xs text-muted-foreground">Interesses</Label>
              {selectedInterests.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {selectedInterests.map((i) => (
                    <Badge
                      key={i.id}
                      variant="secondary"
                      className="gap-1 text-[10px] bg-primary/10 text-primary border-primary/20"
                    >
                      {i.name}
                      <button onClick={() => removeInterest(i.id)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Input
                value={interestSearch}
                onChange={(e) => {
                  setInterestSearch(e.target.value);
                  setShowInterestDropdown(true);
                }}
                onFocus={() => interestSearch.length >= 2 && setShowInterestDropdown(true)}
                placeholder="Buscar interesses..."
                className="bg-[var(--surface2)]"
              />
              {showInterestDropdown && mgr.interests.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-white/10 bg-popover shadow-lg max-h-48 overflow-y-auto">
                  {mgr.interests.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => addInterest(i)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors flex justify-between"
                    >
                      <span className="text-foreground">{i.name}</span>
                      {i.audience_size_lower_bound && (
                        <span className="text-muted-foreground">
                          {(i.audience_size_lower_bound / 1e6).toFixed(1)}M–
                          {((i.audience_size_upper_bound || 0) / 1e6).toFixed(1)}M
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {showInterestDropdown && mgr.isSearchingInterests && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-white/10 bg-popover p-3 text-center">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Plataformas</Label>
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <Checkbox checked={platforms.facebook} onCheckedChange={(v) => setPlatforms((p) => ({ ...p, facebook: !!v }))} />
                  Facebook
                </label>
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <Checkbox checked={platforms.instagram} onCheckedChange={(v) => setPlatforms((p) => ({ ...p, instagram: !!v }))} />
                  Instagram
                </label>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Posicionamentos</Label>
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <Checkbox checked={positions.feed} onCheckedChange={(v) => setPositions((p) => ({ ...p, feed: !!v }))} />
                  Feed
                </label>
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <Checkbox checked={positions.stories} onCheckedChange={(v) => setPositions((p) => ({ ...p, stories: !!v }))} />
                  Stories
                </label>
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <Checkbox checked={positions.reels} onCheckedChange={(v) => setPositions((p) => ({ ...p, reels: !!v }))} />
                  Reels
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Otimização</Label>
              <Select value={optimizationGoal} onValueChange={setOptimizationGoal}>
                <SelectTrigger className="bg-[var(--surface2)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPTIMIZATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button onClick={() => setStep(3)} disabled={!step2Valid}>
                Próximo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Ad ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Página do Facebook *</Label>
              {mgr.isLoadingPages ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando páginas...
                </div>
              ) : mgr.pages.length === 0 ? (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Nenhuma página encontrada. Verifique as permissões da sua conta.
                  </p>
                </div>
              ) : (
                <Select value={pageId} onValueChange={setPageId}>
                  <SelectTrigger className="bg-[var(--surface2)]">
                    <SelectValue placeholder="Selecione uma página" />
                  </SelectTrigger>
                  <SelectContent>
                    {mgr.pages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          {p.picture?.data?.url && (
                            <img src={p.picture.data.url} alt="" className="h-5 w-5 rounded-full" />
                          )}
                          {p.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Headline *</Label>
                <span className={`text-[10px] ${headline.length > 40 ? "text-destructive" : "text-muted-foreground"}`}>
                  {headline.length}/40
                </span>
              </div>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Ex: Oferta imperdível!"
                className="bg-[var(--surface2)]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Texto principal *</Label>
                <span className={`text-[10px] ${bodyText.length > 125 ? "text-destructive" : "text-muted-foreground"}`}>
                  {bodyText.length}/125
                </span>
              </div>
              <Textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Descreva sua oferta..."
                className="bg-[var(--surface2)] min-h-[80px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Descrição do link</Label>
              <Input
                value={linkDesc}
                onChange={(e) => setLinkDesc(e.target.value)}
                placeholder="Opcional"
                className="bg-[var(--surface2)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">URL de destino *</Label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://seusite.com.br"
                className="bg-[var(--surface2)]"
              />
              {linkUrl && !/^https?:\/\/.+/.test(linkUrl) && (
                <p className="text-[11px] text-destructive">URL deve começar com http:// ou https://</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Botão de ação</Label>
              <Select value={cta} onValueChange={(v) => setCta(v as CallToAction)}>
                <SelectTrigger className="bg-[var(--surface2)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CTA_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">URL da imagem</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
                className="bg-[var(--surface2)]"
              />
              <p className="text-[10px] text-muted-foreground">
                Cole a URL de uma imagem pública. Recomendado: 1080×1080px, JPG ou PNG
              </p>
              {imageUrl && /^https?:\/\/.+/.test(imageUrl) && (
                <div className="mt-2 rounded-md border border-white/5 overflow-hidden bg-[var(--surface2)] p-2">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="max-h-40 mx-auto rounded object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button onClick={handleCreate} disabled={!step3Valid || isProcessing}>
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Criar Campanha
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
