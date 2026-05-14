import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CheckCircle2, Clock } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const diffMinutes = (d: string) => {
  const diffMs = new Date().getTime() - new Date(d).getTime();
  return Math.floor(diffMs / 60000);
};

const Pedidos = () => {
  const { empresaId } = useAuth();
  const [vendas, setVendas] = useState<any[]>([]);
  const [pedidosPorVenda, setPedidosPorVenda] = useState<Record<number, any[]>>({});
  const [composicaoCardapio, setComposicaoCardapio] = useState<Record<number, any[]>>({});
  const [composicaoProduto, setComposicaoProduto] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Pedidos · Vendas Pro"; }, []);

  const carregarPedidos = async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data: v } = await supabase.from("Venda").select("*").eq("id_empresa", empresaId).order("created_at", { ascending: false });
    setVendas(v ?? []);
    
    const { data: p } = await supabase.from("Pedido")
      .select("*, Cardapio:id_cardapio(Nome, Valor), Produtos:id_produto(Nome, Preco_venda, is_unique), PedidoModificacao(tipo, id_produx_card, MateriaPrima:id_materia(nome))")
      .eq("id_empresa", empresaId);
      
    const map: Record<number, any[]> = {};
    (p ?? []).forEach((x: any) => {
      if (!x.id_venda) return;
      map[x.id_venda] ??= [];
      map[x.id_venda].push(x);
    });
    setPedidosPorVenda(map);

    const { data: pc } = await supabase.from("ProduxCard").select(`
      id,
      id_cardapio, 
      Produtos:id_produto(
        Nome,
        ProduxMateria(
          MateriaPrima:id_materia(nome)
        )
      )
    `).eq("id_empresa", empresaId);
    
    const compMap: Record<number, any[]> = {};
    (pc ?? []).forEach((x: any) => {
      if (!x.id_cardapio) return;
      compMap[x.id_cardapio] ??= [];
      const prodInfo = x.Produtos || {};
      const materias = (prodInfo.ProduxMateria ?? []).map((m: any) => ({
        nome: m.MateriaPrima?.nome
      }));
      
      if (prodInfo.Nome) {
        compMap[x.id_cardapio].push({
          id: x.id,
          nome: prodInfo.Nome,
          materias: materias
        });
      }
    });
    setComposicaoCardapio(compMap);

    const { data: pm } = await supabase.from("ProduxMateria").select(`
      id_produto, 
      MateriaPrima:id_materia(nome)
    `).eq("id_empresa", empresaId);
    
    const prodCompMap: Record<number, any[]> = {};
    (pm ?? []).forEach((x: any) => {
      if (!x.id_produto) return;
      prodCompMap[x.id_produto] ??= [];
      if (x.MateriaPrima?.nome) {
        prodCompMap[x.id_produto].push(x.MateriaPrima.nome);
      }
    });
    setComposicaoProduto(prodCompMap);

    setLoading(false);
  };

  useEffect(() => {
    carregarPedidos();
    // Poll updates for kitchen every 30 seconds
    const interval = setInterval(carregarPedidos, 30000);
    return () => clearInterval(interval);
  }, [empresaId]);

  const marcarComoEntregue = async (idVenda: number) => {
    if (!empresaId) return;
    const { error } = await supabase.from("Venda").update({ entregue: true }).eq("id", idVenda).eq("id_empresa", empresaId);
    if (error) {
      toast.error("Erro ao marcar pedido: " + error.message);
    } else {
      toast.success("Pedido marcado como entregue!");
      carregarPedidos();
    }
  };

  // Separação das Vendas
  // Cozinha (entregue == false ou null), reordenada por ASC (mais antigos primeiro)
  const vendasPendentes = vendas.filter(v => !v.entregue).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  // Histórico (já entregues ou todas se desejar, focaremos em todas ou só entregues)
  const vendasEntregues = vendas.filter(v => v.entregue);

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
        <h1 className="text-2xl sm:text-3xl font-semibold">Pedidos</h1>
        <p className="text-muted-foreground text-sm">Gerenciamento de cozinha e histórico de vendas</p>
      </header>

      <Tabs defaultValue="cozinha" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="cozinha" className="text-base">
            <Clock className="w-4 h-4 mr-2" />
            Cozinha (Fila)
            {vendasPendentes.length > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-xs py-0.5 px-2 rounded-full">
                {vendasPendentes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="historico" className="text-base">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Histórico (Entregues)
          </TabsTrigger>
        </TabsList>

        

        {!loading && (
          <TabsContent value="cozinha" className="space-y-4 outline-none">
            {vendasPendentes.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground border-dashed">
                <CheckCircle2 className="w-12 h-12 mx-auto text-success/50 mb-3" />
                <p className="text-lg font-medium">Nenhum pedido pendente!</p>
                <p className="text-sm">A cozinha está limpa.</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
                {vendasPendentes.map((v) => {
                  const peds = pedidosPorVenda[v.id] ?? [];
                  const minEspera = diffMinutes(v.created_at);
                  const isLate = minEspera > 15; // 15+ minutos é considerado atrasado

                  return (
                    <Card key={v.id} className={`flex flex-col border-l-4 ${isLate ? "border-l-destructive shadow-sm shadow-destructive/20" : "border-l-primary"}`}>
                      <div className="p-4 bg-muted/20 border-b border-border flex justify-between items-center">
                        <div className="font-bold text-lg">Pedido #{v.id}</div>
                        <div className={`text-xs font-semibold px-2 py-1 rounded-full ${isLate ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                          {minEspera} min
                        </div>
                      </div>
                      
                      <div className="p-4 flex-1 grid grid-cols-2 gap-x-4 gap-y-3 content-start items-start">
                        {(() => {
                           const groupedPeds = peds.reduce((acc: any[], p: any) => {
                               const getModStr = (m: any) => `${m.tipo}-${m.MateriaPrima?.nome}-${m.id_produx_card || '0'}`;
                               const modsStr = (p.PedidoModificacao || []).map(getModStr).sort().join('|');
                               const key = `${p.id_cardapio || 'null'}-${p.id_produto || 'null'}-${modsStr}`;
                               
                               const existing = acc.find(g => g._groupKey === key);
                               if (existing) {
                                   existing._qtd = (existing._qtd || 1) + 1;
                               } else {
                                   acc.push({ ...p, _groupKey: key, _qtd: 1 });
                               }
                               return acc;
                           }, []);

                           return groupedPeds.map((p) => (
                             <div key={p.id} className="text-sm bg-background border border-border/50 rounded-md p-3 relative h-fit shadow-sm">
                               <div className="font-medium flex items-start gap-2 text-lg">
                                 <span className="text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded text-sm mt-0.5">{p._qtd}x</span> 
                              <span>{p.Cardapio?.Nome || p.Produtos?.Nome} {p.Produtos?.is_unique && <span className="text-[10px] ml-1 bg-muted px-1 rounded uppercase">Revenda</span>}</span>
                            </div>
                            
                            {/* Árvore de Produtos e Matérias Primas */}
                            {p.id_cardapio && composicaoCardapio[p.id_cardapio] && (
                              <div className="ml-2 mt-3 space-y-3">
                                {composicaoCardapio[p.id_cardapio].map((prod: any, idx: number) => (
                                   <div key={idx} className="relative pl-4 border-l-2 border-border/80">
                                      <div className="absolute w-3 h-px bg-border/80 top-2.5 -left-[2px]"></div>
                                      <span className="font-semibold text-sm">{prod.nome}</span>
                                      
                                      {prod.materias && prod.materias.length > 0 && (
                                         <div className="mt-1 space-y-1">
                                           {prod.materias.map((mat: any, i: number) => {
                                              const modToRemove = p.PedidoModificacao?.find((mod: any) => mod.tipo === 'REMOVER' && mod.MateriaPrima?.nome === mat.nome && (mod.id_produx_card === prod.id || (!mod.id_produx_card && !prod.id)));
                                              const isRemoved = !!modToRemove;
                                              return (
                                                  <div key={i} className={`relative pl-4 border-l border-border/40 text-[11px] font-medium flex items-center ${isRemoved ? 'text-destructive opacity-80' : 'text-muted-foreground'}`}>
                                                     <div className="absolute w-2 h-px bg-border/40 top-2 -left-px"></div>
                                                     <span className={isRemoved ? 'line-through' : ''}>{mat.nome}</span>
                                                     {isRemoved && <span className="ml-2 bg-destructive/10 text-destructive text-[9px] px-1 rounded uppercase font-bold no-underline">S/ {mat.nome}</span>}
                                                  </div>
                                              )
                                           })}
                                         </div>
                                      )}
                                   </div>
                                ))}
                                
                                {/* Itens Adicionados / Extras */}
                                {p.PedidoModificacao?.filter((mod: any) => mod.tipo !== 'REMOVER').map((mod: any, i: number) => (
                                   <div key={`mod-${i}`} className="relative pl-4 border-l-2 border-border/80">
                                      <div className="absolute w-3 h-px bg-border/80 top-2.5 -left-[2px]"></div>
                                      <span className="font-bold text-xs text-success uppercase">+ Extra: {mod.MateriaPrima?.nome}</span>
                                   </div>
                                ))}
                              </div>
                            )}

                            {p.id_produto && composicaoProduto[p.id_produto] && composicaoProduto[p.id_produto].length > 0 && !p.Produtos?.is_unique && (
                               <div className="ml-2 mt-3 space-y-3">
                                 <div className="relative pl-4 border-l-2 border-border/80">
                                      <div className="absolute w-3 h-px bg-border/80 top-2.5 -left-[2px]"></div>
                                      <span className="font-semibold text-sm">Receita base</span>
                                      <div className="mt-1 space-y-1">
                                        {composicaoProduto[p.id_produto].map((matName: string, i: number) => {
                                           const modToRemove = p.PedidoModificacao?.find((mod: any) => mod.tipo === 'REMOVER' && mod.MateriaPrima?.nome === matName);
                                           const isRemoved = !!modToRemove;
                                           return (
                                               <div key={i} className={`relative pl-4 border-l border-border/40 text-[11px] font-medium flex items-center ${isRemoved ? 'text-destructive opacity-80' : 'text-muted-foreground'}`}>
                                                  <div className="absolute w-2 h-px bg-border/40 top-2 -left-px"></div>
                                                  <span className={isRemoved ? 'line-through' : ''}>{matName}</span>
                                                  {isRemoved && <span className="ml-2 bg-destructive/10 text-destructive text-[9px] px-1 rounded uppercase font-bold no-underline">S/ {matName}</span>}
                                               </div>
                                           )
                                        })}
                                      </div>
                                 </div>
                                 {/* Itens Adicionados / Extras */}
                                 {p.PedidoModificacao?.filter((mod: any) => mod.tipo !== 'REMOVER').map((mod: any, i: number) => (
                                    <div key={`mod-${i}`} className="relative pl-4 border-l-2 border-border/80">
                                       <div className="absolute w-3 h-px bg-border/80 top-2.5 -left-[2px]"></div>
                                       <span className="font-bold text-xs text-success uppercase">+ Extra: {mod.MateriaPrima?.nome}</span>
                                    </div>
                                 ))}
                               </div>
                            )}

                            {p.id_produto && (!composicaoProduto[p.id_produto] || composicaoProduto[p.id_produto].length === 0 || p.Produtos?.is_unique) && p.PedidoModificacao?.length > 0 && (
                               <div className="ml-2 mt-3 space-y-1">
                                 {p.PedidoModificacao?.filter((mod: any) => mod.tipo !== 'REMOVER').map((mod: any, i: number) => (
                                    <div key={`mod-${i}`} className="relative pl-4 border-l-2 border-border/80">
                                       <div className="absolute w-3 h-px bg-border/80 top-2.5 -left-[2px]"></div>
                                       <span className="font-bold text-xs text-success uppercase">+ Extra: {mod.MateriaPrima?.nome}</span>
                                    </div>
                                 ))}
                               </div>
                            )}
                          </div>
                        ))
                      })()}
                      </div>

                      <div className="p-4 pt-0 mt-auto">
                        <Button 
                          className="w-full font-bold" 
                          size="lg"
                          onClick={() => marcarComoEntregue(v.id)}
                        >
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                          Marcar como Entregue
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}

        {!loading && (
          <TabsContent value="historico" className="space-y-3 outline-none">
            {vendasEntregues.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">Nenhum pedido entregue ainda.</Card>
            ) : (
              vendasEntregues.map((v) => {
                const peds = pedidosPorVenda[v.id] ?? [];
                const total = peds.reduce((s, p) => s + (p.Cardapio?.Valor ?? p.Produtos?.Preco_venda ?? 0), 0);
                return (
                  <Card key={v.id} className="p-4 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">Venda #{v.id}</span>
                        <span className="text-[10px] uppercase font-bold bg-success/10 text-success px-2 py-0.5 rounded">Entregue</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Feito em {fmtDate(v.created_at)}</div>
                      
                      <div className="text-sm text-muted-foreground mt-2 flex flex-wrap gap-2">
                        {peds.map((p) => (
                          <span key={p.id} className="inline-block px-2 py-0.5 bg-muted rounded border border-border">
                            {p.Cardapio?.Nome ?? p.Produtos?.Nome}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-left sm:text-right border-t sm:border-0 border-border pt-3 sm:pt-0">
                      <div className="text-xs text-muted-foreground mb-1">{peds.length} item(s)</div>
                      <div className="text-xl font-semibold text-primary">{fmt(total)}</div>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Pedidos;
