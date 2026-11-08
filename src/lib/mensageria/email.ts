import "server-only";
import { exigirEnv } from "@/lib/env";

export const emailConfigurado = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_REMETENTE;

/** Envia um e-mail pela API do Resend. */
export async function enviarEmail(params: { para: string; assunto: string; html: string; responderPara?: string }) {
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${exigirEnv("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: exigirEnv("EMAIL_REMETENTE"),
      to: [params.para],
      subject: params.assunto,
      html: params.html,
      reply_to: params.responderPara,
    }),
  });
  if (!resposta.ok) {
    throw new Error(`Resend ${resposta.status}: ${await resposta.text()}`);
  }
}
