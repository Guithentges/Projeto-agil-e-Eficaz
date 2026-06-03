import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, BookOpen } from "lucide-react";

const Ajuda = () => {
  const [openSection, setOpenSection] = useState<"fluxos" | "funcoes" | null>("fluxos");
  const [openFluxoChild, setOpenFluxoChild] = useState<string | null>(null);
  const [openFuncChild, setOpenFuncChild] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Ajuda · Vendas Pro";
  }, []);

  const toggleSection = (section: "fluxos" | "funcoes") => (open: boolean) => {
    if (open) {
      setOpenSection(section);
    } else {
      setOpenSection(null);
    }
    if (!open && section === "fluxos") setOpenFluxoChild(null);
    if (!open && section === "funcoes") setOpenFuncChild(null);
  };

  const makeChildToggle = (setter: (v: string | null) => void, key: string) => (open: boolean) => {
    setter(open ? key : null);
  };

  const sectionButtonClasses = (isOpen: boolean) =>
    `w-full flex items-center justify-between p-4 rounded-md border transition-colors duration-200 bg-background ${
      isOpen ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50 hover:text-primary"
    }`;

  const childButtonClasses = (isOpen: boolean) =>
    `w-full flex items-center justify-between text-left p-3 rounded border transition-colors duration-200 bg-background ${
      isOpen ? "border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
    }`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <BookOpen className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Ajuda</h1>
          <p className="text-muted-foreground">Documentação rápida dos fluxos e das funções das páginas</p>
        </div>
      </header>

      <Card className="p-0 overflow-hidden shadow-card">
        <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <h2 className="font-bold text-lg">Conteúdo</h2>
        </div>

        <div className="p-6 space-y-4">
          <Collapsible open={openSection === "fluxos"} onOpenChange={toggleSection("fluxos") as any}>
            <CollapsibleTrigger asChild>
              <button className={sectionButtonClasses(openSection === "fluxos")}> 
                <div className="text-left">
                  <div className="font-semibold">Fluxos</div>
                  <div className="text-sm text-muted-foreground">Principais fluxos do sistema</div>
                </div>
                <ChevronDown
                  className={
                    openSection === "fluxos"
                      ? "h-5 w-5 rotate-180 text-primary transition-transform duration-200"
                      : "h-5 w-5 text-muted-foreground transition-transform duration-200"
                  }
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <Collapsible open={openFluxoChild === "vendas"} onOpenChange={makeChildToggle(setOpenFluxoChild, "vendas") as any}>
                  <CollapsibleTrigger asChild>
                    <button className={childButtonClasses(openFluxoChild === "vendas")}>
                      <div>
                        <div className="font-medium">Vendas</div>
                        <div className="text-xs text-muted-foreground">PDV → Pedido → Finalizar Venda</div>
                      </div>
                      <ChevronDown
                        className={
                          openFluxoChild === "vendas"
                            ? "h-4 w-4 rotate-180 text-primary transition-transform duration-200"
                            : "h-4 w-4 text-muted-foreground transition-transform duration-200"
                        }
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    <div className="p-3 text-sm text-muted-foreground">Detalhes do fluxo de vendas: selecionar produto, confirmar quantidade, aplicar descontos, finalizar pagamento.</div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={openFluxoChild === "estoque"} onOpenChange={makeChildToggle(setOpenFluxoChild, "estoque") as any}>
                  <CollapsibleTrigger asChild>
                    <button className={childButtonClasses(openFluxoChild === "estoque")}>
                      <div>
                        <div className="font-medium">Estoque</div>
                        <div className="text-xs text-muted-foreground">Entrada, saída e ajustes</div>
                      </div>
                      <ChevronDown
                        className={
                          openFluxoChild === "estoque"
                            ? "h-4 w-4 rotate-180 text-primary transition-transform duration-200"
                            : "h-4 w-4 text-muted-foreground transition-transform duration-200"
                        }
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    <div className="p-3 text-sm text-muted-foreground">Detalhes do fluxo de estoque: receber insumos, vincular a produtos e controlar saídas automáticas.</div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={openFluxoChild === "cardapio"} onOpenChange={makeChildToggle(setOpenFluxoChild, "cardapio") as any}>
                  <CollapsibleTrigger asChild>
                    <button className={childButtonClasses(openFluxoChild === "cardapio")}>
                      <div>
                        <div className="font-medium">Cardápio</div>
                        <div className="text-xs text-muted-foreground">Categorias e produtos</div>
                      </div>
                      <ChevronDown
                        className={
                          openFluxoChild === "cardapio"
                            ? "h-4 w-4 rotate-180 text-primary transition-transform duration-200"
                            : "h-4 w-4 text-muted-foreground transition-transform duration-200"
                        }
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    <div className="p-3 text-sm text-muted-foreground">Detalhes do fluxo de cardápio: criar categorias, adicionar produtos e publicar alterações.</div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openSection === "funcoes"} onOpenChange={toggleSection("funcoes") as any}>
            <CollapsibleTrigger asChild>
              <button className={sectionButtonClasses(openSection === "funcoes")}>
                <div className="text-left">
                  <div className="font-semibold">Funções das Páginas</div>
                  <div className="text-sm text-muted-foreground">O que cada página faz</div>
                </div>
                <ChevronDown
                  className={
                    openSection === "funcoes"
                      ? "h-5 w-5 rotate-180 text-primary transition-transform duration-200"
                      : "h-5 w-5 text-muted-foreground transition-transform duration-200"
                  }
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <Collapsible open={openFuncChild === "pdv"} onOpenChange={makeChildToggle(setOpenFuncChild, "pdv") as any}>
                  <CollapsibleTrigger asChild>
                    <button className={childButtonClasses(openFuncChild === "pdv")}>
                      <div>
                        <div className="font-medium">PDV</div>
                        <div className="text-xs text-muted-foreground">Registrar pedidos e pagamentos</div>
                      </div>
                      <ChevronDown
                        className={
                          openFuncChild === "pdv"
                            ? "h-4 w-4 rotate-180 text-primary transition-transform duration-200"
                            : "h-4 w-4 text-muted-foreground transition-transform duration-200"
                        }
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    <div className="p-3 text-sm text-muted-foreground">Descrição da função do PDV, atalhos e dicas de uso.</div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={openFuncChild === "pedidos"} onOpenChange={makeChildToggle(setOpenFuncChild, "pedidos") as any}>
                  <CollapsibleTrigger asChild>
                    <button className={childButtonClasses(openFuncChild === "pedidos")}>
                      <div>
                        <div className="font-medium">Pedidos</div>
                        <div className="text-xs text-muted-foreground">Gestão e histórico</div>
                      </div>
                      <ChevronDown
                        className={
                          openFuncChild === "pedidos"
                            ? "h-4 w-4 rotate-180 text-primary transition-transform duration-200"
                            : "h-4 w-4 text-muted-foreground transition-transform duration-200"
                        }
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    <div className="p-3 text-sm text-muted-foreground">Descrição das ações em Pedidos: alterar status, cancelar e imprimir.</div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={openFuncChild === "produtos"} onOpenChange={makeChildToggle(setOpenFuncChild, "produtos") as any}>
                  <CollapsibleTrigger asChild>
                    <button className={childButtonClasses(openFuncChild === "produtos")}>
                      <div>
                        <div className="font-medium">Produtos</div>
                        <div className="text-xs text-muted-foreground">Cadastro e preços</div>
                      </div>
                      <ChevronDown
                        className={
                          openFuncChild === "produtos"
                            ? "h-4 w-4 rotate-180 text-primary transition-transform duration-200"
                            : "h-4 w-4 text-muted-foreground transition-transform duration-200"
                        }
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    <div className="p-3 text-sm text-muted-foreground">Como cadastrar produtos, controlar variações e preços.</div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={openFuncChild === "telegram"} onOpenChange={makeChildToggle(setOpenFuncChild, "telegram") as any}>
                  <CollapsibleTrigger asChild>
                    <button className={childButtonClasses(openFuncChild === "telegram")}>
                      <div>
                        <div className="font-medium">Telegram</div>
                        <div className="text-xs text-muted-foreground">Configuração de notificações</div>
                      </div>
                      <ChevronDown
                        className={
                          openFuncChild === "telegram"
                            ? "h-4 w-4 rotate-180 text-primary transition-transform duration-200"
                            : "h-4 w-4 text-muted-foreground transition-transform duration-200"
                        }
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    <div className="p-3 text-sm text-muted-foreground">Como autorizar chats e configurar mensagens via Telegram.</div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </Card>
    </div>
  );
};

export default Ajuda;
