import type { Tom } from "@/components/ui";

export const ROTULO_STATUS = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  realizada: "Realizada",
  falta: "Falta",
} as const;

export type StatusConsulta = keyof typeof ROTULO_STATUS;

export const TOM_STATUS: Record<StatusConsulta, Tom> = {
  agendada: "neutro",
  confirmada: "azul",
  cancelada: "neutro",
  realizada: "verde",
  falta: "ambar",
};
