import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Produtos = () => {
  const { empresaId } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [materias, setMaterias] = useState<any[]>([]);
  const [receitas, setReceitas] = useState<Record<number, any[]>>({});
  const [open, setOpen] = useState<number | null>(null);

  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");

  const [novasMateriasProd, setNovasMateriasProd] = useState<{ id: string, name: string, qtd: string }[]>([]);
  const [tempMateria, setTempMateria] = useState("");
  const [tempQtd, setTempQtd] = useState("");

  // adicionar materia
  const [novoMateria, setNovoMateria] = useState("");
  const [novoQtd, setNovoQtd] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Produtos · Vendas Pro"; }, []);

  const load = async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data: prods } = await supabase.from("Produtos").select("*").eq("id_empresa", empresaId).order("id", { ascending: false });
    setItems(prods ?? []);
    const { data: mats } = await supabase.from("MateriaPrima").select("*").eq("id_empresa", empresaId);
    setMaterias(mats ?? []);
    const { data: pm } = await supabase.from("ProduxMateria").select("*, MateriaPrima:id_materia(nome, Custo)").eq("id_empresa", empresaId);
    const map: Record<number, any[]> = {};
    (pm ?? []).forEach((r: any) => {
      map[r.id_produto] ??= [];
      map[r.id_produto].push(r);
    });
    setReceitas(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, [empresaId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    const { data: prodData, error } = await supabase.from("Produtos").insert({
      Nome: nome, Preco_venda: parseFloat(preco), Custo: 0, id_empresa: empresaId, is_unique: novasMateriasProd.length === 0,
    } as any).select().single();
    
    if (error) return toast.error(error.message);

    if (novasMateriasProd.length > 0) {
      const pmData = novasMateriasProd.map(m => ({
        id_produto: prodData.id,
        id_materia: parseInt(m.id),
        quantidade: parseInt(m.qtd),
        id_empresa: empresaId,
      }));
      const { error: pmError } = await supabase.from("ProduxMateria").insert(pmData);
      if (pmError) {
        toast.error("Erro ao vincular matérias-primas: " + pmError.message);
      } else {
        await recalcCusto(prodData.id);
      }
    }

    setNome(""); setPreco("");
    setNovasMateriasProd([]);
    toast.success("Produto cadastrado");
    load();
  };

  const remove = async (id: number) => {
    if (!empresaId) return;
    await supabase.from("ProduxMateria").delete().eq("id_produto", id).eq("id_empresa", empresaId);
    const { error } = await supabase.from("Produtos").delete().eq("id", id).eq("id_empresa", empresaId);
    if (error) return toast.error(error.message);
    load();
  };

  const addMateria = async (idProduto: number) => {
    if (!novoMateria || !novoQtd || !empresaId) return;
    
    // Check if duplicate
    const jaExiste = (receitas[idProduto] ?? []).some(r => r.id_materia === parseInt(novoMateria));
    if (jaExiste) return toast.error("Este ingrediente já faz parte da receita deste produto.");

    const { error } = await supabase.from("ProduxMateria").insert({
      id_produto: idProduto,
      id_materia: parseInt(novoMateria),
      id_empresa: empresaId,
      quantidade: parseInt(novoQtd),
    });
    if (error) return toast.error(error.message);
    // recalcula custo
    setNovoMateria(""); setNovoQtd("");
    await recalcCusto(idProduto);
    load();
  };

  const removeMateria = async (id: number, idProduto: number) => {
    if (!empresaId) return;
    await supabase.from("ProduxMateria").delete().eq("id", id).eq("id_empresa", empresaId);
    await recalcCusto(idProduto);
    load();
  };

  const recalcCusto = async (idProduto: number) => {
    const { data } = await supabase.from("ProduxMateria").select("quantidade, MateriaPrima:id_materia(Custo)").eq("id_produto", idProduto);
    const custo = (data ?? []).reduce((s: number, r: any) => {
      const unit = r.MateriaPrima?.Custo ?? 0;
      return s + unit * (r.quantidade ?? 0);
    }, 0);
    await supabase.from("Produtos").update({ Custo: custo }).eq("id", idProduto).eq("id_empresa", empresaId);
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
        <h1 className="text-2xl sm:text-3xl font-semibold">Produtos</h1>
        <p className="text-muted-foreground text-sm">Cadastre produtos com sua receita (matérias-primas)</p>
      </header>

      <Card className="p-5">
        <form onSubmit={add} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="space-y-2 md:col-span-2">
            <Label>Nome do produto</Label>
            <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Preço de venda</Label>
            <Input type="number" step="0.01" required value={preco} onChange={(e) => setPreco(e.target.value)} />
          </div>

          <div className="md:col-span-3 space-y-4 pt-2">
            <div className="text-sm font-medium text-muted-foreground">Receita (Opcional - deixe vazio para produto de revenda)</div>
            {novasMateriasProd.length > 0 && (
                <div className="space-y-2">
                  {novasMateriasProd.map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm border p-2 rounded bg-background">
                      <span>{m.name} × {m.qtd}</span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => {
                          setNovasMateriasProd(prev => prev.filter((_, i) => i !== idx));
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Select value={tempMateria} onValueChange={setTempMateria}>
                    <SelectTrigger><SelectValue placeholder="Matéria-prima" /></SelectTrigger>
                    <SelectContent>
                      {materias.map((m) => {
                        const und = m.unidade_medida || 'un';
                        const labelUnd = und === 'kg' ? 'g' : und;
                        return (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.nome} (em {labelUnd})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Input className="w-32" type="number" placeholder="Qtd" value={tempQtd} onChange={(e) => setTempQtd(e.target.value)} />
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => {
                  if (!tempMateria || !tempQtd) return;
                  
                  // Check if duplicate
                  if (novasMateriasProd.some(m => m.id === tempMateria)) {
                    return toast.error("Este ingrediente já foi adicionado.");
                  }

                  const mat = materias.find(m => String(m.id) === tempMateria);
                  if (mat) {
                    setNovasMateriasProd(prev => [...prev, { id: tempMateria, name: mat.nome, qtd: tempQtd }]);
                    setTempMateria("");
                    setTempQtd("");
                  }
                }}>Adicionar</Button>
              </div>
            </div>


          <Button type="submit" className="md:col-span-3 mt-4"><Plus className="h-4 w-4 mr-1" /> Cadastrar produto</Button>
        </form>
      </Card>

      <div className="space-y-3">
        
        {!loading && items.map((p) => {
          const margem = (p.Preco_venda ?? 0) - (p.Custo ?? 0);
          const isOpen = open === p.id;
          return (
            <Card key={p.id} className="overflow-hidden">
              <div className="p-4 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.Nome}</span>
                    {p.is_unique && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">Revenda</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Venda {fmt(p.Preco_venda ?? 0)} · Custo {fmt(p.Custo ?? 0)} · <span className="text-success">Margem {fmt(margem)}</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setOpen(isOpen ? null : p.id)}>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              {isOpen && (
                <div className="border-t border-border p-4 space-y-3 bg-muted/20">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Receita</div>
                  {(receitas[p.id] ?? []).map((r) => {
                    const matInfo = materias.find(m => m.id === r.id_materia);
                    const und = matInfo?.unidade_medida || 'un';
                    const displayUnd = und === 'kg' ? 'g' : und;
                    return (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span>{r.MateriaPrima?.nome} × {r.quantidade} {displayUnd}</span>
                      <Button size="sm" variant="ghost" onClick={() => removeMateria(r.id, p.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    )
                  })}
                  <div className="flex gap-2 items-end pt-2">
                    <div className="flex-1">
                      <Select value={novoMateria} onValueChange={setNovoMateria}>
                        <SelectTrigger><SelectValue placeholder="Matéria-prima" /></SelectTrigger>
                        <SelectContent>
                          {materias.map((m) => {
                             const und = m.unidade_medida || 'un';
                             const labelUnd = und === 'kg' ? 'g' : und;
                             return (
                               <SelectItem key={m.id} value={String(m.id)}>{m.nome} (em {labelUnd})</SelectItem>
                             )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input className="w-32" type="number" placeholder="Qtd" value={novoQtd} onChange={(e) => setNovoQtd(e.target.value)} />
                    <Button size="sm" onClick={() => addMateria(p.id)}>Adicionar</Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {!loading && items.length === 0 && <Card className="p-6 text-center text-muted-foreground">Nenhum produto cadastrado.</Card>}
      </div>
    </div>
  );
};

export default Produtos;
