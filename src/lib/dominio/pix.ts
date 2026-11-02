// Geração do "Pix copia e cola" (BR Code estático), padrão EMV do Banco Central.

export type TipoChavePix = "cpf_cnpj" | "celular" | "email" | "aleatoria";

/** Normaliza a chave para o formato que os bancos aceitam. Retorna null se inválida. */
export function normalizarChavePix(tipo: TipoChavePix, chave: string): string | null {
  const texto = chave.trim();
  switch (tipo) {
    case "cpf_cnpj": {
      const digitos = texto.replace(/\D/g, "");
      return digitos.length === 11 || digitos.length === 14 ? digitos : null;
    }
    case "celular": {
      let digitos = texto.replace(/\D/g, "");
      if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
      return /^55\d{10,11}$/.test(digitos) ? `+${digitos}` : null;
    }
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto) && texto.length <= 77 ? texto.toLowerCase() : null;
    case "aleatoria":
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(texto)
        ? texto.toLowerCase()
        : null;
  }
}

function campo(id: string, valor: string) {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

/** Nome e cidade no BR Code só aceitam ASCII. */
function somenteAscii(texto: string, limite: number) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .slice(0, limite) || "NA";
}

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), exigido no campo 63. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function gerarPixCopiaECola(params: {
  chave: string; // já normalizada
  nomeRecebedor: string;
  valorCentavos: number;
  cidade?: string;
  descricao?: string;
}): string {
  const contaPix =
    campo("00", "br.gov.bcb.pix") +
    campo("01", params.chave) +
    (params.descricao ? campo("02", somenteAscii(params.descricao, 40)) : "");

  const payload =
    campo("00", "01") +
    campo("26", contaPix) +
    campo("52", "0000") +
    campo("53", "986") + // BRL
    campo("54", (params.valorCentavos / 100).toFixed(2)) +
    campo("58", "BR") +
    campo("59", somenteAscii(params.nomeRecebedor, 25)) +
    campo("60", somenteAscii(params.cidade ?? "BRASIL", 15)) +
    campo("62", campo("05", "***")) +
    "6304";

  return payload + crc16(payload);
}

/** Deduz o tipo de uma chave já normalizada (para preencher o formulário de edição). */
export function tipoDaChave(chave: string): TipoChavePix {
  if (chave.startsWith("+")) return "celular";
  if (chave.includes("@")) return "email";
  if (/^\d+$/.test(chave)) return "cpf_cnpj";
  return "aleatoria";
}
