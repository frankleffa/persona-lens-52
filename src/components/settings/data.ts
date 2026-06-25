/** Equipe e papéis (dados de exemplo). */

export type Role = "admin" | "gestor" | "analista" | "cliente";

export const roleMeta: Record<Role, { label: string; variant: "brand" | "success" | "neutral" | "warning"; desc: string }> = {
  admin: { label: "Admin", variant: "brand", desc: "Acesso total: equipe, plano e todas as contas." },
  gestor: { label: "Gestor", variant: "success", desc: "Gerencia campanhas e clientes atribuídos." },
  analista: { label: "Analista", variant: "neutral", desc: "Visualiza dados e gera relatórios." },
  cliente: { label: "Cliente", variant: "warning", desc: "Vê apenas o próprio painel e relatórios." },
};

export type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  clients: number;
  status: "ativo" | "pendente";
  lastActive: string;
};

export const members: Member[] = [
  { id: "1", name: "Frank Leffa", email: "frank@adscape.com", role: "admin", clients: 8, status: "ativo", lastActive: "agora" },
  { id: "2", name: "Carla Andrade", email: "carla@adscape.com", role: "gestor", clients: 5, status: "ativo", lastActive: "há 12 min" },
  { id: "3", name: "Diego Martins", email: "diego@adscape.com", role: "gestor", clients: 3, status: "ativo", lastActive: "há 2 h" },
  { id: "4", name: "Beatriz Lima", email: "bia@adscape.com", role: "analista", clients: 0, status: "ativo", lastActive: "ontem" },
  { id: "5", name: "joao@vitalis.com", email: "joao@vitalis.com", role: "cliente", clients: 1, status: "pendente", lastActive: "—" },
];
