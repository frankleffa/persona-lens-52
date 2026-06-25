"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Building2,
  Check,
  CreditCard,
  Loader2,
  Lock,
  MoreHorizontal,
  Trash2,
  Upload,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Drawer } from "@/components/ui/drawer";
import { members as seed, roleMeta, type Member, type Role } from "./data";

const selectCls =
  "h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40";

type Section = "perfil" | "equipe" | "agencia" | "plano" | "notificacoes";
const sections: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: "perfil", label: "Perfil", icon: User },
  { key: "equipe", label: "Equipe", icon: Users },
  { key: "agencia", label: "Agência", icon: Building2 },
  { key: "plano", label: "Plano e cobrança", icon: CreditCard },
  { key: "notificacoes", label: "Notificações", icon: Bell },
];

export function SettingsView() {
  const [section, setSection] = useState<Section>("equipe");

  return (
    <>
      <div className="mb-8">
        <p className="eyebrow">Configurações</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Configurações</h1>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        <nav className="flex flex-col gap-0.5 lg:sticky lg:top-20 lg:self-start">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                section === s.key ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              )}
            >
              <s.icon className="size-4" />
              {s.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {section === "perfil" && <ProfileSection />}
          {section === "equipe" && <TeamSection />}
          {section === "agencia" && <AgencySection />}
          {section === "plano" && <PlanSection />}
          {section === "notificacoes" && <NotificationsSection />}
        </div>
      </div>
    </>
  );
}

/* ── Equipe ── */

function TeamSection() {
  const [members, setMembers] = useState<Member[]>(seed);
  const [invite, setInvite] = useState(false);

  function remove(m: Member) {
    setMembers((ms) => ms.filter((x) => x.id !== m.id));
    toast(`${m.name} removido da equipe.`);
  }
  function setRole(m: Member, role: Role) {
    setMembers((ms) => ms.map((x) => (x.id === m.id ? { ...x, role } : x)));
    toast.success(`Papel de ${m.name} alterado para ${roleMeta[role].label}.`);
  }

  return (
    <SectionShell
      title="Equipe"
      desc="Convide membros e defina o que cada um pode acessar."
      action={<Button onClick={() => setInvite(true)}><UserPlus />Convidar membro</Button>}
    >
      <Card className="p-0">
        <div className="overflow-x-auto scroll-slim">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Membro", "Papel", "Clientes", "Status", "Ativo", ""].map((h, i) => (
                  <th key={h + i} className="eyebrow px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-border/60 transition-colors hover:bg-surface-2/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-foreground">
                        {initials(m.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{m.name}</p>
                        <p className="truncate text-xs text-soft-foreground">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant={roleMeta[m.role].variant}>{roleMeta[m.role].label}</Badge></td>
                  <td className="tnum px-4 py-3 text-muted-foreground">{m.clients}</td>
                  <td className="px-4 py-3">
                    <Badge variant={m.status === "ativo" ? "success" : "warning"} dot>
                      {m.status === "ativo" ? "Ativo" : "Convite pendente"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.lastActive}</td>
                  <td className="px-4 py-3 text-right">
                    <Dropdown
                      align="right"
                      panelClass="w-48"
                      trigger={
                        <span className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground">
                          <MoreHorizontal className="size-4" />
                        </span>
                      }
                    >
                      {(close) => (
                        <>
                          <p className="px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-soft-foreground">Alterar papel</p>
                          {(Object.keys(roleMeta) as Role[]).map((r) => (
                            <button key={r} onClick={() => { setRole(m, r); close(); }} className="flex w-full items-center justify-between gap-2 rounded px-2.5 py-2 text-left text-sm text-foreground hover:bg-surface-2">
                              {roleMeta[r].label}
                              {m.role === r && <Check className="size-4 text-primary" />}
                            </button>
                          ))}
                          <div className="my-1 border-t border-border" />
                          <button onClick={() => { remove(m); close(); }} className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-destructive hover:bg-surface-2">
                            <Trash2 className="size-4" />
                            Remover
                          </button>
                        </>
                      )}
                    </Dropdown>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Legenda de papéis */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(Object.keys(roleMeta) as Role[]).map((r) => (
          <Card key={r} className="flex items-start gap-3 p-4">
            <Badge variant={roleMeta[r].variant}>{roleMeta[r].label}</Badge>
            <p className="text-sm text-muted-foreground">{roleMeta[r].desc}</p>
          </Card>
        ))}
      </div>

      {invite && (
        <InviteDrawer
          onClose={() => setInvite(false)}
          onInvite={(email, role) => {
            setMembers((ms) => [...ms, { id: `m-${Date.now()}`, name: email, email, role, clients: 0, status: "pendente", lastActive: "—" }]);
            toast.success(`Convite enviado para ${email}.`);
            setInvite(false);
          }}
        />
      )}
    </SectionShell>
  );
}

function InviteDrawer({ onClose, onInvite }: { onClose: () => void; onInvite: (email: string, role: Role) => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("gestor");
  return (
    <Drawer
      open
      onClose={onClose}
      title="Convidar membro"
      description="Envie um convite por e-mail com o papel definido."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={!email.includes("@")} onClick={() => onInvite(email, role)}>Enviar convite</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="E-mail">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@empresa.com" />
        </Field>
        <Field label="Papel">
          <select className={selectCls} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {(Object.keys(roleMeta) as Role[]).map((r) => <option key={r} value={r}>{roleMeta[r].label}</option>)}
          </select>
        </Field>
        <Card className="p-3 text-xs text-muted-foreground">{roleMeta[role].desc}</Card>
      </div>
    </Drawer>
  );
}

/* ── Perfil ── */

function ProfileSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) {
        setName((u.user_metadata?.full_name as string) ?? "");
        setEmail(u.email ?? "");
      }
      setLoading(false);
    });
  }, []);

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
      if (error) throw error;
      // Espelha no profiles (best-effort; RLS permite o próprio usuário).
      const { data } = await supabase.auth.getUser();
      if (data.user) await supabase.from("profiles").update({ full_name: name }).eq("id", data.user.id);
      toast.success("Perfil salvo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionShell
      title="Perfil"
      desc="Suas informações pessoais."
      action={
        <Button onClick={save} disabled={loading || saving}>
          {saving && <Loader2 className="animate-spin" />}
          Salvar
        </Button>
      }
    >
      <Card className="p-5">
        <div className="mb-6 flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-full bg-surface-2 text-lg font-semibold text-foreground">
            {initials(name || email || "AdScape")}
          </div>
          <Button variant="outline" size="sm" onClick={() => toast("Upload — em breve")}><Upload />Trocar foto</Button>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" disabled={loading} />
          </Field>
          <Field label="E-mail">
            <Input value={email} disabled title="O e-mail é gerenciado pela conta" />
          </Field>
        </div>
      </Card>

      <PasswordCard />
    </SectionShell>
  );
}

/* ── Troca de senha (real, via Supabase) ── */
function PasswordCard() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function change() {
    setErr(null);
    if (pw.length < 6) return setErr("A senha precisa de ao menos 6 caracteres.");
    if (pw !== confirm) return setErr("As senhas não coincidem.");
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setPw("");
      setConfirm("");
      toast.success("Senha alterada com sucesso.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível alterar a senha.";
      setErr(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mt-4 p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-md bg-surface-2 text-muted-foreground">
          <Lock className="size-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">Senha</p>
          <p className="text-xs text-muted-foreground">Defina uma nova senha de acesso.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nova senha">
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
        </Field>
        <Field label="Confirmar nova senha">
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
        </Field>
      </div>
      {err && <p className="mt-3 text-xs text-destructive">{err}</p>}
      <div className="mt-4 flex justify-end">
        <Button onClick={change} disabled={saving || !pw || !confirm}>
          {saving && <Loader2 className="animate-spin" />}
          Alterar senha
        </Button>
      </div>
    </Card>
  );
}

/* ── Agência ── */

const accents = ["#1c9cf0", "#003676", "#16a34a", "#7c5cff", "#f7931a", "#e11d74"];
function AgencySection() {
  const [accent, setAccent] = useState(accents[0]);
  const [whiteLabel, setWhiteLabel] = useState(true);
  return (
    <SectionShell title="Agência" desc="Identidade usada nos relatórios e no painel dos clientes." action={<Button onClick={() => toast.success("Agência salva.")}>Salvar</Button>}>
      <Card className="p-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Nome da agência"><Input defaultValue="AdScape" /></Field>
          <Field label="Site"><Input defaultValue="adscape.com" /></Field>
        </div>
        <div className="mt-5">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Logo</p>
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-md text-base font-bold text-white" style={{ background: accent }}>A</div>
            <Button variant="outline" size="sm" onClick={() => toast("Upload — em breve")}><Upload />Enviar logo</Button>
          </div>
        </div>
        <div className="mt-5">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Cor da marca</p>
          <div className="flex flex-wrap gap-2">
            {accents.map((a) => (
              <button key={a} onClick={() => setAccent(a)} className={cn("size-7 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all", accent === a ? "ring-foreground" : "ring-transparent")} style={{ background: a }} />
            ))}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2.5">
          <div>
            <p className="text-sm text-foreground">White-label por padrão</p>
            <p className="text-xs text-soft-foreground">Esconder a marca AdScape dos clientes</p>
          </div>
          <Switch checked={whiteLabel} onCheckedChange={setWhiteLabel} />
        </div>
      </Card>
    </SectionShell>
  );
}

/* ── Plano ── */

function PlanSection() {
  const usage = [
    { label: "Clientes", v: 8, max: 15 },
    { label: "Membros", v: 5, max: 10 },
    { label: "Relatórios/mês", v: 128, max: 500 },
  ];
  return (
    <SectionShell title="Plano e cobrança" desc="Gerencie sua assinatura e uso.">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <Badge variant="brand">Pro</Badge>
          <div>
            <p className="font-medium text-foreground">Plano Pro · R$ 297/mês</p>
            <p className="text-xs text-muted-foreground">Renova em 12/07/2026</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast("Portal de cobrança — em breve")}>Gerenciar cobrança</Button>
          <Button onClick={() => toast("Upgrade — em breve")}>Fazer upgrade</Button>
        </div>
      </Card>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {usage.map((u) => (
          <Card key={u.label} className="p-5">
            <p className="eyebrow">{u.label}</p>
            <p className="metric mt-2 text-xl font-medium text-foreground">{u.v}<span className="text-sm text-soft-foreground"> / {u.max}</span></p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (u.v / u.max) * 100)}%` }} />
            </div>
          </Card>
        ))}
      </div>
    </SectionShell>
  );
}

/* ── Notificações ── */

function NotificationsSection() {
  const items = [
    { k: "reports", label: "Relatórios enviados", desc: "Quando um relatório é entregue no WhatsApp", on: true },
    { k: "rules", label: "Regras automáticas", desc: "Quando uma regra pausa ou ajusta campanhas", on: true },
    { k: "balance", label: "Alerta de saldo", desc: "Quando o saldo de uma conta está baixo", on: true },
    { k: "leads", label: "Novos leads (CRM)", desc: "Quando um lead entra no funil", on: false },
    { k: "weekly", label: "Resumo semanal por e-mail", desc: "Panorama da carteira toda segunda", on: false },
  ];
  const [state, setState] = useState(() => Object.fromEntries(items.map((i) => [i.k, i.on])) as Record<string, boolean>);
  return (
    <SectionShell title="Notificações" desc="Escolha o que você quer receber.">
      <Card className="divide-y divide-border p-0">
        {items.map((i) => (
          <div key={i.k} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm text-foreground">{i.label}</p>
              <p className="text-xs text-soft-foreground">{i.desc}</p>
            </div>
            <Switch checked={state[i.k]} onCheckedChange={(v) => setState((s) => ({ ...s, [i.k]: v }))} />
          </div>
        ))}
      </Card>
    </SectionShell>
  );
}

/* ── helpers ── */

function SectionShell({ title, desc, action, children }: { title: string; desc: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function initials(name: string) {
  const parts = name.replace(/@.*/, "").split(/[\s.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}

function Dropdown({ trigger, children, align = "left", panelClass }: { trigger: React.ReactNode; children: (close: () => void) => React.ReactNode; align?: "left" | "right"; panelClass?: string }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <div className="relative inline-block">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className={cn("absolute z-50 mt-1 min-w-40 rounded-md border border-border bg-popover p-1 shadow-xl", align === "right" ? "right-0" : "left-0", panelClass)}>
            {children(close)}
          </div>
        </>
      )}
    </div>
  );
}
