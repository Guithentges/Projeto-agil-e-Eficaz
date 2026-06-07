import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { bulkCostMultiplier, baseUnit, isBulkUnit } from "@/lib/unidade-medida";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MateriaPrima = () => {
  const { empresaId } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState("un");

  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<{ id: number; nome: string; produtosVinculados: number[] } | null>(null);
  const { isSubmitting, withLock } = useSubmitLock();

  useEffect(() => { document.title = "Matéria-Prima · Vendas Pro"; }, []);

  const load = async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data } = await supabase.from("MateriaPrima").select("*").eq("id_empresa", empresaId).order("id", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [empresaId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    await withLock(async () => {
      const { error } = await supabase.from("MateriaPrima").insert({
        nome, Custo: 0, id_empresa: empresaId, unidade_medida: unidade,
      } as any);
      if (error) {
        toast.error(error.message);
        return;
      }
      setNome("");
      setUnidade("un");
      toast.success("Matéria-prima cadastrada");
      await load();
    });
  };

  const handleDeleteClick = async (id: number, nome: string) => {
    if (!empresaId) return;
    const { data } = await supabase
      .from("ProduxMateria")
      .select("id_produto")
      .eq("id_materia", id)
      .eq("id_empresa", empresaId);
    
    // @ts-ignore
    const produtosIds = data ? data.map((d) => d.id_produto) : [];
    setToDelete({ id, nome, produtosVinculados: produtosIds });
  };

  const remove = async (id: number, produtosIds: number[], deleteProducts: boolean) => {
    if (!empresaId) return;

    if (deleteProducts && produtosIds.length > 0) {
      for (const prodId of produtosIds) {
        await supabase.from("ProduxMateria").delete().eq("id_produto", prodId).eq("id_empresa", empresaId);
        await supabase.from("molhoxproduto").delete().eq("id_produto", prodId).eq("id_empresa", empresaId);
        await supabase.from("Estoque").delete().eq("id_produto", prodId).eq("id_empresa", empresaId);
        await supabase.from("ProduxCard").delete().eq("id_produto", prodId).eq("id_empresa", empresaId);
        await supabase.from("Gastos").delete().eq("id_produto", prodId).eq("id_empresa", empresaId);
        await supabase.from("Produtos").delete().eq("id", prodId).eq("id_empresa", empresaId);
      }
    }

    // 1. Remover vínculos na tabela ProduxMateria (matéria-prima ↔ produto)
    const { error: errPM } = await supabase
      .from("ProduxMateria")
      .delete()
      .eq("id_materia", id)
      .eq("id_empresa", empresaId);
    if (errPM) return toast.error("Erro ao desvincular produtos: " + errPM.message);

    // 2. Remover vínculos na tabela molhoxmateria (matéria-prima ↔ molho)
    const { error: errMM } = await supabase
      .from("molhoxmateria")
      .delete()
      .eq("id_materia", id)
      .eq("id_empresa", empresaId);
    if (errMM) return toast.error("Erro ao desvincular molhos: " + errMM.message);

    // 3. Remover registros de estoque vinculados
    const { error: errEst } = await supabase
      .from("Estoque")
      .delete()
      .eq("id_materia", id)
      .eq("id_empresa", empresaId);
    if (errEst) return toast.error("Erro ao remover estoque: " + errEst.message);

    // 4. Remover registros de gastos vinculados
    const { error: errGasto } = await supabase
      .from("Gastos")
      .delete()
      .eq("id_materia", id)
      .eq("id_empresa", empresaId);
    if (errGasto) return toast.error("Erro ao remover gastos: " + errGasto.message);

    // 5. Finalmente, deletar a matéria-prima
    const { error } = await supabase.from("MateriaPrima").delete().eq("id", id).eq("id_empresa", empresaId);
    if (error) return toast.error(error.message);

    toast.success("Matéria-prima excluída com sucesso");
    setToDelete(null);
    load();
  };

    if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold">Matéria-Prima</h1>
        <p className="text-muted-foreground text-sm">Insumos com custo e fator de rendimento</p>
      </header>

      <Card className="p-5">
        <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-2 sm:col-span-2">
            <Label>Nome</Label>
            <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-1">
            <Label>Und. de Medida</Label>
            <Select value={unidade} onValueChange={setUnidade}>
              <SelectTrigger><SelectValue placeholder="Unidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="un">Unidade (un)</SelectItem>
                <SelectItem value="g">Grama (g)</SelectItem>
                <SelectItem value="kg">Quilograma (kg)</SelectItem>
                <SelectItem value="ml">Mililitro (ml)</SelectItem>
                <SelectItem value="l">Litro (l)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={isSubmitting} className="sm:col-span-1">
            {isSubmitting ? "Cadastrando..." : <><Plus className="h-4 w-4 mr-1" /> Adicionar</>}
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[450px]">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Nome</th>
              <th className="text-right px-4 py-2">Custo unitário atual</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-muted-foreground animate-pulse">Carregando matérias-primas...</td></tr>
            ) : (
              <>
            {items.map((m) => {
              const und = m.unidade_medida || 'un';
              return (
              <tr key={m.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  {m.nome}
                  <span className="ml-2 text-[10px] text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">
                    {und}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-primary">
                  {isBulkUnit(und) ? (
                    <div className="flex flex-col">
                       <span>{fmt(m.Custo ?? 0)} / {baseUnit(und)}</span>
                       <span className="text-[10px] text-muted-foreground font-semibold">{fmt((m.Custo ?? 0) * bulkCostMultiplier(und))} / {und}</span>
                    </div>
                  ) : (
                    <span>{fmt(m.Custo ?? 0)} / {und}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteClick(m.id, m.nome)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">Nenhuma matéria-prima.</td></tr>
            )}
              </>
            )}
          </tbody>
        </table>
        </div>
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir matéria-prima?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.produtosVinculados && toDelete.produtosVinculados.length > 0 ? (
                <>
                  <span className="block mb-2">
                    A matéria-prima <strong>{toDelete?.nome}</strong> está vinculada a {toDelete.produtosVinculados.length} produto(s).
                  </span>
                  <span className="block">
                    Você deseja excluir apenas a matéria-prima (desvinculando-a das receitas) ou excluir também os produtos que dependem dela?
                  </span>
                </>
              ) : (
                <>
                  Tem certeza que deseja excluir <strong>{toDelete?.nome}</strong>?
                  Todos os vínculos com molhos, estoque e gastos relacionados
                  também serão removidos. Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={toDelete?.produtosVinculados && toDelete.produtosVinculados.length > 0 ? "flex-col sm:flex-row gap-2 sm:gap-0" : ""}>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {toDelete?.produtosVinculados && toDelete.produtosVinculados.length > 0 ? (
              <>
                <AlertDialogAction
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  onClick={() => toDelete && remove(toDelete.id, toDelete.produtosVinculados, false)}
                >
                  Apenas Desvincular
                </AlertDialogAction>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => toDelete && remove(toDelete.id, toDelete.produtosVinculados, true)}
                >
                  Excluir com Produtos
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => toDelete && remove(toDelete.id, [], false)}
              >
                Excluir
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MateriaPrima;
