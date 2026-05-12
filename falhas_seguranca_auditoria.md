# Auditoria de Falhas de Seguranca

Projeto: Projeto-gil-e-Eficaz  
Data: 2026-05-11  
Escopo: frontend React/Vite, integracao Supabase, scripts SQL/RLS e Edge Function `finalizar_venda`.

## Resumo Executivo

A aplicacao e uma SPA React/Vite usando Supabase diretamente no frontend. Portanto, a seguranca real depende principalmente de RLS, policies do banco, RPCs e Edge Functions. A auditoria encontrou bons avancos, como RLS habilitado nas tabelas sensiveis, `.env` ignorado no Git e `npm audit` limpo. Mesmo assim, ha falhas importantes de autorizacao e integridade que devem ser corrigidas antes de considerar o sistema seguro para uso multiempresa.

Os riscos mais graves sao:

- Possivel escalada multiempresa se o usuario conseguir alterar `profiles.id_empresa`.
- RPC de venda exposta para qualquer usuario autenticado e recebendo `p_id_empresa` como parametro.
- Venda atomica sem validacao forte de existencia/ownership dos itens e sem checagem de decremento efetivo de estoque.
- Regras de role aplicadas no frontend, mas nem sempre refletidas no RLS.

## Achados

### Critico - Usuario pode tentar trocar `profiles.id_empresa` e escapar do tenant

**Arquivos relacionados:** `supabaseScripts/01_rpc_e_constraints.sql`, `src/hooks/useAuth.tsx`

As policies multiempresa dependem de `profiles.id_empresa` para isolar registros por empresa. A policy atual de `profiles` permite que o usuario atualize o proprio registro:

```sql
CREATE POLICY "Modificar_Proprio_Perfil" ON public."profiles"
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
```

Como o `WITH CHECK` valida apenas `id = auth.uid()`, ele nao impede que o proprio usuario altere campos sensiveis do perfil, como `id_empresa`, caso a permissao SQL de update esteja disponivel para a role autenticada.

**Impacto:** acesso, alteracao ou exclusao de dados de outra empresa, pois as policies usam `profiles.id_empresa` como raiz de confianca.

**Correcao recomendada:**

- Revogar update direto em `profiles.id_empresa` para usuarios comuns.
- Criar policy/trigger que permita atualizar apenas campos seguros, como `nome`.
- Bloquear mudanca de `id_empresa` via trigger `BEFORE UPDATE`.
- Fazer mudancas de empresa apenas por backend administrativo/`service_role`.
- Testar explicitamente: usuario autenticado nao deve conseguir executar `update profiles set id_empresa = ... where id = auth.uid()`.

### Critico - RPC `processar_venda_atomica` pode ser chamada diretamente por qualquer usuario autenticado

**Arquivos relacionados:** `supabaseScripts/01_rpc_e_constraints.sql`, `supabaseScripts/finalizar_venda.ts`, `src/pages/PDV.tsx`

A funcao `processar_venda_atomica(p_id_empresa, p_carrinho)` recebe `p_id_empresa` do chamador e possui:

```sql
GRANT EXECUTE ON FUNCTION public.processar_venda_atomica(bigint, jsonb) TO authenticated;
```

A Edge Function busca `empresaId` pelo JWT antes de chamar a RPC, o que e uma boa camada. Porem, como a RPC tambem esta liberada para `authenticated`, um usuario pode tentar chama-la diretamente pelo Supabase client, sem passar pela Edge Function.

**Impacto:** ampliacao de superficie de ataque, tentativa de manipular `p_id_empresa`, criar vendas indevidas ou explorar inconsistencias da RPC.

**Correcao recomendada:**

- Remover `GRANT EXECUTE` da RPC para `authenticated` se ela deve ser chamada apenas pela Edge Function.
- Alternativa: alterar a RPC para nao receber `p_id_empresa`; derive a empresa internamente a partir de `auth.uid()`.
- Adicionar validacao interna na RPC: `p_id_empresa` deve ser igual ao `id_empresa` do usuario autenticado.
- Preferir uma RPC com assinatura segura, por exemplo `processar_venda_atomica(p_carrinho jsonb)`.

### Critico - Venda atomica nao valida ownership dos itens antes de inserir pedidos

**Arquivo relacionado:** `supabaseScripts/01_rpc_e_constraints.sql`

A RPC insere pedidos com `id_cardapio` ou `id_produto` vindos diretamente do JSON:

```sql
INSERT INTO public."Pedido" (id_venda, id_cardapio, id_empresa)
VALUES (v_venda_id, v_id, p_id_empresa)
```

Somente depois a funcao consulta composicoes/estoque usando `id_empresa`. Falta rejeitar explicitamente itens inexistentes ou que nao pertencam a empresa antes da insercao.

**Impacto:** criacao de pedidos inconsistentes, erro por FK, tentativa de referenciar itens de outro tenant, venda com itens invalidos e comportamento inesperado.

**Correcao recomendada:**

- Validar `v_type` com allowlist: somente `cardapio` ou `produto`.
- Validar que `v_id` existe e pertence a `p_id_empresa` antes de inserir `Pedido`.
- Rejeitar item inexistente com erro controlado.
- Validar que `insumos_removidos` contem apenas materias vinculadas ao produto/cardapio da mesma empresa.
- Criar constraints adicionais para impedir pedido sem `id_cardapio` e sem `id_produto`, e idealmente impedir ambos preenchidos ao mesmo tempo.

### Critico - Baixa de estoque nao verifica saldo suficiente nem update efetivo

**Arquivo relacionado:** `supabaseScripts/01_rpc_e_constraints.sql`

A RPC faz:

```sql
UPDATE public."Estoque" SET quantidade = quantidade - v_qtd
WHERE id_produto = pc.id_produto AND id_empresa = p_id_empresa;
```

O script possui constraint `quantidade >= 0`, o que ajuda a abortar se o saldo ficar negativo. Mas a RPC nao usa `WHERE quantidade >= ...` nem verifica se alguma linha foi atualizada. Se nao houver linha de estoque, a venda pode ser criada sem baixa real. Se houver concorrencia, a constraint pode abortar, mas a mensagem e generica e a logica fica dependente de erro de banco.

**Impacto:** venda registrada sem baixa de estoque, inconsistencias operacionais ou falhas em horario de pico.

**Correcao recomendada:**

- Usar decremento atomico: `UPDATE ... SET quantidade = quantidade - x WHERE ... AND quantidade >= x`.
- Verificar `GET DIAGNOSTICS row_count` ou `IF NOT FOUND THEN RAISE EXCEPTION`.
- Tratar ausencia de registro de estoque como estoque insuficiente.
- Manter a constraint `quantidade >= 0` como camada adicional, nao como unica regra.

### Alto - Regras de role estao no frontend, mas nem todas no banco

**Arquivos relacionados:** `src/App.tsx`, `src/components/ProtectedRoute.tsx`, `supabaseScripts/01_rpc_e_constraints.sql`

Rotas como `/empresa`, `/telegram`, `/produtos`, `/materias`, `/estoque`, `/categorias` e `/gastos` usam `ProtectedRoute` com roles. Isso melhora UX, mas nao protege contra chamadas diretas pelo Supabase client.

As policies genericas criam `FOR ALL` por empresa para varias tabelas operacionais:

```sql
FOR ALL USING (id_empresa IN (...))
WITH CHECK (id_empresa IN (...));
```

**Impacto:** um usuario autenticado da empresa pode tentar executar mutacoes que a UI esconderia, como criar, editar ou excluir dados administrativos.

**Correcao recomendada:**

- Criar funcao segura `has_role(role)` ou `has_any_role(roles text[])`.
- Separar policies de `SELECT`, `INSERT`, `UPDATE` e `DELETE`.
- Permitir leitura conforme necessario, mas restringir escrita a `admin`/`gerente` onde aplicavel.
- Manter `ProtectedRoute` apenas como camada complementar.

### Alto - Tabela `Empresa` pode ser alterada por qualquer usuario vinculado

**Arquivos relacionados:** `supabaseScripts/01_rpc_e_constraints.sql`, `src/pages/Empresa.tsx`

A policy de `Empresa` e `FOR ALL` para usuarios vinculados ao `id_empresa`. O frontend restringe `/empresa` a `admin`, mas o banco nao reflete essa regra.

**Impacto:** qualquer membro autenticado da empresa pode tentar alterar nome/descricao da empresa via chamada direta ao Supabase.

**Correcao recomendada:**

- Criar policy de `SELECT` para membros da empresa.
- Criar policy de `UPDATE` apenas para `admin`.
- Bloquear `INSERT`/`DELETE` para usuarios comuns; criacao deve ocorrer via trigger de onboarding ou backend.

### Alto - Inconsistencia entre frontend e RLS para `Gastos`

**Arquivos relacionados:** `src/App.tsx`, `supabaseScripts/01_rpc_e_constraints.sql`

O frontend permite acesso a `/gastos` para `admin` e `gerente`, mas a policy do banco exige `role = 'admin'`.

**Impacto:** gerentes podem ver a rota, mas falhar ao carregar ou salvar dados. Isso tambem cria confusao operacional e risco de futuras mudancas liberarem mais do que o esperado.

**Correcao recomendada:**

- Decidir a regra de negocio: `Gastos` e somente `admin` ou tambem `gerente`.
- Ajustar frontend e RLS para a mesma regra.
- Adicionar teste manual: usuario gerente deve ter exatamente o comportamento esperado.

### Alto - Operacoes client-side sem reforco de `id_empresa` em alguns pontos

**Arquivos relacionados:** `src/pages/Categorias.tsx`, `src/pages/Gastos.tsx`, `src/pages/Produtos.tsx`, `src/pages/PDV.tsx`

Exemplos:

- `Categorias.tsx` remove categoria apenas por `id`.
- `Gastos.tsx` le estoque/custos por `id_materia` ou `id_produto` em alguns pontos sem sempre filtrar `id_empresa`.
- `Produtos.tsx` recalcula receitas por `id_produto` sem reforcar `id_empresa` na leitura.
- `PDV.tsx` busca composicoes por `id_cardapio`/`id_produto` sem sempre reforcar `id_empresa`.

RLS deve ser a protecao principal, mas reforcar `id_empresa` no cliente reduz impacto de bugs e facilita auditoria.

**Impacto:** se uma policy estiver permissiva ou ausente, um atacante pode explorar IDOR com IDs de outro tenant.

**Correcao recomendada:**

- Em toda tabela que possui `id_empresa`, adicionar `.eq("id_empresa", empresaId)` em selects, updates e deletes.
- Em tabelas de relacao, validar que o recurso pai pertence a empresa antes de inserir/deletar vinculos.
- Priorizar: `Categorias`, `Gastos`, `Produtos`, `Cardapio`, `PDV`.

### Alto - Edge Function `finalizar_venda` valida pouco o payload

**Arquivo relacionado:** `supabaseScripts/finalizar_venda.ts`

A funcao valida apenas que `id` e `qtd` sao numeros e que `qtd > 0`. Ela nao valida:

- `type` permitido.
- `id` inteiro positivo.
- `qtd` inteira e com limite maximo.
- formato e tamanho de `insumos_removidos`.
- itens duplicados ou payload grande demais.

**Impacto:** payload malicioso pode causar erros, inconsistencias, consumo excessivo ou comportamento inesperado na RPC.

**Correcao recomendada:**

- Validar schema no Edge Function, preferencialmente com Zod ou validacao manual estrita.
- Rejeitar arrays grandes e quantidade excessiva por item.
- Normalizar payload antes de chamar a RPC.
- Retornar mensagens genericas ao cliente e manter detalhes apenas em log interno.

### Medio/Alto - `user_roles` precisa de policies explicitas e governanca de escrita

**Arquivos relacionados:** `supabaseScripts/01_rpc_e_constraints.sql`, `src/hooks/useAuth.tsx`, `supabaseScripts/02-supabase-auth-trigger.sql`

O script principal cria policy de leitura da propria role, mas nao define uma estrategia completa para administracao de roles. O trigger de signup atribui `admin` automaticamente ao criador do tenant.

**Impacto:** se roles forem gerenciadas futuramente pelo frontend sem RLS robusto, pode haver escalada de privilegio. Se estiver bloqueado demais, permissoes nao carregam corretamente.

**Correcao recomendada:**

- Permitir `SELECT` da propria role.
- Permitir administracao de roles apenas via RPC `SECURITY DEFINER` auditavel, ou via backend.
- Se admins puderem gerenciar roles, garantir que so possam gerenciar usuarios da propria empresa.
- Registrar historico de mudancas de role.

### Medio - Sessao persistida em `localStorage`

**Arquivo relacionado:** `src/integrations/supabase/client.ts`

O client Supabase usa:

```ts
storage: localStorage,
persistSession: true,
```

Isso e comum em SPAs, mas aumenta o impacto de qualquer XSS, pois tokens podem ser lidos por JavaScript.

**Impacto:** roubo de sessao em caso de XSS ou dependencia comprometida.

**Correcao recomendada:**

- Configurar CSP forte no deploy.
- Evitar qualquer HTML dinamico com dados de usuario.
- Considerar arquitetura com cookies HttpOnly se o risco do produto justificar.
- Reduzir tempo de sessao e monitorar logins suspeitos.

### Medio - CORS amplo na Edge Function

**Arquivo relacionado:** `supabaseScripts/finalizar_venda.ts`

A Edge Function usa:

```ts
'Access-Control-Allow-Origin': '*'
```

A autenticacao ainda protege a funcao, mas CORS aberto aumenta superficie e facilita abuso caso um token seja roubado.

**Impacto:** qualquer origem pode tentar chamar a funcao com um token valido.

**Correcao recomendada:**

- Restringir `Access-Control-Allow-Origin` aos dominios oficiais.
- Validar `Origin` no runtime.
- Retornar CORS apenas para origens permitidas.

### Medio - Erros internos expostos no frontend

**Arquivos relacionados:** `supabaseScripts/finalizar_venda.ts`, paginas React com `toast.error(error.message)`

Varias telas exibem diretamente `error.message` retornado pelo Supabase. Em alguns casos isso pode revelar nomes de tabelas, constraints, policies ou detalhes do schema.

**Impacto:** vazamento de informacao util para enumeracao e ataque.

**Correcao recomendada:**

- Mapear erros conhecidos para mensagens amigaveis.
- Registrar detalhes tecnicos em log interno.
- Evitar expor mensagens cruas de banco ao usuario final.

### Medio - Ausencia de security headers documentados no deploy

**Arquivos relacionados:** configuracao de deploy nao localizada no repositorio

Como a aplicacao persiste sessao em `localStorage`, headers como CSP, HSTS, X-Frame-Options/frame-ancestors e Referrer-Policy sao importantes. Nao foi localizado arquivo de configuracao de deploy com essas protecoes.

**Impacto:** maior impacto em caso de XSS, clickjacking ou carregamento de scripts indevidos.

**Correcao recomendada:**

- Configurar `Content-Security-Policy` restritiva.
- Configurar `Strict-Transport-Security`.
- Configurar `X-Content-Type-Options: nosniff`.
- Usar `frame-ancestors 'none'` ou politica equivalente.
- Revisar dominios necessarios para Supabase e assets.

### Baixo/Medio - `dangerouslySetInnerHTML` em componente de grafico

**Arquivo relacionado:** `src/components/ui/chart.tsx`

O componente injeta CSS via `dangerouslySetInnerHTML` usando `DOMPurify.sanitize`. O risco atual parece baixo porque as cores/configuracoes parecem internas, mas `DOMPurify` nao substitui validacao de CSS.

**Impacto:** XSS/CSS injection se algum dia `config` vier de entrada de usuario ou banco sem validacao.

**Correcao recomendada:**

- Validar cores por allowlist/regex (`#rgb`, `#rrggbb`, `hsl(...)` controlado, tokens CSS conhecidos).
- Validar chaves usadas em `--color-${key}`.
- Manter `ChartConfig` fora de entrada de usuario.

### Baixo/Medio - Qualidade de tipos reduz confiabilidade em fluxos sensiveis

**Arquivos relacionados:** varias paginas React e `supabaseScripts/finalizar_venda.ts`

`npm.cmd run lint` retornou 73 erros e 16 avisos. A maioria esta relacionada a `any` e dependencias de hooks.

**Impacto:** nao e vulnerabilidade exploravel por si so, mas aumenta chance de bugs em validacao, permissao, estoque e dinheiro.

**Correcao recomendada:**

- Tipar entidades principais: `Produto`, `MateriaPrima`, `Cardapio`, `Venda`, `Pedido`, `Gasto`.
- Remover `any` dos fluxos de venda, custo e permissao.
- Corrigir warnings de hooks para evitar estado obsoleto.

## Verificacoes Realizadas

- `npm.cmd audit --json`: 0 vulnerabilidades conhecidas em 606 dependencias.
- `npm.cmd run lint`: 73 erros e 16 avisos.
- Busca por segredos: `.env` contem apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`; `.env` esta presente no `.gitignore`.
- Semgrep nao estava instalado no ambiente, entao a revisao SAST foi manual, guiada pelas skills locais de auditoria.

## Checklist de Remediacao Prioritaria

- [ ] Bloquear update de `profiles.id_empresa` por usuarios comuns.
- [ ] Remover `GRANT EXECUTE` direto de `processar_venda_atomica` para `authenticated`, ou fazer a RPC derivar empresa via `auth.uid()`.
- [ ] Validar `type`, existencia e ownership de todos os itens dentro da RPC de venda.
- [ ] Fazer decremento de estoque com `WHERE quantidade >= ...` e checar `ROW_COUNT`.
- [ ] Separar RLS por acao (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) e por role.
- [ ] Ajustar policy de `Empresa` para update apenas por admin.
- [ ] Alinhar regra de `Gastos` entre frontend e RLS.
- [ ] Reforcar `.eq("id_empresa", empresaId)` em operacoes client-side sensiveis.
- [ ] Validar payload da Edge Function com schema estrito.
- [ ] Restringir CORS da Edge Function.
- [ ] Padronizar mensagens de erro para nao expor detalhes internos.
- [ ] Definir security headers no deploy, especialmente CSP.
- [ ] Corrigir lint nos fluxos de dominio sensivel.

## Prioridade Recomendada

1. Corrigir `profiles.id_empresa`, RPC de venda e baixa de estoque.
2. Consolidar RLS com roles no banco.
3. Reforcar validacoes da Edge Function e filtros `id_empresa` no frontend.
4. Aplicar hardening de deploy, erros e tipagem.
