import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import { calcMolhoReceita, recalcMolhoCusto, recalcProdutosComMolho, recalcTodosMolhosCusto } from "@/lib/molho";
import { baseUnit } from "@/lib/unidade-medida";
import { toast } from "sonner";
import { Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";
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

const Molhos = () => {
  const { empresaId } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [materias, setMaterias] = useState<any[]>([]);
  const [receitas, setReceitas] = useState<Record<string, any[]>>({});
  const [open, setOpen] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [novasMaterias, setNovasMaterias] = useState<{ id: string; name: string; qtd: string; und: string }[]>([]);
  const [tempMateria, setTempMateria] = useState("");
  const [tempQtd, setTempQtd] = useState("");
  const [novoMateria, setNovoMateria] = useState("");
  const [novoQtd, setNovoQtd] = useState("");

  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<{ id: string; nome: string } | null>(null);
  const { isSubmitting, withLock } = useSubmitLock();

  useEffect(() => { document.title = "Molhos · Vendas Pro"; }, []);

  const load = async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data: molhos, error } = await supabase
      .from("molho")
      .select("*")
      .eq("id_empresa", empresaId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setItems(molhos ?? []);
    const { data: mats } = await supabase.from("MateriaPrima").select("*").eq("id_empresa", empresaId);
    setMaterias(mats ?? []);

    const { data: mxm } = await supabase
      .from("molhoxmateria")
      .select("*, MateriaPrima:id_materia(nome, Custo, unidade_medida)")
      .eq("id_empresa", empresaId);

    const map: Record<string, any[]> = {};
    (mxm ?? []).forEach((r: any) => {
      map[r.id_molho] ??= [];
      map[r.id_molho].push(r);
    });
    setReceitas(map);

    const idsComReceita = Object.keys(map).filter((id) => (map[id]?.length ?? 0) > 0);
    if (idsComReceita.length > 0) {
      try {
        await recalcTodosMolhosCusto(supabase, idsComReceita, empresaId);
        const { data: atualizados } = await supabase
          .from("molho")
          .select("*")
          .eq("id_empresa", empresaId)
          .order("created_at", { ascending: false });
        if (atualizados) setItems(atualizados);
      } catch (e: any) {
        console.error(e);
        toast.error("Erro ao atualizar custo unitário: " + (e.message ?? "verifique RLS na tabela molho"));
      }
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, [empresaId]);

  const afterReceitaChange = async (idMolho: string) => {
    try {
      await recalcMolhoCusto(supabase, idMolho, empresaId);
      await recalcProdutosComMolho(supabase, idMolho, empresaId);
      await load();
    } catch (e: any) {
      toast.error("Erro ao salvar custo unitário: " + e.message);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId || !nome.trim()) return;

    await withLock(async () => {
      const { data: molho, error } = await supabase
        .from("molho")
        .insert({ nome: nome.trim(), id_empresa: empresaId, custo_unitario: 0 })
        .select()
        .single();

      if (error) {
        toast.error(error.message);
        return;
      }

      if (novasMaterias.length > 0) {
        const links = novasMaterias.map((m) => ({
          id_molho: molho.id,
          id_materia: parseInt(m.id),
          id_empresa: empresaId,
          quantidade: parseFloat(m.qtd) || 0,
        }));
        const { error: linkErr } = await supabase.from("molhoxmateria").insert(links);
        if (linkErr) {
          toast.error("Erro ao vincular matérias-primas: " + linkErr.message);
        } else {
          try {
            await recalcMolhoCusto(supabase, molho.id, empresaId);
          } catch (e: any) {
            toast.error("Erro ao calcular custo unitário: " + e.message);
          }
        }
      }

      setNome("");
      setNovasMaterias([]);
      setTempMateria("");
      setTempQtd("");
      toast.success("Molho cadastrado");
      await load();
    });
  };

  const remove = async (id: string) => {
    if (!empresaId) return;
    await supabase.from("molhoxmateria").delete().eq("id_molho", id).eq("id_empresa", empresaId);
    await supabase.from("molhoxproduto").delete().eq("id_molho", id).eq("id_empresa", empresaId);
    const { error } = await supabase.from("molho").delete().eq("id", id).eq("id_empresa", empresaId);
    if (error) return toast.error(error.message);
    toast.success("Molho excluído");
    setToDelete(null);
    load();
  };

  const addMateria = async (idMolho: string) => {
    if (!novoMateria || !novoQtd || !empresaId) return;
    const jaExiste = (receitas[idMolho] ?? []).some((r) => r.id_materia === parseInt(novoMateria));
    if (jaExiste) return toast.error("Esta matéria-prima já está no molho.");

    const { error } = await supabase.from("molhoxmateria").insert({
      id_molho: idMolho,
      id_materia: parseInt(novoMateria),
      id_empresa: empresaId,
      quantidade: parseFloat(novoQtd) || 0,
    });
    if (error) return toast.error(error.message);
    setNovoMateria("");
    setNovoQtd("");
    toast.success("Ingrediente adicionado");
    await afterReceitaChange(idMolho);
  };

  const removeMateria = async (id: number, idMolho: string) => {
    if (!empresaId) return;
    await supabase.from("molhoxmateria").delete().eq("id", id).eq("id_empresa", empresaId);
    await afterReceitaChange(idMolho);
  };

  const addTempMateria = () => {
    if (!tempMateria || !tempQtd) return;
    if (novasMaterias.some((m) => m.id === tempMateria)) {
      return toast.error("Esta matéria-prima já foi adicionada.");
    }
    const mat = materias.find((m) => String(m.id) === tempMateria);
    if (mat) {
      const und = baseUnit(mat.unidade_medida || "un");
      setNovasMaterias((prev) => [...prev, { id: tempMateria, name: mat.nome, qtd: tempQtd, und }]);
      setTempMateria("");
      setTempQtd("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold">Molhos</h1>
        <p className="text-muted-foreground text-sm font-medium">
          Receita em gramas/ml (1 ml = 1 g). O custo do molho é calculado por grama automaticamente.
        </p>
      </header>

      <Card className="p-5">
        <form onSubmit={add} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="space-y-2 md:col-span-2">
              <Label>Nome do molho</Label>
              <Input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Molho especial" />
            </div>
            <Button type="submit" disabled={isSubmitting} className="md:col-span-1">
              {isSubmitting ? "Cadastrando..." : <><Plus className="h-4 w-4 mr-1" /> Cadastrar molho</>}
            </Button>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="text-sm font-semibold text-muted-foreground">Composição (matérias-primas)</div>
            {novasMaterias.length > 0 && (
              <div className="space-y-2">
                {novasMaterias.map((m, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm border p-2 rounded bg-background font-medium">
                    <span>{m.name} × {m.qtd} {m.und}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setNovasMaterias((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Select value={tempMateria} onValueChange={setTempMateria}>
                  <SelectTrigger><SelectValue placeholder="Matéria-prima" /></SelectTrigger>
                  <SelectContent>
                    {materias.map((m) => {
                      const und = baseUnit(m.unidade_medida || "un");
                      return (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.nome} (em {und})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <Input
                className="w-28"
                type="number"
                step="0.01"
                min="0"
                placeholder="Qtd"
                value={tempQtd}
                onChange={(e) => setTempQtd(e.target.value)}
              />
              <Button type="button" size="sm" variant="secondary" onClick={addTempMateria}>
                Adicionar
              </Button>
            </div>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {items.map((m) => {
          const isOpen = open === m.id;
          const receita = receitas[m.id] ?? [];
          const { totalPeso, totalCusto, custoPorGrama } = calcMolhoReceita(receita);
          const custoGrama = totalPeso > 0 ? custoPorGrama : (m.custo_unitario ?? 0);

          return (
            <Card key={m.id} className="overflow-hidden">
              <div className="p-4 flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-lg">{m.nome}</div>
                  <div className="text-sm text-muted-foreground font-medium space-y-0.5">
                    <div>
                      Custo unitário: <span className="text-primary font-bold">{fmt(custoGrama)} / g</span>
                    </div>
                    {totalPeso > 0 && (
                      <div className="text-xs">
                        Receita: {totalPeso.toLocaleString("pt-BR")} g/ml · Custo total {fmt(totalCusto)}
                      </div>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setOpen(isOpen ? null : m.id)}>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setToDelete({ id: m.id, nome: m.nome })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              {isOpen && (
                <div className="border-t border-border p-4 space-y-3 bg-muted/20">
                  <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Ingredientes</div>
                  {receita.map((r) => {
                    const und = baseUnit(r.MateriaPrima?.unidade_medida || "un");
                    return (
                      <div key={r.id} className="flex items-center justify-between text-sm font-medium">
                        <span>
                          {r.MateriaPrima?.nome} × {r.quantidade} {und}
                          <span className="text-muted-foreground ml-2">
                            ({fmt((r.MateriaPrima?.Custo ?? 0) * (r.quantidade ?? 0))})
                          </span>
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => removeMateria(r.id, m.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                  {receita.length === 0 && (
                    <p className="text-sm text-muted-foreground font-medium">Nenhuma matéria-prima vinculada.</p>
                  )}
                  <div className="flex gap-2 items-end pt-2">
                    <div className="flex-1">
                      <Select value={novoMateria} onValueChange={setNovoMateria}>
                        <SelectTrigger><SelectValue placeholder="Matéria-prima" /></SelectTrigger>
                        <SelectContent>
                          {materias.map((mat) => {
                            const und = baseUnit(mat.unidade_medida || "un");
                            return (
                              <SelectItem key={mat.id} value={String(mat.id)}>{mat.nome} (em {und})</SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      className="w-28"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Qtd"
                      value={novoQtd}
                      onChange={(e) => setNovoQtd(e.target.value)}
                    />
                    <Button size="sm" onClick={() => addMateria(m.id)}>Vincular</Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {items.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground font-medium">Nenhum molho cadastrado.</Card>
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir molho?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{toDelete?.nome}</strong>? Vínculos com produtos e ingredientes serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => toDelete && remove(toDelete.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Molhos;
