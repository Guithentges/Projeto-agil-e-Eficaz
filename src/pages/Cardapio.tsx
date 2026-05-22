import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubmitLock } from "@/hooks/useSubmitLock";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Cardapio = () => {
  const { empresaId } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [vincs, setVincs] = useState<Record<number, any[]>>({});
  const [open, setOpen] = useState<number | null>(null);

  const [nome, setNome] = useState("");
  const [valor, setValor] = useState(0);
  const [novoProd, setNovoProd] = useState("");
  const [tempProds, setTempProds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<{ id: number; nome: string } | null>(null);
  const { isSubmitting, withLock } = useSubmitLock();

  useEffect(() => { document.title = "Cardápio · Vendas Pro"; }, []);

  const load = async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data: c } = await supabase.from("Cardapio").select("*").eq("id_empresa", empresaId).order("id", { ascending: false });
    setItems(c ?? []);
    const { data: p } = await supabase.from("Produtos").select("*").eq("id_empresa", empresaId);
    setProdutos(p ?? []);
    const { data: pc } = await supabase.from("ProduxCard").select("*, Produtos:id_produto(Nome, Custo)").eq("id_empresa", empresaId);
    const map: Record<number, any[]> = {};
    (pc ?? []).forEach((r: any) => {
      if (!r.id_cardapio) return;
      map[r.id_cardapio] ??= [];
      map[r.id_cardapio].push(r);
    });
    setVincs(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, [empresaId]);

  const addTempProd = () => {
    if (!novoProd) return;
    const p = produtos.find(x => String(x.id) === novoProd);
    if (!p) return;
    if (tempProds.some(x => x.id === p.id)) {
      return toast.warning("Este produto já foi adicionado ao item.");
    }
    setTempProds([...tempProds, p]);
    setNovoProd("");
  };

  const removeTempProd = (id: number) => {
    setTempProds(tempProds.filter(p => p.id !== id));
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    if (valor <= 0) return toast.error("Informe o valor de venda");
    await withLock(async () => {
      const { data: c, error: cErr } = await supabase.from("Cardapio")
        .insert({ Nome: nome, Valor: valor, id_empresa: empresaId })
        .select().single();

      if (cErr) {
        toast.error(cErr.message);
        return;
      }

      if (tempProds.length > 0) {
        const links = tempProds.map(p => ({
          id_cardapio: c.id,
          id_produto: p.id,
          id_empresa: empresaId,
        }));
        const { error: lErr } = await supabase.from("ProduxCard").insert(links);
        if (lErr) toast.error("Erro ao vincular produtos: " + lErr.message);
      }

      setNome(""); setValor(0); setTempProds([]);
      toast.success("Item adicionado ao cardápio com seus produtos");
      await load();
    });
  };

  const remove = async (id: number) => {
    if (!empresaId) return;
    await supabase.from("ProduxCard").delete().eq("id_cardapio", id).eq("id_empresa", empresaId);
    const { error } = await supabase.from("Cardapio").delete().eq("id", id).eq("id_empresa", empresaId);
    if (error) return toast.error(error.message);
    toast.success("Item do cardápio excluído");
    setToDelete(null);
    load();
  };

  const addProd = async (idCard: number) => {
    if (!novoProd || !empresaId) return;
    
    // Duplicate check for existing item
    const existing = vincs[idCard] ?? [];
    if (existing.some(v => String(v.id_produto) === novoProd)) {
      return toast.warning("Este produto já está vinculado a este item.");
    }

    const { error } = await supabase.from("ProduxCard").insert({
      id_cardapio: idCard, id_produto: parseInt(novoProd), id_empresa: empresaId,
    });
    if (error) return toast.error(error.message);
    setNovoProd("");
    load();
  };

  const removeProd = async (id: number) => {
    if (!empresaId) return;
    await supabase.from("ProduxCard").delete().eq("id", id).eq("id_empresa", empresaId);
    load();
  };

  const tempCusto = tempProds.reduce((s, p) => s + (p.Custo ?? 0), 0);
  const tempValor = valor;
  const tempMargem = tempValor > 0 ? ((tempValor - tempCusto) / tempValor) * 100 : 0;

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
        <h1 className="text-2xl sm:text-3xl font-bold">Cardápio</h1>
        <p className="text-muted-foreground text-sm">Itens vendáveis (combinações de produtos)</p>
      </header>

      <Card className="p-5 border-l-4 border-l-primary shadow-elegant">
        <form onSubmit={add} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="space-y-2 md:col-span-2">
            <Label>Nome do item</Label>
            <Input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Combo Família" />
          </div>
          <div className="space-y-2">
            <Label>Valor de Venda (R$)</Label>
            <CurrencyInput required value={valor} onValueChange={setValor} />
          </div>

          <div className="md:col-span-3 border-t pt-4 mt-2">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs uppercase text-muted-foreground">Composição do Item (Opcional)</Label>
              {tempProds.length > 0 && (
                <div className="flex gap-4 items-center">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                    Custo total: <span className="text-primary">{fmt(tempCusto)}</span>
                  </div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                    Margem: <span className={tempMargem < 30 ? "text-destructive" : "text-success"}>{tempMargem.toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={novoProd} onValueChange={setNovoProd}>
                <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                <SelectContent>
                  {produtos.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.Nome} ({fmt(p.Custo ?? 0)})</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={addTempProd}>Adicionar</Button>
            </div>

            {tempProds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tempProds.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full border border-primary/20">
                    {p.Nome} ({fmt(p.Custo ?? 0)})
                    <button type="button" onClick={() => removeTempProd(p.id)} className="hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting} className="md:col-span-3 mt-2">
            {isSubmitting ? "Cadastrando..." : <><Plus className="h-4 w-4 mr-1" /> Cadastrar no Cardápio</>}
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        
        {!loading && items.map((c) => {
          const isOpen = open === c.id;
          const pcVincs = vincs[c.id] ?? [];
          const totalCusto = pcVincs.reduce((s, v) => s + (v.Produtos?.Custo ?? 0), 0);
          const margem = c.Valor > 0 ? ((c.Valor - totalCusto) / c.Valor) * 100 : 0;

          return (
            <Card key={c.id} className="overflow-hidden border-l-4 border-l-transparent hover:border-l-primary transition-all">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="flex-1">
                  <div className="font-bold text-lg">{c.Nome}</div>
                  <div className="flex flex-wrap gap-2 sm:gap-4 mt-1">
                    <div className="text-sm font-bold text-primary">{fmt(c.Valor ?? 0)} <span className="text-[10px] text-muted-foreground font-semibold ml-1">VENDA</span></div>
                    <div className="text-sm font-medium text-muted-foreground">{fmt(totalCusto)} <span className="text-[10px] uppercase font-semibold ml-1">CUSTO</span></div>
                    <div className={`text-sm font-bold ${margem < 30 ? "text-destructive" : "text-success"}`}>
                      {margem.toFixed(1)}% <span className="text-[10px] uppercase font-semibold ml-1">MARGEM</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setOpen(isOpen ? null : c.id)}>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setToDelete({ id: c.id, nome: c.Nome })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {isOpen && (
                <div className="border-t border-border p-4 space-y-3 bg-muted/10">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Composição do Item</div>
                  {pcVincs.map((v) => (
                    <div key={v.id} className="flex items-center justify-between text-sm bg-background p-2 rounded border border-border/50">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{v.Produtos?.Nome}</span>
                        <span className="text-xs text-muted-foreground">{fmt(v.Produtos?.Custo ?? 0)}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeProd(v.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <Select value={novoProd} onValueChange={setNovoProd}>
                      <SelectTrigger><SelectValue placeholder="Vincular mais um produto" /></SelectTrigger>
                      <SelectContent>
                        {produtos.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.Nome} ({fmt(p.Custo ?? 0)})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => addProd(c.id)}>Vincular</Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {!loading && items.length === 0 && <Card className="p-6 text-center text-muted-foreground">Nenhum item no cardápio.</Card>}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item do cardápio?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{toDelete?.nome}</strong>? Os produtos vinculados serão desvinculados. Esta ação não pode ser desfeita.
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

export default Cardapio;
