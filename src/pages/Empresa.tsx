import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Empresa = () => {
  const { empresaId, refreshProfile } = useAuth();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Empresa · Vendas Pro"; }, []);

  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);
    supabase.from("Empresa").select("*").eq("id", empresaId).maybeSingle().then(({ data }) => {
      setNome(data?.Nome ?? "");
      setDescricao(data?.descricao ?? "");
      setLoading(false);
    });
  }, [empresaId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    setBusy(true);
    const { error } = await supabase.from("Empresa").update({ Nome: nome, descricao }).eq("id", empresaId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Empresa atualizada");
    refreshProfile();
  };

    if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <header>
        <h1 className="text-3xl font-semibold">Empresa</h1>
        <p className="text-muted-foreground">Dados da sua empresa</p>
      </header>

      <Card className="p-6">
        {loading ? (
          <div className="py-10 text-center text-muted-foreground animate-pulse">Carregando dados da empresa...</div>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
          </form>
        )}
      </Card>
    </div>
  );
};

export default Empresa;
