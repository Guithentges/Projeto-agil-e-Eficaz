# SalesHub / Vendas Pro

![Open Source](https://img.shields.io/badge/Open%20Source-Sim-22c55e?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Em%20desenvolvimento-f59e0b?style=for-the-badge)

> Uma aplicação web open source para pequenos negócios gerenciarem vendas, produtos, cardápio, PDV, pedidos de cozinha, custos, empresa e integração com Telegram em um único fluxo operacional.

O **SalesHub / Vendas Pro** foi pensado para operações de alimentação e vendas que precisam sair das planilhas e centralizar o processo comercial: do cadastro de insumos até a venda finalizada e entregue.

<!-- Adicione aqui um screenshot do dashboard -->

---

## Sumário

- [Visão geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Fluxo de uso](#fluxo-de-uso)
- [Tecnologias utilizadas](#tecnologias-utilizadas)
- [Como rodar localmente](#como-rodar-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Testes manuais realizados](#testes-manuais-realizados)
- [Status atual](#status-atual)
- [Roadmap](#roadmap)
- [Problemas conhecidos](#problemas-conhecidos)
- [Segurança](#segurança)
- [Como contribuir](#como-contribuir)
- [Licença](#licença)
- [Créditos e mantenedores](#créditos-e-mantenedores)

---

## Visão geral

O SalesHub / Vendas Pro é uma plataforma de gestão para pequenos negócios, especialmente lanchonetes, hamburguerias, restaurantes compactos, cozinhas artesanais e operações de venda que precisam controlar produtos, receitas, cardápio e pedidos.

A aplicação organiza o fluxo em módulos claros:

- **Empresa**: cadastro e configurações básicas do negócio.
- **Categorias**: organização de produtos, insumos e itens.
- **Matérias-primas**: controle de ingredientes e unidades de medida.
- **Molhos e receitas auxiliares**: preparos intermediários usados em produtos.
- **Produtos**: cadastro de itens de revenda ou itens com receita, custo e margem.
- **Cardápio**: montagem dos itens disponíveis para venda.
- **PDV**: venda rápida com carrinho e totalização.
- **Pedidos / Cozinha**: fila operacional para preparo e entrega.
- **Histórico**: acompanhamento de pedidos entregues.
- **Telegram**: controle de chats autorizados para integrações.

---

## Funcionalidades

### 🔐 Autenticação e acesso

- Tela de autenticação em `/auth`.
- Cadastro e login de usuários.
- Redirecionamento para o painel após autenticação.
- Rotas protegidas por perfil de acesso.

### 🧾 Cadastros operacionais

- Cadastro, listagem e exclusão de categorias.
- Cadastro de matérias-primas com unidades como unidade, gramas e kg.
- Cadastro de produtos de revenda.
- Cadastro de produtos com receita.
- Cadastro de molhos e receitas auxiliares.
- Cadastro e edição de informações da empresa.

### 💰 Custos, preço e margem

- Cálculo automático de custo.
- Exibição de preço de venda.
- Exibição de margem.
- Separação entre matéria-prima, molho, produto e item de cardápio.

### 🛒 Cardápio e PDV

- Montagem de itens de cardápio a partir de produtos.
- Exibição de preço, custo e margem no cardápio.
- Listagem de itens disponíveis no PDV.
- Adição de itens ao carrinho.
- Cálculo do total da venda.
- Customização de itens.
- Finalização de venda.

### 🍳 Cozinha e pedidos

- Criação de pedido após venda no PDV.
- Exibição do pedido na fila da cozinha.
- Visualização de ingredientes do pedido.
- Marcação de pedido como entregue.
- Histórico de vendas entregues com total.

### 💬 Telegram

- Cadastro de IDs de chats autorizados.
- Listagem de autorizações.
- Remoção de chats autorizados.

---

## Fluxo de uso

Fluxo principal validado manualmente:

```text
Cadastro de insumos
  -> Criação de produto
  -> Cadastro no cardápio
  -> Venda no PDV
  -> Pedido na cozinha
  -> Marcar como entregue
  -> Histórico de vendas
```

Esse fluxo cobre o caminho central da aplicação: estruturar custos, disponibilizar produtos para venda, vender, preparar e registrar a entrega.

---

## Tecnologias utilizadas

As tecnologias abaixo foram identificadas a partir do `package.json` e dos arquivos de configuração do projeto.

### Frontend

- **React 18**
- **TypeScript**
- **Vite 7**
- **React Router DOM**
- **TanStack React Query**
- **Tailwind CSS**
- **shadcn/ui**
- **Radix UI**
- **Lucide React**
- **Recharts**

### Formulários e validação

- **React Hook Form**
- **Zod**
- **@hookform/resolvers**

### Backend e dados

- **Supabase**
- **Supabase Auth**
- **PostgreSQL**
- Scripts SQL em `supabaseScripts/`

### Qualidade e testes

- **ESLint**
- **Vitest**
- **Testing Library**
- **jsdom**

---

## Como rodar localmente

> Requisitos sugeridos: Node.js instalado e acesso a um projeto Supabase configurado.

Clone o repositório:

```bash
git clone https://github.com/Guithentges/Projeto-agil-e-Eficaz.git
```

Acesse a pasta:

```bash
cd Projeto-agil-e-Eficaz
```

Instale as dependências:

```bash
npm install
```

Configure as variáveis de ambiente em um arquivo `.env.local` na raiz do projeto.

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Pela configuração atual do Vite, a aplicação roda em:

```text
http://localhost:8080
```

### Outros comandos disponíveis

```bash
npm run build
```

Gera a build de produção.

```bash
npm run preview
```

Executa uma prévia local da build.

```bash
npm run lint
```

Executa a verificação de lint.

```bash
npm run test
```

Executa os testes com Vitest.

```bash
npm run test:watch
```

Executa os testes em modo observação.

---

## Variáveis de ambiente

O projeto possui um arquivo `.env.example` com as variáveis esperadas para conexão com o Supabase. Para desenvolvimento local, crie um arquivo `.env.local` na raiz do projeto usando placeholders como no exemplo abaixo:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica-anon
```

> Nunca publique chaves sensíveis, tokens privados ou credenciais administrativas no repositório. A chave anônima do Supabase deve ser usada junto com políticas de segurança adequadas no banco.

---

## Estrutura do projeto

Resumo da estrutura principal:

```text
.
├── public/
│   ├── _headers
│   ├── _redirects
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── components/
│   │   └── ui/
│   ├── hooks/
│   ├── integrations/
│   │   └── supabase/
│   ├── lib/
│   ├── pages/
│   ├── test/
│   ├── App.tsx
│   └── main.tsx
├── supabaseScripts/
│   ├── *.sql
│   └── finalizar_venda.ts
├── package.json
├── vite.config.ts
├── vitest.config.ts
└── tailwind.config.ts
```

### Páginas principais

- `/auth`: autenticação.
- `/`: dashboard.
- `/pdv`: ponto de venda.
- `/pedidos`: cozinha e pedidos.
- `/cardapio`: itens do cardápio.
- `/produtos`: produtos e receitas.
- `/materias`: matérias-primas.
- `/molhos`: molhos e preparos auxiliares.
- `/estoque`: estoque.
- `/categorias`: categorias.
- `/gastos`: custos e gastos.
- `/empresa`: dados da empresa.
- `/telegram`: chats autorizados.
- `/ajuda`: suporte e orientações.

---

## Testes manuais realizados

### 1. Autenticação

- Tela `/auth` acessada com sucesso.
- Criação de conta de teste funcionando.
- Login/cadastro redirecionando para o painel.

### 2. Categorias

- Listagem de categorias padrão.
- Cadastro de novas categorias.
- Exclusão de categoria com atualização da lista.

### 3. Matéria-prima

- Cadastro de matérias-primas como Pão, Carne, Queijo e Alface.
- Uso de unidades como unidade, gramas e kg.
- Exclusão de matéria-prima sem vínculo funcionando.
- Tentativa de exclusão de matéria-prima vinculada exibindo alerta correto.
- Opção de apenas desvincular testada.

### 4. Produtos

- Cadastro de produto de revenda.
- Cadastro de produto com receita.
- Cálculo de venda, custo e margem.
- Modal de confirmação de exclusão de produto funcionando.

### 5. Molhos

- Cadastro de molho.
- Expansão do card de molho.
- Tentativa de vincular ingredientes.
- Necessidade identificada de melhorar a usabilidade do campo de quantidade.

### 6. Cardápio

- Cadastro do item "Hambúrguer Simples".
- Vinculação de produto ao item.
- Exibição de preço, custo e margem.

### 7. PDV

- Produto do cardápio aparece no PDV.
- Adição ao carrinho funcionando.
- Total calculado corretamente.
- Customização do item aberta.
- Venda finalizada.

### 8. Pedidos / Cozinha

- Venda aparece na fila da cozinha.
- Pedido mostra ingredientes.
- Pedido marcado como entregue.
- Histórico mostra venda entregue com total correto.

### 9. Empresa

- Atualização de descrição da empresa funcionando.
- Mensagem de sucesso exibida.

### 10. Telegram

- Cadastro de ID autorizado testado.
- Listagem de chat autorizado funcionando.
- Remoção de autorização funcionando.

---

## Status atual

O projeto está em **desenvolvimento ativo**.

Pontos fortes já observados:

- Interface dark moderna e consistente.
- Navegação lateral clara.
- Fluxo principal de venda completo funcionando.
- Separação bem definida entre matéria-prima, produto, cardápio, PDV e pedidos.
- Cálculo automático de custo e margem.
- Confirmações antes de exclusões importantes.
- Histórico de pedidos entregues.
- Integração Telegram com controle de chats autorizados.

---

## Roadmap

- Melhorar a usabilidade dos campos numéricos, principalmente quantidade em molhos.
- Padronizar entrada de valores monetários, aceitando vírgula e ponto.
- Adicionar validações mais claras para campos obrigatórios.
- Melhorar feedback após finalizar venda, por exemplo: "Venda criada com sucesso".
- Testar e validar dashboard após vendas/custos.
- Testar itens avulsos no PDV.
- Melhorar consistência de vínculos entre matérias-primas, molhos, produtos e cardápio.
- Revisar customização do item no PDV.
- Testar responsividade em mobile/tablet.
- Testar persistência após logout/login.
- Reforçar segurança e isolamento entre usuários/empresas.
- Validar regras no backend/banco, especialmente para estoque, permissões e RLS.

---

## Problemas conhecidos

- Campo de quantidade em Molhos difícil de preencher.
- Molho Especial apareceu com custo `R$ 0,00/g` mesmo após tentativas de vínculo.
- Customização no PDV apresentou comportamento inconsistente em um teste.
- Possível inconsistência após desvincular matéria-prima usada por produto.
- Finalização de venda poderia ter confirmação visual mais clara.

---

## Segurança

O projeto usa Supabase e possui scripts relacionados a RLS, constraints, triggers e endurecimento de segurança em `supabaseScripts/`.

Recomendações importantes:

- Manter **Row Level Security (RLS)** habilitado nas tabelas sensíveis.
- Validar permissões por usuário e empresa.
- Evitar exposição de credenciais privadas.
- Usar somente variáveis públicas do Vite com prefixo `VITE_` quando elas precisarem chegar ao frontend.
- Validar regras críticas também no backend/banco, não apenas na interface.
- Revisar isolamento entre empresas e usuários antes de uso em produção.

---

## Como contribuir

Contribuições são bem-vindas.

1. Faça um fork do projeto.
2. Crie uma branch para sua alteração:

```bash
git checkout -b feature/minha-melhoria
```

3. Implemente a melhoria ou correção.
4. Rode as verificações disponíveis:

```bash
npm run lint
npm run test
```

5. Envie sua branch:

```bash
git push origin feature/minha-melhoria
```

6. Abra um Pull Request descrevendo o que foi alterado, como testar e quais telas foram impactadas.

### Boas práticas para contribuidores

- Prefira alterações pequenas e bem descritas.
- Inclua evidências de teste quando possível.
- Não envie credenciais reais.
- Preserve o fluxo principal de venda.
- Documente mudanças que afetem banco, RLS ou regras de negócio.

---

## Licença

**Licença a definir.**

Não foi identificado um arquivo de licença na raiz do repositório no momento da escrita deste README.

---

## Créditos e mantenedores

Projeto desenvolvido e mantido pela equipe do **SalesHub / Vendas Pro**.

Mantenedores listados na documentação anterior do projeto:

- Daniel Suassuna
- Guilherme Hentges
- Kristyson Alpino
- Leandro Lima
- Pedro Victor Gomes

---

Feito para transformar a rotina de vendas em um processo mais claro, rastreável e eficiente.
