import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

const Gastos = () => {
  const { empresaId } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [materias, setMaterias] = useState<any[]>([]);

  const [valor, setValor] = useState("");
  const [idCat, setIdCat] = useState("");
  const [idMat, setIdMat] = useState("");
  const [idProd, setIdProd] = useState("");
  const [fator, setFator] = useState("");
  const [uniques, setUniques] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Gastos · Vendas Pro"; }, []);

  const load = async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data, error } = await supabase.from("Gastos")
      .select(`
        *,
        Categoria:id_categoria(Nome),
        MateriaPrima:id_materia(nome),
        Produtos:id_produto(Nome)
      `)
      .eq("id_empresa", empresaId).order("created_at", { ascending: false });
    
    if (error) {
      console.error("Erro ao carregar gastos:", error);
      toast.error("Erro ao carregar dados: " + error.message);
      setLoading(false);
      return;
    }
    setItems(data ?? []);
    const { data: c } = await supabase.from("Categoria").select("*").eq("id_empresa", empresaId);
    setCategorias(c ?? []);
    const { data: m } = await supabase.from("MateriaPrima").select("*").eq("id_empresa", empresaId);
    setMaterias(m ?? []);
    const { data: u } = await supabase.from("Produtos").select("*").eq("id_empresa", empresaId).eq("is_unique", true);
    setUniques(u ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [empresaId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId || !idCat || !valor || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const valorNum = parseFloat(valor) || 0;
      let fatorNum = parseFloat(fator) || 0;
      const matId = idMat ? parseInt(idMat) : null;
      const prodId = idProd ? parseInt(idProd) : null;

      if (matId) {
        const mat = materias.find(m => m.id === matId);
        if (mat?.unidade_medida === 'kg') {
          fatorNum = fatorNum * 1000;
        }
      }

      const { error: gastoError } = await supabase.from("Gastos").insert({
        id_empresa: empresaId,
        id_categoria: parseInt(idCat),
        Valor: valorNum,
        id_materia: matId,
        id_produto: prodId,
        Fator: (matId || prodId) ? fatorNum : null,
      } as any);

      if (gastoError) {
        toast.error(gastoError.message);
        return;
      }

    if (matId) {
      toast.info("Atualizando estoque de matéria-prima...");
      // 1. Get current stock
      const { data: stockData } = await supabase.from("Estoque")
        .select("quantidade")
        .eq("id_materia", matId);
      const currentStock = (stockData ?? []).reduce((s, r) => s + (r.quantidade ?? 0), 0);

      // 2. Get current mat cost
      const { data: matData } = await supabase.from("MateriaPrima")
        .select("Custo")
        .eq("id", matId)
        .single();
      const currentCost = matData?.Custo ?? 0;

      // 3. Calc new weighted average cost
      let newCost = currentCost;
      if (fatorNum > 0) {
        if (currentStock <= 0) {
          newCost = valorNum / fatorNum;
        } else {
          // Weighted Average: (Total Value in Stock + New Purchase Value) / (Total Quantities)
          newCost = ((currentStock * currentCost) + valorNum) / (currentStock + fatorNum);
        }
      }

        const { error: costErr } = await supabase.from("MateriaPrima").update({ Custo: newCost }).eq("id", matId);
        if (costErr) {
          toast.error("Erro ao atualizar custo da MP: " + costErr.message);
          return;
        }

      // 5. Update Estoque (Upsert Logic)
      if (fatorNum > 0) {
        const { data: existing } = await supabase.from("Estoque")
          .select("id, quantidade")
          .eq("id_materia", matId)
          .eq("id_empresa", empresaId)
          .maybeSingle();
        
        if (existing) {
          await supabase.from("Estoque").update({ 
            quantidade: (existing.quantidade ?? 0) + fatorNum 
          }).eq("id", existing.id);
        } else {
          await supabase.from("Estoque").insert({ 
            id_materia: matId, 
            quantidade: fatorNum,
            id_empresa: Number(empresaId)
          } as any);
        }
      }

      // 6. Recalc all Products using this material
      const { data: prodsToUpdate } = await supabase.from("ProduxMateria")
        .select("id_produto")
        .eq("id_materia", matId);
      
        const uniqueProdIds = Array.from(new Set((prodsToUpdate ?? []).map(p => p.id_produto)));
        
        await Promise.all(uniqueProdIds.map(async (pid) => {
          const { data: pmData } = await supabase.from("ProduxMateria")
            .select("quantidade, MateriaPrima:id_materia(Custo)")
            .eq("id_produto", pid);
          const prodTotalCusto = (pmData ?? []).reduce((s, r: any) => s + (r.MateriaPrima?.Custo ?? 0) * (r.quantidade ?? 0), 0);
          await supabase.from("Produtos").update({ Custo: prodTotalCusto }).eq("id", pid);
        }));
      }

    if (prodId) {
      console.log("Atualizando estoque/custo para produto:", prodId, "Qtd:", fatorNum);
      toast.info("Atualizando estoque de produto...");
      // 1. Get current stock
      const { data: stockData } = await supabase.from("Estoque")
        .select("quantidade")
        .eq("id_produto", prodId);
      const currentStock = (stockData ?? []).reduce((s, r) => s + (r.quantidade ?? 0), 0);

      // 2. Get current prod cost
      const { data: prodData } = await supabase.from("Produtos")
        .select("Custo")
        .eq("id", prodId)
        .single();
      const currentCost = prodData?.Custo ?? 0;

      // 3. Calc new cost
      let newCost = currentCost;
      if (fatorNum > 0) {
        if (currentStock <= 0) {
          newCost = valorNum / fatorNum;
        } else {
          newCost = ((currentStock * currentCost) + valorNum) / (currentStock + fatorNum);
        }
      }

        const { error: costErr } = await supabase.from("Produtos").update({ Custo: newCost }).eq("id", prodId);
        if (costErr) {
          toast.error("Erro ao atualizar custo do produto: " + costErr.message);
          return;
        }

      // 5. Update Estoque (Upsert Logic)
      if (fatorNum > 0) {
        const { data: existing } = await supabase.from("Estoque")
          .select("id, quantidade")
          .eq("id_produto", prodId)
          .eq("id_empresa", empresaId)
          .maybeSingle();
        
        if (existing) {
          await supabase.from("Estoque").update({ 
            quantidade: (existing.quantidade ?? 0) + fatorNum 
          }).eq("id", existing.id);
        } else {
          await supabase.from("Estoque").insert({ 
            id_produto: prodId, 
            quantidade: fatorNum,
            id_empresa: Number(empresaId)
          } as any);
        }
      }
    }

      setValor(""); setIdMat(""); setIdProd(""); setFator("");
      toast.success("Gasto registrado e custos atualizados");
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro inesperado ao registrar gasto");
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = async (id: number) => {
    if (!empresaId) return;
    const { error } = await supabase.from("Gastos").delete().eq("id", id).eq("id_empresa", empresaId);
    if (error) return toast.error(error.message);
    load();
  };

  const total = items.reduce((s, g) => s + (g.Valor ?? 0), 0);

    if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Gastos</h1>
          <p className="text-muted-foreground">Despesas operacionais</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase text-muted-foreground tracking-wider">Total</div>
          <div className="text-2xl font-semibold text-destructive">{fmt(total)}</div>
        </div>
      </header>

      <Card className="p-5">
        <form onSubmit={add} className="grid md:grid-cols-4 gap-3 items-end">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={idCat} onValueChange={(val) => {
              setIdCat(val);
              const cat = categorias.find(c => String(c.id) === val);
              const isMP = cat?.Nome?.toLowerCase().includes("materia");
              const isUP = cat?.Nome?.toLowerCase().includes("revenda") || cat?.Nome?.toLowerCase().includes("único") || cat?.Nome?.toLowerCase().includes("unico");
              if (!isMP && !isUP) { setIdMat(""); setIdProd(""); setFator(""); }
            }}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categorias.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.Nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          {categorias.find(c => String(c.id) === idCat)?.Nome?.toLowerCase().includes("materia") && (
            <>
              <div className="space-y-2">
                <Label>Matéria-prima</Label>
                <Select value={idMat} onValueChange={setIdMat}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {materias.map((m) => {
                      const und = m.unidade_medida || 'un';
                      return <SelectItem key={m.id} value={String(m.id)}>{m.nome} ({und})</SelectItem>
                    })}
                  </SelectContent>
                </Select>
              </div>
              {idMat && (
                 <div className="space-y-2">
                  <Label>
                    {materias.find(m => String(m.id) === idMat)?.unidade_medida === 'kg' ? 'Quantidade (em kg)' :
                     materias.find(m => String(m.id) === idMat)?.unidade_medida === 'g' ? 'Gramas (g)' : 'Quantidade (un)'}
                  </Label>
                  <Input type="number" step="0.01" required value={fator} onChange={(e) => setFator(e.target.value)} placeholder={
                    materias.find(m => String(m.id) === idMat)?.unidade_medida === 'kg' ? "Ex: 5" : "Qtd"
                  } />
                </div>
              )}
            </>
          )}

          {categorias.find(c => String(c.id) === idCat)?.Nome?.toLowerCase().includes("revenda") || categorias.find(c => String(c.id) === idCat)?.Nome?.toLowerCase().includes("único") || categorias.find(c => String(c.id) === idCat)?.Nome?.toLowerCase().includes("unico") ? (
            <>
              <div className="space-y-2">
                <Label>Produto para Revenda</Label>
                <Select value={idProd} onValueChange={setIdProd}>
                  <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                  <SelectContent>
                    {uniques.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.Nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {idProd && (
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input type="number" step="0.01" required value={fator} onChange={(e) => setFator(e.target.value)} placeholder="Qtd" />
                </div>
              )}
            </>
          ) : null}

          <Button type="submit" disabled={isSubmitting} className={(idMat || idProd) ? "md:col-span-4" : ""}>
            {isSubmitting ? "Cadastrando..." : <><Plus className="h-4 w-4 mr-1" /> Adicionar</>}
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Data</th>
              <th className="text-left px-4 py-2">Categoria</th>
              <th className="text-left px-4 py-2">Item (MP/Revenda)</th>
              <th className="text-right px-4 py-2">Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground animate-pulse">Carregando gastos...</td></tr>
            ) : (
              <>
            {items.map((g) => (
              <tr key={g.id} className="hover:bg-muted/30">
                <td className="px-4 py-2">{fmtDate(g.created_at)}</td>
                <td className="px-4 py-2">{g.Categoria?.Nome ?? "—"}</td>
                <td className="px-4 py-2 flex flex-col justify-center">
                  <span>{g.MateriaPrima?.nome || g.Produtos?.Nome || "—"}</span>
                  {g.MateriaPrima && g.MateriaPrima.unidade_medida === 'kg' && g.Fator && (
                     <span className="text-[10px] text-muted-foreground bg-muted w-fit px-1.5 rounded uppercase mt-0.5 tracking-tight">{(g.Fator / 1000).toLocaleString('pt-BR')} Kg</span>
                  )}
                  {g.MateriaPrima && g.MateriaPrima.unidade_medida === 'g' && g.Fator && (
                     <span className="text-[10px] text-muted-foreground bg-muted w-fit px-1.5 rounded uppercase mt-0.5 tracking-tight">{g.Fator} g</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right text-destructive font-medium">{fmt(g.Valor)}</td>
                <td className="px-4 py-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => remove(g.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Nenhum gasto.</td></tr>}
              </>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default Gastos;
