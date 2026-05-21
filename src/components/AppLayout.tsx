import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, ShoppingCart, BookOpen, Package, Boxes,
  Tags, Wallet, Building2, LogOut, Receipt, Wheat, Send, Store,
  ChevronDown, Briefcase, DollarSign, ClipboardList, Menu
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/* ── Types ── */
type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: readonly string[];
};

type NavGroup = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};

const standaloneItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "gerente", "operador"] },
];

const navGroups: NavGroup[] = [
  {
    id: "trabalho",
    label: "Trabalho",
    icon: Briefcase,
    items: [
      { to: "/pdv", label: "PDV", icon: ShoppingCart, roles: ["admin", "gerente", "operador"] },
      { to: "/pedidos", label: "Pedidos", icon: Receipt, roles: ["admin", "gerente", "operador"] },
    ],
  },
  {
    id: "custos",
    label: "Custos",
    icon: DollarSign,
    items: [
      { to: "/estoque", label: "Estoque", icon: Boxes, roles: ["admin", "gerente"] },
      { to: "/gastos", label: "Gastos", icon: Wallet, roles: ["admin"] },
    ],
  },
  {
    id: "cadastramentos",
    label: "Cadastramentos",
    icon: ClipboardList,
    items: [
      { to: "/materias", label: "Matéria-Prima", icon: Wheat, roles: ["admin", "gerente"] },
      { to: "/produtos", label: "Produtos", icon: Package, roles: ["admin", "gerente"] },
      { to: "/cardapio", label: "Cardápio", icon: BookOpen, roles: ["admin", "gerente"] },
    ],
  },
];

const bottomItems: NavItem[] = [
  { to: "/categorias", label: "Categorias", icon: Tags, roles: ["admin", "gerente"] },
  { to: "/empresa", label: "Empresa", icon: Building2, roles: ["admin"] },
  { to: "/telegram", label: "Telegram", icon: Send, roles: ["admin"] },
];

const filterByRoles = (items: NavItem[], userRoles: string[]) =>
  items.filter((n) => n.roles.some((r) => userRoles.includes(r)));

/* ── Desktop Sidebar NavLink renderer ── */
const SidebarLink = ({ item, isGroupChild = false }: { item: NavItem; isGroupChild?: boolean }) => (
  <NavLink
    to={item.to}
    end={item.to === "/"}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-4 rounded-md text-sm transition-colors w-full min-w-[220px]",
        isGroupChild ? "px-[11px] py-2 pl-[35px]" : "px-[11px] py-2.5",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      )
    }
  >
    <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap flex-1">
      {item.label}
    </span>
  </NavLink>
);

/* ── Mobile Sidebar NavLink renderer ── */
const MobileSidebarLink = ({ item, isGroupChild = false, onNavigate }: { item: NavItem; isGroupChild?: boolean; onNavigate: () => void }) => (
  <NavLink
    to={item.to}
    end={item.to === "/"}
    onClick={onNavigate}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 rounded-lg text-sm transition-colors w-full",
        isGroupChild ? "px-3 py-2.5 pl-10" : "px-3 py-2.5",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground/80 hover:bg-muted/80 hover:text-foreground"
      )
    }
  >
    <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
    <span className="whitespace-nowrap flex-1">{item.label}</span>
  </NavLink>
);

/* ── Desktop Collapsible group ── */
const SidebarGroup = ({
  group,
  userRoles,
  isSidebarHovered,
}: {
  group: NavGroup;
  userRoles: string[];
  isSidebarHovered: boolean;
}) => {
  const location = useLocation();
  const visibleItems = filterByRoles(group.items, userRoles);
  
  // Lógica para detectar se algum filho está ativo
  const isAnyActive = visibleItems.some((item) => location.pathname === item.to);
  const [open, setOpen] = useState(isAnyActive);

  useEffect(() => {
    if (!isSidebarHovered) {
      setOpen(false);
    } else if (isAnyActive) {
      setOpen(true);
    }
  }, [isSidebarHovered, isAnyActive]);

  if (visibleItems.length === 0) return null;

  return (
    <Collapsible open={isSidebarHovered && open} onOpenChange={setOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-4 px-[11px] py-2.5 rounded-md text-sm transition-colors w-full min-w-[220px]",
            // Se algum filho estiver ativo, o PAI ganha a cor primary no texto
            isAnyActive 
              ? "text-primary font-medium" 
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          )}
        >
          <group.icon className={cn("h-[18px] w-[18px] flex-shrink-0", isAnyActive && "text-primary")} />
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap flex-1 text-left">
            {group.label}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300",
              open && "rotate-180",
              isAnyActive && "text-primary"
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <div className="flex flex-col gap-0.5 mt-0.5">
          {visibleItems.map((item) => (
            <SidebarLink key={item.to} item={item} isGroupChild />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

/* ── Mobile Collapsible group ── */
const MobileSidebarGroup = ({
  group,
  userRoles,
  onNavigate,
}: {
  group: NavGroup;
  userRoles: string[];
  onNavigate: () => void;
}) => {
  const location = useLocation();
  const visibleItems = filterByRoles(group.items, userRoles);
  const isAnyActive = visibleItems.some((item) => location.pathname === item.to);
  const [open, setOpen] = useState(isAnyActive);

  if (visibleItems.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full",
            isAnyActive 
              ? "text-primary font-medium" 
              : "text-foreground/80 hover:bg-muted/80 hover:text-foreground"
          )}
        >
          <group.icon className={cn("h-[18px] w-[18px] flex-shrink-0", isAnyActive && "text-primary")} />
          <span className="whitespace-nowrap flex-1 text-left font-medium">
            {group.label}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 flex-shrink-0 transition-transform duration-200",
              open && "rotate-180",
              isAnyActive && "text-primary"
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <div className="flex flex-col gap-0.5 mt-0.5">
          {visibleItems.map((item) => (
            <MobileSidebarLink key={item.to} item={item} isGroupChild onNavigate={onNavigate} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const AppLayout = () => {
  const { signOut, empresaNome, user, roles, profileLoaded, empresaId } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  if (profileLoaded && !empresaId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold">Configuração incompleta</h2>
          <p className="text-muted-foreground text-sm">
            Sua conta foi criada, mas a empresa não foi vinculada corretamente.
          </p>
          <button onClick={handleLogout} className="text-sm text-primary underline">
            Sair e tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const userRoles = (roles as string[]) || [];
  const topItems = filterByRoles(standaloneItems, userRoles);
  const btmItems = filterByRoles(bottomItems, userRoles);
  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex min-h-[100dvh] w-full bg-background relative">
      <aside 
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className="hidden md:flex flex-col border-r border-sidebar-border bg-sidebar fixed left-0 top-0 h-full z-40 w-[65px] hover:w-64 transition-all duration-300 ease-in-out group overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
      >
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
          {topItems.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}

          {topItems.length > 0 && (
            <div className="w-full px-2 py-2">
              <div className="h-px bg-sidebar-border" />
            </div>
          )}

          {navGroups.map((group) => (
            <SidebarGroup 
              key={group.id} 
              group={group} 
              userRoles={userRoles} 
              isSidebarHovered={isSidebarHovered} 
            />
          ))}

          {btmItems.length > 0 && (
            <div className="w-full px-2 py-2">
              <div className="h-px bg-sidebar-border" />
            </div>
          )}

          {btmItems.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border w-64 flex-shrink-0 bg-sidebar/50">
          <div className="flex items-center justify-start group-hover:justify-start">
            <Button variant="ghost" size="icon" className="w-[40px] h-[40px] group-hover:hidden flex-shrink-0 ml-[1px]" onClick={handleLogout} title="Sair do Sistema">
              <LogOut className="h-[18px] w-[18px] text-muted-foreground" />
            </Button>

            <div className="hidden group-hover:flex flex-col flex-1 w-full opacity-0 group-hover:opacity-100 transition-opacity px-1">
              <div className="text-[11px] text-muted-foreground/80 truncate mb-2 font-medium">{user?.email}</div>
              <Button variant="outline" size="sm" className="w-full bg-background" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" /> Sair do Sistema
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <div className="hidden md:block w-[65px] flex-shrink-0" />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0 flex flex-col bg-sidebar border-r border-sidebar-border">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div className="h-[60px] flex items-center px-4 border-b border-sidebar-border flex-shrink-0">
            <div className="flex items-center gap-3 w-full">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                <Store className="h-4 w-4" />
              </div>
              <div className="flex flex-col whitespace-nowrap overflow-hidden">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70 leading-tight">Empresa</span>
                <span className="font-semibold text-sidebar-foreground truncate leading-tight text-sm">{empresaNome ?? "—"}</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
            {topItems.map((item) => (
              <MobileSidebarLink key={item.to} item={item} onNavigate={closeMobile} />
            ))}

            {topItems.length > 0 && (
              <div className="px-2 py-2">
                <div className="h-px bg-border/50" />
              </div>
            )}

            {navGroups.map((group) => (
              <MobileSidebarGroup key={group.id} group={group} userRoles={userRoles} onNavigate={closeMobile} />
            ))}

            {btmItems.length > 0 && (
              <div className="px-2 py-2">
                <div className="h-px bg-border/50" />
              </div>
            )}

            {btmItems.map((item) => (
              <MobileSidebarLink key={item.to} item={item} onNavigate={closeMobile} />
            ))}
          </nav>

          <div className="p-3 border-t border-sidebar-border flex-shrink-0 bg-sidebar/50">
            <div className="text-[11px] text-muted-foreground/80 truncate mb-2 font-medium px-1">{user?.email}</div>
            <Button variant="outline" size="sm" className="w-full bg-background" onClick={() => { closeMobile(); handleLogout(); }}>
              <LogOut className="h-4 w-4 mr-2" /> Sair do Sistema
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0 bg-secondary/10">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost" onClick={() => setMobileOpen(true)} className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="font-semibold text-sm truncate">{empresaNome ?? "Sistema"}</div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};