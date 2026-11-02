import type { EstadoForm } from "@/app/(app)/acoes";

export function MensagemForm({ estado, sucesso }: { estado: EstadoForm; sucesso?: string }) {
  if (estado.erro) return <p className="text-sm text-red-700">{estado.erro}</p>;
  if (estado.ok && sucesso) return <p className="text-sm text-green-700">{sucesso}</p>;
  return null;
}
