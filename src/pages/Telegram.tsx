import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Send, Trash2, Plus } from "lucide-react";

const Telegram = () => {
  const { empresaId } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [newChatId, setNewChatId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Telegram · Vendas Pro";
    loadChats();
  }, [empresaId]);

  const loadChats = async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("idChatxidEmpresa")
      .select("*")
      .eq("id_empresa", empresaId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar chats: " + error.message);
    } else {
      setChats(data || []);
    }
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatId || !empresaId) return;

    const { error } = await supabase
      .from("idChatxidEmpresa")
      .insert({ id_chat: newChatId, id_empresa: empresaId });

    if (error) {
      toast.error("Erro ao adicionar chat: " + error.message);
    } else {
      toast.success("Chat autorizado com sucesso!");
      setNewChatId("");
      loadChats();
    }
  };

  const handleRemove = async (id: number) => {
    if (!empresaId) return;
    const { error } = await supabase
      .from("idChatxidEmpresa")
      .delete()
      .eq("id", id)
      .eq("id_empresa", empresaId);

    if (error) {
      toast.error("Erro ao remover chat: " + error.message);
    } else {
      toast.success("Autorização removida.");
      loadChats();
    }
  };

    if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Send className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold">Configuração Telegram</h1>
          <p className="text-muted-foreground">Gerencie os IDs únicos autorizados para sua empresa</p>
        </div>
      </header>

      <Card className="p-6 border-l-4 border-l-primary shadow-elegant">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chatId" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Novo ID Único do Telegram</Label>
            <div className="flex gap-2">
              <Input
                id="chatId"
                placeholder="Ex: 123456789"
                value={newChatId}
                onChange={(e) => setNewChatId(e.target.value)}
                required
                className="font-mono text-lg"
              />
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" /> Adicionar
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            O ID exclusivo é necessário para que o sistema reconheça e autorize as respostas automáticas via Telegram. 
            Você pode obter esse ID através do seu Bot do Telegram.
          </p>
        </form>
      </Card>

      <Card className="overflow-hidden shadow-card">
        <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" /> Chats Autorizados
          </h2>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
            {chats.length} chats vinculados
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase bg-muted/40 text-muted-foreground tracking-widest border-b border-border">
              <tr>
                <th className="px-6 py-3 font-bold">ID do Chat</th>
                <th className="px-6 py-3 font-bold text-center">Data de Autorização</th>
                <th className="px-6 py-3 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground animate-pulse">Carregando canais ativos...</td>
                </tr>
              ) : chats.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Send className="h-8 w-8 text-muted-foreground/30" />
                      <span>Nenhum chat autorizado ainda.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                chats.map((chat) => (
                  <tr key={chat.id} className="hover:bg-primary/[0.02] transition-colors group">
                    <td className="px-6 py-4 font-mono font-medium text-primary">{chat.id_chat}</td>
                    <td className="px-6 py-4 text-center text-muted-foreground">
                      {new Date(chat.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemove(chat.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Telegram;
