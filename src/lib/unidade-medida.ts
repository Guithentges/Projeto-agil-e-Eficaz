/** Unidade em que custo e receita são armazenados (g para kg, ml para litro). */
export const baseUnit = (und: string): string => {
  if (und === "kg") return "g";
  if (und === "l") return "ml";
  return und || "un";
};

/** kg e litro: usuário informa na unidade maior; estoque/receita usam a base (g/ml). */
export const isBulkUnit = (und: string): boolean => und === "kg" || und === "l";

export const toBaseQuantity = (und: string, qty: number): number =>
  isBulkUnit(und) ? qty * 1000 : qty;

export const bulkCostMultiplier = (und: string): number => (isBulkUnit(und) ? 1000 : 1);

export const quantityInputLabel = (und: string): string => {
  if (und === "kg") return "Quantidade (em kg)";
  if (und === "g") return "Gramas (g)";
  if (und === "l") return "Quantidade (em litros)";
  if (und === "ml") return "Mililitros (ml)";
  return "Quantidade (un)";
};

export const quantityInputPlaceholder = (und: string): string =>
  isBulkUnit(und) ? "Ex: 5" : "Qtd";
