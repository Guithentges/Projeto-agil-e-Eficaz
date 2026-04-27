import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

const Categorias = () => {
  const { empresaId } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [nome, setNome] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Categorias · Vendas Pro"; }, []);

  const load = async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data } = await supabase.from("Categoria").select("*").eq("id_empresa", empresaId).order("id", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [empresaId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !empresaId) return;
    const { error } = await supabase.from("Categoria").insert({ Nome: nome, id_empresa: empresaId });
    if (error) return toast.error(error.message);
    setNome("");
    toast.success("Categoria adicionada");
    load();
  };

  const remove = async (id: number) => {
    const { error } = await supabase.from("Categoria").delete().eq("id", id);
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
    <div className="space-y-6 max-w-3xl mx-auto">
      <header>
        <h1 className="text-3xl font-semibold">Categorias</h1>
        <p className="text-muted-foreground">Categorize seus gastos</p>
      </header>

      <Card className="p-5">
        <form onSubmit={add} className="flex gap-3 items-end">
          <div className="flex-1 space-y-2">
            <Label>Nova categoria</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Insumos, Marketing..." />
          </div>
          <Button type="submit"><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
        </form>
      </Card>

      <Card className="divide-y divide-border">
        {loading && <div className="p-10 flex justify-center text-muted-foreground animate-pulse">Carregando dados...</div>}
        {!loading && items.length === 0 && <div className="p-5 text-sm text-muted-foreground">Nenhuma categoria.</div>}
        {!loading && items.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-4">
            <span>{c.Nome}</span>
            <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </Card>
    </div>
  );
};

export default Categorias;
