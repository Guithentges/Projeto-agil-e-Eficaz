import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DollarSign, ShoppingCart, TrendingUp, Wallet, Receipt } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Stat = ({ icon: Icon, label, value, accent, details }: any) => (
  <Card className="p-5 shadow-card relative overflow-hidden transition-all hover:shadow-lg">
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 ${accent}`}></div>
    <div className="flex items-start justify-between relative z-10">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
        {details && <div className="text-xs text-muted-foreground mt-2">{details}</div>}
      </div>
      <div className={`p-3 rounded-xl ${accent}`}><Icon className="h-5 w-5" /></div>
    </div>
  </Card>
);

const Dashboard = () => {
  const { empresaId, empresaNome } = useAuth();
  const [vendas, setVendas] = useState(0);
  const [pedidos, setPedidos] = useState(0);
  const [receita, setReceita] = useState(0);
  const [gastos, setGastos] = useState(0);
  const [topProdutos, setTopProdutos] = useState<{ nome: string; qtd: number }[]>([]);
  const [timeRange, setTimeRange] = useState<"hoje" | "7_dias" | "30_dias" | "tudo">("hoje");

  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Dashboard · Vendas Pro"; }, []);

  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);
    
    (async () => {
      try {
        const now = new Date();
        let startDate = new Date(0); // Epoch, meaning 'tudo'
        if (timeRange === "hoje") {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (timeRange === "7_dias") {
          startDate = new Date();
          startDate.setDate(now.getDate() - 7);
        } else if (timeRange === "30_dias") {
          startDate = new Date();
          startDate.setDate(now.getDate() - 30);
        }
        const isoStart = startDate.toISOString();

        // 1. Fetch Vendas (Tickets) that are delivered
        let vQuery = supabase.from("Venda").select("id").eq("id_empresa", empresaId).eq("entregue", true);
        if (timeRange !== "tudo") vQuery = vQuery.gte("created_at", isoStart);
        const { data: vData } = await vQuery;
        
        const vendasIds = (vData ?? []).map(v => v.id);
        const totalVendas = vendasIds.length;
        setVendas(totalVendas);

        if (totalVendas > 0) {
          // 2. Fetch Pedidos (Items) matching both Cardapio and Produtos ONLY for delivered tickets
          // chunk ID fetching to avoid URL length limits if there are thousands of sales
          const maxChunk = 500;
          let pData: any[] = [];
          
          for (let i = 0; i < vendasIds.length; i += maxChunk) {
             const chunk = vendasIds.slice(i, i + maxChunk);
             const { data: pChunk } = await supabase
               .from("Pedido")
               .select("id, id_venda, Cardapio:id_cardapio(Nome, Valor), Produtos:id_produto(Nome, Preco_venda)")
               .eq("id_empresa", empresaId)
               .in("id_venda", chunk);
             if (pChunk) pData = [...pData, ...pChunk];
          }
          
          setPedidos(pData?.length ?? 0);
          
          let totalReceita = 0;
          const counter: Record<string, number> = {};
          
          pData.forEach((p: any) => {
            const cNome = p.Cardapio?.Nome;
            const pNome = p.Produtos?.Nome;
            const valor = (p.Cardapio?.Valor ?? p.Produtos?.Preco_venda) ?? 0;
            
            totalReceita += valor;
            const nome = cNome || pNome || "Produto Não Identificado";
            counter[nome] = (counter[nome] ?? 0) + 1;
          });
          
          setReceita(totalReceita);
          setTopProdutos(
            Object.entries(counter)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([nome, qtd]) => ({ nome, qtd }))
          );
        } else {
          setPedidos(0);
          setReceita(0);
          setTopProdutos([]);
        }

        // 3. Fetch Gastos
        let gQuery = supabase.from("Gastos").select("Valor").eq("id_empresa", empresaId);
        if (timeRange !== "tudo") gQuery = gQuery.gte("created_at", isoStart);
        const { data: gData } = await gQuery;
        
        setGastos((gData ?? []).reduce((s, g) => s + (g.Valor ?? 0), 0));
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [empresaId, timeRange]);

  const lucro = receita - gastos;
  const ticketMedio = vendas > 0 ? receita / vendas : 0;
  
  const chartData = topProdutos.map(p => ({
    name: p.nome.length > 12 ? p.nome.substring(0, 12) + "..." : p.nome,
    originalName: p.nome,
    vendas: p.qtd
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Olá{empresaNome ? `, ${empresaNome}` : ""}</h1>
          <p className="text-muted-foreground mt-1">Visão geral do seu negócio e fluxo de caixa</p>
        </div>
        
        <Tabs value={timeRange} onValueChange={(val: any) => setTimeRange(val)} className="w-full md:w-auto">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50">
            <TabsTrigger value="hoje">Hoje</TabsTrigger>
            <TabsTrigger value="7_dias">7 Dias</TabsTrigger>
            <TabsTrigger value="30_dias">30 Dias</TabsTrigger>
            <TabsTrigger value="tudo">Tudo</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Stat icon={DollarSign} label="Receita Bruta" value={fmt(receita)} accent="bg-primary/20 text-primary" />
        <Stat icon={Wallet} label="Gastos" value={fmt(gastos)} accent="bg-destructive/20 text-destructive" />
        <Stat icon={TrendingUp} label="Lucro Líquido" value={fmt(lucro)} accent="bg-success/20 text-success" />
        <Stat icon={ShoppingCart} label="Tickets (Vendas)" value={vendas} details={`${pedidos} itens totais processados`} accent="bg-blue-500/20 text-blue-500" />
        <Stat icon={Receipt} label="Ticket Médio" value={fmt(ticketMedio)} details="Receita dividida por Tickets" accent="bg-violet-500/20 text-violet-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 shadow-card col-span-1 lg:col-span-2 min-h-[350px] flex flex-col">
          <div className="mb-6">
            <h2 className="font-semibold text-lg">Top Produtos Mais Vendidos</h2>
            <p className="text-sm text-muted-foreground">Volume de unidades vendidas no período selecionado</p>
          </div>
          
          {topProdutos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground border-dashed border-2 border-border/50 rounded-xl p-6">
              <ShoppingCart className="h-8 w-8 mb-2 opacity-50" />
              <p>Nenhuma venda registrada ainda no período.</p>
            </div>
          ) : (
            <div className="flex-1 min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
                    formatter={(value: number) => [`${value} unidades`, 'Vendas']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.originalName || label}
                  />
                  <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-6 shadow-card col-span-1 flex flex-col">
           <div className="mb-4">
             <h2 className="font-semibold text-lg">Resumo de Itens</h2>
             <p className="text-sm text-muted-foreground">O que mais saiu no período</p>
           </div>
           
           {topProdutos.length === 0 ? (
             <div className="flex-1 flex items-center justify-center">
                <span className="text-sm text-muted-foreground">Nenhuma listagem</span>
             </div>
           ) : (
             <div className="space-y-4">
               {topProdutos.map((p, i) => (
                 <div key={p.nome} className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs ring-1 ring-primary/20">
                       #{i + 1}
                     </div>
                     <span className="font-medium text-sm leading-tight max-w-[150px] truncate" title={p.nome}>{p.nome}</span>
                   </div>
                   <span className="text-sm bg-muted px-2 py-1 rounded-md font-semibold text-muted-foreground">{p.qtd} un.</span>
                 </div>
               ))}
             </div>
           )}
           <div className="mt-auto pt-6 border-t border-border mt-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total de tickets gerados:</span>
                <span className="font-bold">{vendas}</span>
              </div>
           </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
