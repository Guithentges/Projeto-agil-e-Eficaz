import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Extrair o JWT explicitamente do header de autorização
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token de autenticação ausente.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    const jwt = authHeader.replace('Bearer ', '')

    // 2. Criar cliente com a chave de serviço para verificar o usuário de forma confiável
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // 3. Verificar o JWT diretamente (sem depender do cliente autenticado)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt)
    if (userError || !user) {
      console.error('Auth error:', userError?.message)
      return new Response(JSON.stringify({ error: 'Usuário não autenticado.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // 4. Buscar empresa do usuário
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id_empresa')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.id_empresa) {
      console.error('Profile error:', profileError?.message)
      return new Response(JSON.stringify({ error: 'Empresa não vinculada ao usuário.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const empresaId = profile.id_empresa

    // 5. Parsear e validar o payload
    const payload = await req.json()
    const carrinho = payload.carrinho

    if (!Array.isArray(carrinho) || carrinho.length === 0) {
      return new Response(JSON.stringify({ error: 'Carrinho inválido ou vazio.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    for (const item of carrinho) {
      if (typeof item.id !== 'number' || typeof item.qtd !== 'number' || item.qtd <= 0) {
        return new Response(JSON.stringify({ error: 'Dados inválidos no carrinho.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
    }

    // 6. Chamar a RPC transacional atômica via admin (bypassa RLS interna da função)
    const { data: vendaId, error: rpcError } = await supabaseAdmin.rpc('processar_venda_atomica', {
      p_id_empresa: empresaId,
      p_carrinho: carrinho
    })

    if (rpcError) {
      console.error('RPC error:', rpcError.message)
      let msg = 'Erro interno ao processar a venda.'
      if (rpcError.message.includes('Estoque') || rpcError.message.includes('quantidade')) {
        msg = 'Estoque insuficiente para um ou mais itens.'
      } else if (rpcError.message.includes('invalida') || rpcError.message.includes('inválida')) {
        msg = 'Dados inválidos no carrinho.'
      }
      return new Response(JSON.stringify({ error: msg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    return new Response(JSON.stringify({ message: `Venda registrada com sucesso!`, vendaId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Unhandled exception:', error)
    return new Response(JSON.stringify({ error: 'Falha interna no servidor.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
