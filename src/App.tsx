import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/theme-provider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import PDV from "./pages/PDV";
import Pedidos from "./pages/Pedidos";
import Cardapio from "./pages/Cardapio";
import Produtos from "./pages/Produtos";
import MateriaPrima from "./pages/MateriaPrima";
import Molhos from "./pages/Molhos";
import Estoque from "./pages/Estoque";
import Categorias from "./pages/Categorias";
import Gastos from "./pages/Gastos";
import Empresa from "./pages/Empresa";
import Telegram from "./pages/Telegram";
import Ajuda from "./pages/Ajuda";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pdv" element={<PDV />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/cardapio" element={<ProtectedRoute allow={["admin", "gerente"]}><Cardapio /></ProtectedRoute>} />
              <Route path="/produtos" element={<ProtectedRoute allow={["admin", "gerente"]}><Produtos /></ProtectedRoute>} />
              <Route path="/materias" element={<ProtectedRoute allow={["admin", "gerente"]}><MateriaPrima /></ProtectedRoute>} />
              <Route path="/molhos" element={<ProtectedRoute allow={["admin", "gerente"]}><Molhos /></ProtectedRoute>} />
              <Route path="/estoque" element={<ProtectedRoute allow={["admin", "gerente"]}><Estoque /></ProtectedRoute>} />
              <Route path="/categorias" element={<ProtectedRoute allow={["admin", "gerente"]}><Categorias /></ProtectedRoute>} />
              <Route path="/gastos" element={<ProtectedRoute allow={["admin"]}><Gastos /></ProtectedRoute>} />
              <Route path="/empresa" element={<ProtectedRoute allow={["admin"]}><Empresa /></ProtectedRoute>} />
              <Route path="/telegram" element={<ProtectedRoute allow={["admin"]}><Telegram /></ProtectedRoute>} />
              <Route path="/ajuda" element={<ProtectedRoute allow={["admin","gerente","operador"]}><Ajuda /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
