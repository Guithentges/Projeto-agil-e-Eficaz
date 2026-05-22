import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Minus, ShoppingCart, Trash2, Settings2, X, Utensils, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface CartItem {
  key: string;
  item: any;
  qtd: number;
  mods: Array<{ id_materia: number; nome: string; tipo: 'REMOVER' | 'ADICIONAR' }>;
}

const PDV = () => {
  const { empresaId } = useAuth();
  const [cardapio, setCardapio] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  const [busy, setBusy] = useState(false);
  
  // Customization State
  const [custItem, setCustItem] = useState<CartItem | null>(null);
  const [availableMats, setAvailableMats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "PDV · Vendas Pro"; }, []);

  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);
    Promise.all([
      supabase.from("Cardapio").select("*").eq("id_empresa", empresaId).order("Nome"),
      supabase.from("Produtos").select("*").eq("id_empresa", empresaId).order("Nome")
    ]).then(([{ data: cData }, { data: pData }]) => {
       setCardapio(cData ?? []);
       setProdutos(pData ?? []);
       setLoading(false);
    });
  }, [empresaId]);

  const add = (item: any, type: "cardapio" | "produto", rowKey?: string) => {
    if (rowKey) {
      setCarrinho((prev) => prev.map(i => i.key === rowKey ? { ...i, qtd: i.qtd + 1 } : i));
      return;
    }

    const valor = type === "produto" ? item.Preco_venda : item.Valor;
    const standardItem = { ...item, type, Valor: valor };
    const key = `${type}-${item.id}-${Date.now()}-${Math.random()}`; // Unique key prevents automatic grouping
    setCarrinho((prev) => [...prev, { key, item: standardItem, qtd: 1, mods: [] }]);
  };

  const decRow = (key: string) => {
    setCarrinho((prev) => {
      const row = prev.find(i => i.key === key);
      if (!row) return prev;
      if (row.qtd <= 1) return prev.filter(i => i.key !== key);
      return prev.map(i => i.key === key ? { ...i, qtd: i.qtd - 1 } : i);
    });
  };

  const removeRow = (key: string) => {
    setCarrinho((prev) => prev.filter(i => i.key !== key));
  };

  const clear = () => setCarrinho([]);

  const total = carrinho.reduce((s, x) => s + (x.item.Valor ?? 0) * x.qtd, 0);
  const itensCount = carrinho.reduce((s, x) => s + x.qtd, 0);

  const openCustomizer = async (cartItem: CartItem) => {
    setCustItem(cartItem);
    let mats: any[] = [];

    console.log("Abrindo customizador para:", cartItem.item.Nome, "ID:", cartItem.item.id);

    if (cartItem.item.type === "cardapio") {
      // Busca os produtos do combo com seus IDs únicos de instância
      const { data: pc, error: pcErr } = await supabase.from("ProduxCard")
        .select("id, id_produto, Produtos:id_produto(Nome)")
        .eq("id_cardapio", cartItem.item.id);
      
      if (pcErr) console.error("Erro ao buscar produtos do combo:", pcErr);
      console.log("Produtos encontrados no combo:", pc);

      if (pc && pc.length > 0) {
        const pids = pc.map(p => p.id_produto);
        const { data: pm, error: pmErr } = await supabase.from("ProduxMateria")
          .select("id_materia, id_produto, MateriaPrima:id_materia(nome)")
          .in("id_produto", pids);
        
        if (pmErr) console.error("Erro ao buscar matérias-primas:", pmErr);
        console.log("Insumos encontrados para estes produtos:", pm);

        // Mapeamos os materiais para cada INSTÂNCIA do produto no combo
        mats = pc.flatMap((instance, index) => {
          const productMats = (pm ?? []).filter(m => m.id_produto === instance.id_produto);
          
          // Se o produto não tiver insumos, criamos uma entrada vazia apenas para mostrar o título
          if (productMats.length === 0) {
             return [{
                id: -1, // ID fictício para indicar "sem insumos"
                instance_id: instance.id,
                id_produto: instance.id_produto,
                produto_nome: `${(instance as any).Produtos?.Nome || "Produto"} #${index + 1}`,
                nome: ""
             }];
          }

          return productMats.map(m => ({
            id: m.id_materia,
            instance_id: instance.id,
            id_produto: m.id_produto,
            produto_nome: `${(instance as any).Produtos?.Nome || "Produto"} #${index + 1}`,
            nome: (m as any).MateriaPrima?.nome || "Ingrediente"
          }));
        });
      }
    } else {
      const { data: pm } = await supabase.from("ProduxMateria")
        .select("id_materia, id_produto, MateriaPrima:id_materia(nome)")
        .eq("id_produto", cartItem.item.id);
      
      mats = (pm ?? []).map(m => ({
        id: m.id_materia,
        instance_id: 0,
        id_produto: m.id_produto,
        produto_nome: cartItem.item.Nome,
        nome: (m as any).MateriaPrima?.nome || "Ingrediente"
      }));
    }

    setAvailableMats(mats);
  };

  const toggleMod = (item: CartItem, matId: number, nome: string, instanceId: number, prodName: string) => {
    // Agora a chave de unicidade é matId + instanceId
    const isRemoved = item.mods.some(m => m.id_materia === matId && (m as any).instance_id === instanceId);
    
    let newMods;
    if (isRemoved) {
      newMods = item.mods.filter(m => !(m.id_materia === matId && (m as any).instance_id === instanceId));
    } else {
      newMods = [...(item.mods || []), { 
        id_materia: matId, 
        nome: nome, 
        tipo: 'REMOVER' as const, 
        instance_id: instanceId || 0, // Garante 0 para produtos avulsos
        produto_nome: prodName 
      }];
    }

    // Split the item if it has more than 1 quantity to customize only one
    if (item.qtd > 1) {
      const otherQtd = item.qtd - 1;
      const newItem = { ...item, qtd: 1, mods: newMods, key: `${item.item.id}-${Date.now()}` };
      setCarrinho(prev => [
        ...prev.map(i => i.key === item.key ? { ...i, qtd: otherQtd } : i),
        newItem
      ]);
      setCustItem(newItem);
    } else {
      setCarrinho(prev => prev.map(i => i.key === item.key ? { ...i, mods: newMods } : i));
      setCustItem({ ...item, mods: newMods });
    }
  };

  const finalizar = async () => {
    if (!empresaId || itensCount === 0) return;
    setBusy(true);
    try {
      // Prepara o carrinho com as instâncias para o RPC
      const payload = carrinho.map(row => ({
          id: row.item.id,
          type: row.item.type,
          qtd: row.qtd,
          mods: row.mods // Envia o objeto completo com instance_id
      }));

      // Chamada atômica ao RPC no banco de dados
      const { data, error } = await supabase.rpc('processar_venda_v2', {
          p_empresa_id: empresaId,
          p_carrinho: payload
      });

      if (error) throw error;

      toast.success(`Venda #${data.venda_id} registrada com sucesso`);
      clear();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Erro ao registrar venda");
    } finally {
      setBusy(false);
    }
  };

    if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr,360px] gap-6 max-w-7xl mx-auto">
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold">PDV</h1>
          <p className="text-muted-foreground text-sm">Toque para adicionar ao pedido</p>
        </header>
        <Tabs defaultValue="cardapio" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="cardapio">Menu e Combos</TabsTrigger>
            <TabsTrigger value="produtos">Itens Avulsos</TabsTrigger>
          </TabsList>

          <TabsContent value="cardapio" className="outline-none mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              
              {!loading && cardapio.map((c) => (
                <button
                  key={c.id}
                  onClick={() => add(c, "cardapio")}
                  className="relative outline-none group text-left overflow-hidden rounded-2xl bg-gradient-to-br from-card to-muted/20 border border-border/80 hover:border-primary/50 hover:shadow-lg transition-all duration-300 min-h-[120px]"
                >
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300 pointer-events-none" />
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-500" />
                  
                  <div className="p-4 relative z-10 flex flex-col h-full justify-between gap-4">
                    <div className="flex justify-between items-start">
                      <div className="p-2 bg-background/80 backdrop-blur-sm rounded-xl shadow-sm border border-border/50 text-muted-foreground group-hover:text-primary transition-colors">
                        <Utensils className="w-4 h-4" />
                      </div>
                      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 shadow-md">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                    
                    <div>
                      <div className="font-semibold text-sm leading-tight text-foreground/90 group-hover:text-foreground transition-colors line-clamp-2">{c.Nome}</div>
                      <div className="text-primary font-bold text-sm mt-1">{fmt(c.Valor ?? 0)}</div>
                    </div>
                  </div>
                </button>
              ))}
              {!loading && cardapio.length === 0 && (
                <Card className="col-span-full p-6 text-center text-muted-foreground">
                  Cadastre itens no Cardápio para começar a vender.
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="produtos" className="outline-none mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              
              {!loading && produtos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => add(p, "produto")}
                  className="relative outline-none group text-left overflow-hidden rounded-2xl bg-gradient-to-br from-card to-muted/20 border border-border/80 hover:border-emerald-500/40 hover:shadow-lg transition-all duration-300 min-h-[120px]"
                >
                  <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-colors duration-300 pointer-events-none" />
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500" />
                  
                  <div className="p-4 relative z-10 flex flex-col h-full justify-between gap-4">
                    <div className="flex justify-between items-start">
                      <div className="p-2 bg-background/80 backdrop-blur-sm rounded-xl shadow-sm border border-border/50 text-muted-foreground group-hover:text-emerald-500 transition-colors">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 shadow-md">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                    
                    <div>
                      <div className="font-semibold text-sm leading-tight flex items-start flex-wrap gap-1.5 text-foreground/90 group-hover:text-foreground transition-colors line-clamp-2">
                        {p.Nome}
                        {p.is_unique && <span className="text-[9px] uppercase bg-emerald-500/10 text-emerald-600 font-bold px-1.5 py-0.5 rounded-sm flex-shrink-0 mt-0.5">Pronto</span>}
                      </div>
                      <div className="text-emerald-600 font-bold text-sm mt-1">{fmt(p.Preco_venda ?? 0)}</div>
                    </div>
                  </div>
                </button>
              ))}
              {!loading && produtos.length === 0 && (
                <Card className="col-span-full p-6 text-center text-muted-foreground">
                  Sem produtos cadastrados.
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Card className="p-4 h-fit lg:sticky lg:top-4 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Pedido atual</h2>
          {itensCount > 0 && <span className="ml-auto text-xs text-muted-foreground">{itensCount} item(s)</span>}
        </div>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {carrinho.map((row) => (
            <div key={row.key} className="p-2 rounded-md bg-muted/40 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="text-sm font-medium">{row.item.Nome}</div>
                  <div className="text-xs text-muted-foreground">{fmt(row.item.Valor ?? 0)}</div>
                  {row.mods.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {row.mods.map((m: any, idx) => (
                        <span key={idx} className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded uppercase font-bold flex items-center gap-1">
                          {row.item.type === 'cardapio' && m.produto_nome && (
                            <span className="opacity-60 font-medium lowercase">
                              {m.produto_nome}:
                            </span>
                          )}
                          sem {m.nome}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Button size="icon" variant="ghost" onClick={() => decRow(row.key)}><Minus className="h-3 w-3" /></Button>
                <span className="w-6 text-center text-sm">{row.qtd}</span>
                <Button size="icon" variant="ghost" onClick={() => add(row.item, row.item.type as any, row.key)}><Plus className="h-3 w-3" /></Button>
              </div>
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => openCustomizer(row)}>
                  <Settings2 className="h-3 w-3 mr-1" /> Customizar
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive" onClick={() => removeRow(row.key)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {itensCount === 0 && <p className="text-sm text-muted-foreground text-center py-6">Carrinho vazio</p>}
        </div>
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="text-2xl font-bold text-primary">{fmt(total)}</span>
        </div>
        <div className="mt-4 grid grid-cols-[1fr,auto] gap-2">
          <Button disabled={itensCount === 0 || busy} onClick={finalizar}>
            {busy ? "Processando..." : "Finalizar venda"}
          </Button>
          <Button variant="ghost" disabled={itensCount === 0 || busy} onClick={clear}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Customization Dialog */}
      <Dialog open={!!custItem} onOpenChange={(o) => !o && setCustItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customizar {custItem?.item.Nome}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {/* Agrupamento por Instância para Combos */}
            {Array.from(new Set(availableMats.map(m => m.instance_id))).map(instanceId => {
              const instMats = availableMats.filter(m => m.instance_id === instanceId);
              const pName = instMats[0]?.produto_nome || "Produto";
              
              return (
                <div key={instanceId} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{pName}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {instMats.map((m) => {
                      if (m.id === -1) {
                        return (
                          <p key={`empty-${m.instance_id}`} className="col-span-2 text-[10px] text-muted-foreground italic text-center py-2">
                            Sem ingredientes para remover.
                          </p>
                        );
                      }
                      const isRemoved = custItem?.mods.some(mod => mod.id_materia === m.id && (mod as any).instance_id === m.instance_id);
                      return (
                        <Button
                          key={`${m.instance_id}-${m.id}`}
                          variant={isRemoved ? "destructive" : "outline"}
                          className="justify-start text-xs h-9 overflow-hidden"
                          onClick={() => custItem && toggleMod(custItem, m.id, m.nome, m.instance_id, pName)}
                        >
                          {isRemoved ? <X className="h-3 w-3 mr-2" /> : <Plus className="h-3 w-3 mr-2 text-muted-foreground" />}
                          <span className="truncate">{m.nome}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {availableMats.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                Nenhum ingrediente configurado para este item.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setCustItem(null)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PDV;
