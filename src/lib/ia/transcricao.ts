/**
 * Transcrição de áudio -> texto.
 *
 * No MVP não é necessário: o profissional usa o ditado nativo do teclado do celular
 * (Gboard / iOS) direto no campo de texto, sem custo e sem trafegar áudio.
 *
 * Quando precisar de upload de áudio, implemente aqui com um provedor de
 * speech-to-text em pt-BR (ex.: Deepgram, AssemblyAI, Google STT), verificando
 * contrato de tratamento de dados (DPA) compatível com a LGPD.
 */
export async function transcreverAudio(_audio: Blob): Promise<string> {
  throw new Error("Transcrição de áudio ainda não implementada.");
}
