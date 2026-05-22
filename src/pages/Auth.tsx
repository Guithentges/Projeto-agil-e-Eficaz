import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Store } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  // login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // signup
  const [sNome, setSNome] = useState("");
  const [sEmpresa, setSEmpresa] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sPassword, setSPassword] = useState("");

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    document.title = "Acesso · Sistema de Vendas";
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo!");
    navigate("/", { replace: true });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: sEmail,
      password: sPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { nome: sNome, empresa_nome: sEmpresa },
      },
    });
    if (error) { setBusy(false); return toast.error(error.message); }
    if (!data.user) { setBusy(false); return toast.error("Falha ao criar conta"); }

    // A criação de Empresa, vinculação em Profile e assignment de Role 
    // AGORA FICARÁ A CARGO DO BACKEND (Supabase Autentication Trigger ou RPC Security Definer).
    // O Frontend nunca deve despachar inserção em `user_roles` com chaves expostas publicamente.

    setBusy(false);
    toast.success("Conta criada! Redirecionando para o painel...");
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background relative">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle className="bg-card/80 backdrop-blur border border-border shadow-sm rounded-md" />
      </div>
      <div className="hidden lg:flex flex-col justify-between p-12 gradient-surface border-r border-border">
        <div className="flex items-center gap-2 text-primary font-semibold">
          <Store className="h-5 w-5" /> Vendas Pro
        </div>
        <div>
          <h1 className="text-4xl font-bold mb-3 leading-tight">
            Gestão completa do seu negócio em um só lugar.
          </h1>
          <p className="text-muted-foreground max-w-md">
            Controle vendas, estoque, custos e margem de cada produto. Multi-empresa, papéis de acesso e relatórios em tempo real.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} Vendas Pro</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-6 shadow-card">
          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label>Seu nome</Label>
                  <Input required value={sNome} onChange={(e) => setSNome(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nome da empresa</Label>
                  <Input required value={sEmpresa} onChange={(e) => setSEmpresa(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" required value={sEmail} onChange={(e) => setSEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" required minLength={6} value={sPassword} onChange={(e) => setSPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Criando..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
