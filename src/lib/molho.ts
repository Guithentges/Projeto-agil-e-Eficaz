import type { SupabaseClient } from "@supabase/supabase-js";

type MolhoMateriaRow = {
  quantidade: number | null;
  MateriaPrima?: { Custo?: number | null; unidade_medida?: string | null } | null;
};

/** Soma quantidades (g/ml equivalentes) e custo total da receita do molho. */
export function calcMolhoReceita(rows: MolhoMateriaRow[]) {
  let totalPeso = 0;
  let totalCusto = 0;
  for (const r of rows) {
    const qtd = r.quantidade ?? 0;
    totalPeso += qtd;
    totalCusto += qtd * (r.MateriaPrima?.Custo ?? 0);
  }
  const custoPorGrama = totalPeso > 0 ? totalCusto / totalPeso : 0;
  return { totalPeso, totalCusto, custoPorGrama };
}

/** Recalcula e grava custo_unitario (R$/g) na tabela molho. */
export async function recalcMolhoCusto(
  supabase: SupabaseClient,
  idMolho: string,
  empresaId: number,
): Promise<number> {
  const { data } = await supabase
    .from("molhoxmateria")
    .select("quantidade, MateriaPrima:id_materia(Custo, unidade_medida)")
    .eq("id_molho", idMolho)
    .eq("id_empresa", empresaId);

  const { custoPorGrama } = calcMolhoReceita((data ?? []) as MolhoMateriaRow[]);

  const { error } = await supabase
    .from("molho")
    .update({ custo_unitario: custoPorGrama })
    .eq("id", idMolho)
    .eq("id_empresa", empresaId);

  if (error) throw error;

  return custoPorGrama;
}

/** Recalcula custo_unitario de todos os molhos que têm receita. */
export async function recalcTodosMolhosCusto(
  supabase: SupabaseClient,
  molhoIds: string[],
  empresaId: number,
): Promise<void> {
  await Promise.all(molhoIds.map((id) => recalcMolhoCusto(supabase, id, empresaId)));
}

export async function getMolhoCustoPorGrama(
  supabase: SupabaseClient,
  idMolho: string,
  empresaId: number,
): Promise<number> {
  const { data } = await supabase
    .from("molho")
    .select("custo_unitario")
    .eq("id", idMolho)
    .eq("id_empresa", empresaId)
    .single();

  return data?.custo_unitario ?? 0;
}

export async function calcProdutoCusto(
  supabase: SupabaseClient,
  idProduto: number,
  empresaId: number,
): Promise<number> {
  const { data: pm } = await supabase
    .from("ProduxMateria")
    .select("quantidade, MateriaPrima:id_materia(Custo)")
    .eq("id_produto", idProduto)
    .eq("id_empresa", empresaId);

  let custo = (pm ?? []).reduce((s: number, r: any) => {
    return s + (r.MateriaPrima?.Custo ?? 0) * (r.quantidade ?? 0);
  }, 0);

  const { data: links, error: linksError } = await supabase
    .from("molhoxproduto")
    .select("id_molho, quantidade, molho:id_molho(custo_unitario)")
    .eq("id_produto", idProduto)
    .eq("id_empresa", empresaId);

  if (linksError) throw linksError;

  for (const link of links ?? []) {
    let custoGrama = (link.molho as { custo_unitario?: number } | null)?.custo_unitario ?? 0;
    if (custoGrama <= 0) {
      custoGrama = await recalcMolhoCusto(supabase, link.id_molho, empresaId);
    }
    custo += custoGrama * (link.quantidade ?? 0);
  }

  return custo;
}

/** Recalcula e grava Custo em Produtos que usam molhos. */
export async function recalcProdutosComMolhos(
  supabase: SupabaseClient,
  idProdutos: number[],
  empresaId: number,
): Promise<void> {
  await Promise.all(
    idProdutos.map(async (idProduto) => {
      const custo = await calcProdutoCusto(supabase, idProduto, empresaId);
      const { error } = await supabase
        .from("Produtos")
        .update({ Custo: custo })
        .eq("id", idProduto)
        .eq("id_empresa", empresaId);
      if (error) throw error;
    }),
  );
}

export async function recalcProdutosComMolho(
  supabase: SupabaseClient,
  idMolho: string,
  empresaId: number,
): Promise<void> {
  const { data: links } = await supabase
    .from("molhoxproduto")
    .select("id_produto")
    .eq("id_molho", idMolho)
    .eq("id_empresa", empresaId);

  await Promise.all(
    (links ?? []).map(async (link) => {
      const custo = await calcProdutoCusto(supabase, link.id_produto, empresaId);
      await supabase
        .from("Produtos")
        .update({ Custo: custo })
        .eq("id", link.id_produto)
        .eq("id_empresa", empresaId);
    }),
  );
}
