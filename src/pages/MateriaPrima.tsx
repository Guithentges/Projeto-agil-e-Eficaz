import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MateriaPrima = () => {
  const { empresaId } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState("un");

  const [loading, setLoading] = useState(true);

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
    const { error } = await supabase.from("MateriaPrima").insert({
      nome, Custo: 0, id_empresa: empresaId, unidade_medida: unidade
    } as any);
    if (error) return toast.error(error.message);
    setNome("");
    setUnidade("un");
    toast.success("Matéria-prima cadastrada");
    load();
  };

  const remove = async (id: number) => {
    if (!empresaId) return;
    const { error } = await supabase.from("MateriaPrima").delete().eq("id", id).eq("id_empresa", empresaId);
    if (error) return toast.error(error.message);
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
        <h1 className="text-2xl sm:text-3xl font-semibold">Matéria-Prima</h1>
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
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="sm:col-span-1"><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
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
                  {und === 'kg' ? (
                    <div className="flex flex-col">
                       <span>{fmt(m.Custo ?? 0)} / g</span>
                       <span className="text-[10px] text-muted-foreground font-semibold">{fmt((m.Custo ?? 0) * 1000)} / kg</span>
                    </div>
                  ) : (
                    <span>{fmt(m.Custo ?? 0)} / {und}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => remove(m.id)}>
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
    </div>
  );
};

export default MateriaPrima;
