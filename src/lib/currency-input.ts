/** Formata centavos (inteiro) para exibição pt-BR com 2 casas decimais. */
export const formatCentsDisplay = (cents: number): string =>
  (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Converte string digitada (só números) em centavos. */
export const digitsToCents = (raw: string): number => {
  const digits = raw.replace(/\D/g, "");
  return parseInt(digits || "0", 10);
};

export const centsToReais = (cents: number): number => cents / 100;

export const reaisToCents = (reais: number): number => Math.round(reais * 100);
