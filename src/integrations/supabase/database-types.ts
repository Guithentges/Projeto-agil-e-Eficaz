export type AppRole = "admin" | "gerente" | "operador";

export type Database = {
  public: {
    Tables: {
      Empresa: {
        Row: { id: number; created_at: string; Nome: string | null; descricao: string | null };
        Insert: { Nome?: string | null; descricao?: string | null };
        Update: { Nome?: string | null; descricao?: string | null };
      };
      idChatxidEmpresa: {
        Row: { id: number; created_at: string; id_chat: string; id_empresa: number };
        Insert: { id_chat: string; id_empresa: number };
        Update: { id_chat?: string; id_empresa?: number };
      };
      Categoria: {
        Row: { id: number; created_at: string; Nome: string; id_empresa: number | null };
        Insert: { Nome: string; id_empresa?: number | null };
        Update: { Nome?: string; id_empresa?: number | null };
      };
      MateriaPrima: {
        Row: { id: number; created_at: string; id_empresa: number | null; nome: string; Custo: number };
        Insert: { id_empresa?: number | null; nome: string; Custo: number };
        Update: { id_empresa?: number | null; nome?: string; Custo?: number };
      };
      Estoque: {
        Row: { id: number; created_at: string; id_materia: number | null; id_produto: number | null; quantidade: number | null; id_empresa: number | null };
        Insert: { id_materia?: number | null; id_produto?: number | null; quantidade?: number | null; id_empresa?: number | null };
        Update: { id_materia?: number | null; id_produto?: number | null; quantidade?: number | null; id_empresa?: number | null };
      };
      Produtos: {
        Row: { id: number; created_at: string; Nome: string; Preco_venda: number; Custo: number | null; id_empresa: number; is_unique: boolean };
        Insert: { Nome: string; Preco_venda: number; Custo?: number | null; id_empresa: number; is_unique?: boolean };
        Update: { Nome?: string; Preco_venda?: number; Custo?: number | null; id_empresa?: number; is_unique?: boolean };
      };
      ProduxMateria: {
        Row: { id: number; created_at: string; id_produto: number; id_materia: number; id_empresa: number; quantidade: number };
        Insert: { id_produto: number; id_materia: number; id_empresa: number; quantidade: number };
        Update: { id_produto?: number; id_materia?: number; id_empresa?: number; quantidade?: number };
      };
      Cardapio: {
        Row: { id: number; created_at: string; Nome: string; id_empresa: number | null; Valor: number | null };
        Insert: { Nome: string; id_empresa?: number | null; Valor?: number | null };
        Update: { Nome?: string; id_empresa?: number | null; Valor?: number | null };
      };
      ProduxCard: {
        Row: { id: number; created_at: string; id_produto: number | null; id_cardapio: number | null; id_empresa: number | null };
        Insert: { id_produto?: number | null; id_cardapio?: number | null; id_empresa?: number | null };
        Update: { id_produto?: number | null; id_cardapio?: number | null; id_empresa?: number | null };
      };
      Venda: {
        Row: { id: number; created_at: string; id_empresa: number | null };
        Insert: { id_empresa?: number | null };
        Update: { id_empresa?: number | null };
      };
      Pedido: {
        Row: { id: number; created_at: string; id_venda: number | null; id_cardapio: number | null; id_empresa: number | null };
        Insert: { id_venda?: number | null; id_cardapio?: number | null; id_empresa?: number | null };
        Update: { id_venda?: number | null; id_cardapio?: number | null; id_empresa?: number | null };
      };
      Gastos: {
        Row: { id: number; created_at: string; id_empresa: number; id_categoria: number; Valor: number; id_materia: number | null; id_produto: number | null; Fator: number | null };
        Insert: { id_empresa: number; id_categoria: number; Valor: number; id_materia?: number | null; id_produto?: number | null; Fator?: number | null };
        Update: { id_empresa?: number; id_categoria?: number; Valor?: number; id_materia?: number | null; id_produto?: number | null; Fator?: number | null };
      };
      profiles: {
        Row: { id: string; nome: string; id_empresa: number | null; created_at: string };
        Insert: { id: string; nome: string; id_empresa?: number | null };
        Update: { nome?: string; id_empresa?: number | null };
      };
      user_roles: {
        Row: { id: string; user_id: string; role: AppRole; created_at: string };
        Insert: { user_id: string; role: AppRole };
        Update: { role?: AppRole };
      };
    };
    Views: Record<string, never>;
    Functions: {
      has_role: { Args: { _user_id: string; _role: AppRole }; Returns: boolean };
      current_empresa_id: { Args: Record<string, never>; Returns: number };
    };
    Enums: { app_role: AppRole };
  };
};
