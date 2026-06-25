/** Kanban de execução: tarefas e otimizações da equipe. */

export type Status = "todo" | "doing" | "review" | "done";
export type Priority = "alta" | "media" | "baixa";
export type TaskType = "Otimização" | "Criativo" | "Relatório" | "Reunião" | "Setup";

export type Task = {
  id: string;
  title: string;
  client: string;
  type: TaskType;
  priority: Priority;
  assignee: string; // iniciais
  due: string;
  overdue?: boolean;
  done?: boolean;
  status: Status;
};

export const columns: { key: Status; label: string; color: string }[] = [
  { key: "todo", label: "A fazer", color: "var(--muted-foreground)" },
  { key: "doing", label: "Em andamento", color: "var(--chart-5)" },
  { key: "review", label: "Em revisão", color: "var(--warning)" },
  { key: "done", label: "Concluído", color: "var(--success)" },
];

export const priorityMeta: Record<Priority, { label: string; color: string }> = {
  alta: { label: "Alta", color: "var(--destructive)" },
  media: { label: "Média", color: "var(--warning)" },
  baixa: { label: "Baixa", color: "var(--muted-foreground)" },
};

export const typeVariant: Record<TaskType, "brand" | "success" | "neutral" | "warning"> = {
  Otimização: "brand",
  Criativo: "success",
  Relatório: "neutral",
  Reunião: "warning",
  Setup: "neutral",
};

export const tasks: Task[] = [
  { id: "1", title: "Reduzir CPA da campanha Advantage+", client: "Loja Norte Calçados", type: "Otimização", priority: "alta", assignee: "CA", due: "Hoje", overdue: false, status: "todo" },
  { id: "2", title: "Subir 3 novos criativos de Reels", client: "Bella Estética", type: "Criativo", priority: "media", assignee: "DM", due: "Amanhã", status: "todo" },
  { id: "3", title: "Configurar conversão de leads (GA4)", client: "EduPro Cursos", type: "Setup", priority: "alta", assignee: "FL", due: "12/06", overdue: true, status: "todo" },
  { id: "4", title: "Testar público lookalike 2%", client: "Clínica Vitalis", type: "Otimização", priority: "media", assignee: "CA", due: "16/06", status: "doing" },
  { id: "5", title: "Ajustar orçamento de Search", client: "Clínica Vitalis", type: "Otimização", priority: "baixa", assignee: "DM", due: "17/06", status: "doing" },
  { id: "6", title: "Revisar copy dos anúncios de inverno", client: "Bella Estética", type: "Criativo", priority: "media", assignee: "BL", due: "Hoje", status: "review" },
  { id: "7", title: "Relatório mensal — Diretoria", client: "Clínica Vitalis", type: "Relatório", priority: "alta", assignee: "FL", due: "Amanhã", status: "review" },
  { id: "8", title: "Reunião de alinhamento mensal", client: "TechParts B2B", type: "Reunião", priority: "media", assignee: "CA", due: "18/06", status: "todo" },
  { id: "9", title: "Pausar campanhas com ROAS < 2", client: "Sabor & Cia Delivery", type: "Otimização", priority: "alta", assignee: "DM", due: "Ontem", done: true, status: "done" },
  { id: "10", title: "Enviar relatório semanal", client: "Bella Estética", type: "Relatório", priority: "baixa", assignee: "FL", due: "Seg", done: true, status: "done" },
];
