export const ROTULO_STATUS = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  realizada: "Realizada",
  falta: "Falta",
} as const;

export type StatusConsulta = keyof typeof ROTULO_STATUS;

export const COR_STATUS: Record<StatusConsulta, string> = {
  agendada: "bg-stone-100 text-stone-700",
  confirmada: "bg-blue-100 text-blue-800",
  cancelada: "bg-stone-100 text-stone-400 line-through",
  realizada: "bg-green-100 text-green-800",
  falta: "bg-amber-100 text-amber-800",
};
