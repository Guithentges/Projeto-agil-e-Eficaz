import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, ScrollText, BookOpen, Package, Boxes,
  Tags, Wallet, Building2, LogOut, Receipt, Wheat, Send, Store
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "gerente", "operador"] },
  { to: "/pdv", label: "PDV", icon: ShoppingCart, roles: ["admin", "gerente", "operador"] },
  { to: "/pedidos", label: "Pedidos", icon: Receipt, roles: ["admin", "gerente", "operador"] },
  { to: "/cardapio", label: "Cardápio", icon: BookOpen, roles: ["admin", "gerente"] },
  { to: "/produtos", label: "Produtos", icon: Package, roles: ["admin", "gerente"] },
  { to: "/materias", label: "Matéria-Prima", icon: Wheat, roles: ["admin", "gerente"] },
  { to: "/estoque", label: "Estoque", icon: Boxes, roles: ["admin", "gerente"] },
  { to: "/categorias", label: "Categorias", icon: Tags, roles: ["admin", "gerente"] },
  { to: "/gastos", label: "Gastos", icon: Wallet, roles: ["admin", "gerente"] },
  { to: "/empresa", label: "Empresa", icon: Building2, roles: ["admin"] },
  { to: "/telegram", label: "Telegram", icon: Send, roles: ["admin"] },
] as const;

export const AppLayout = () => {
  const { signOut, empresaNome, user, roles } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const items = nav.filter((n) => n.roles.some((r) => roles.includes(r as never)));

  return (
    <div className="flex min-h-screen w-full bg-background relative">
      {/* Sidebar - Fixed to left side, expands on hover */}
      <aside className="hidden md:flex flex-col border-r border-sidebar-border bg-sidebar fixed left-0 top-0 h-full z-40 w-[65px] hover:w-64 transition-all duration-300 ease-in-out group overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="h-[65px] flex items-center px-4 border-b border-sidebar-border w-64 flex-shrink-0">
          <div className="flex items-center gap-3 w-full">
             <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
               <Store className="h-4 w-4" />
             </div>
             <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70 leading-tight">Empresa</span>
                <span className="font-semibold text-sidebar-foreground truncate leading-tight text-sm">{empresaNome ?? "—"}</span>
             </div>
          </div>
        </div>
        
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden flex flex-col items-start px-3">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-4 px-[11px] py-2.5 rounded-md text-sm transition-colors w-full min-w-[220px]",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )
              }
            >
              <n.icon className="h-[18px] w-[18px] flex-shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap flex-1">
                {n.label}
              </span>
            </NavLink>
          ))}
        </nav>
        
        <div className="p-3 border-t border-sidebar-border w-64 flex-shrink-0 bg-sidebar/50">
           <div className="flex items-center justify-start group-hover:justify-start">
             {/* Collapsed View Logout */}
             <Button variant="ghost" size="icon" className="w-[40px] h-[40px] group-hover:hidden flex-shrink-0 ml-[1px]" onClick={handleLogout} title="Sair do Sistema">
                <LogOut className="h-[18px] w-[18px] text-muted-foreground" />
             </Button>
             
             {/* Expanded View Logout */}
             <div className="hidden group-hover:flex flex-col flex-1 w-full opacity-0 group-hover:opacity-100 transition-opacity px-1">
               <div className="text-[11px] text-muted-foreground/80 truncate mb-2 font-medium">{user?.email}</div>
               <Button variant="outline" size="sm" className="w-full bg-background" onClick={handleLogout}>
                 <LogOut className="h-4 w-4 mr-2" /> Sair do Sistema
               </Button>
             </div>
           </div>
        </div>
      </aside>

      {/* Spacer para a Sidebar não cobrir o conteúdo (mesma largura da sidebar retraída) */}
      <div className="hidden md:block w-[65px] flex-shrink-0" />

      <div className="flex-1 flex flex-col min-w-0 bg-secondary/10">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="font-semibold">{empresaNome ?? "Sistema"}</div>
          <Button size="sm" variant="ghost" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <Outlet />
        </main>
        <nav className="md:hidden flex items-center gap-1 overflow-x-auto px-2 py-2 border-t border-border bg-sidebar">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md text-[10px] whitespace-nowrap",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};
