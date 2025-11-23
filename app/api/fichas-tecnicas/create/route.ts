import { NextResponse } from 'next/server';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required on server');
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function tryInsertFicha(rows: any[]) {
  // Tenta inserir e, em caso de erro de duplicate key, retorna o erro para retry
  const { data, error } = await supabaseAdmin.from('fichas_tecnicas').insert(rows).select();
  return { data, error };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { produto_final_id, insumos, nome, preco_venda, rendimento, slug_base } = body;

    if (!produto_final_id || !Array.isArray(insumos)) {
      return NextResponse.json({ error: 'payload inválido' }, { status: 400 });
    }

    // Cria registros por insumo
    const slug = slug_base || `ft-${produto_final_id}`;
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidateSlug = attempt === 0 ? slug : `${slug}-${attempt}`;

      const rows = insumos
        .filter((i: any) => i.insumoId)
        .map((insumo: any, index: number) => ({
          produto_final_id,
          insumo_id: insumo.insumoId,
          quantidade: insumo.quantidade,
          unidade_medida: insumo.unidadeMedida,
          perda_padrao: insumo.perdaPadrao,
          rendimento_unidades: rendimento,
          ordem_producao: index + 1,
          versao: 1,
          ativo: true,
          created_by: null,
          nome: nome || null,
          slug: candidateSlug,
        }));

      const { data, error } = await tryInsertFicha(rows);
      if (!error) {
        // Atualizar preco_venda se informado
        if (preco_venda) {
          await supabaseAdmin
            .from('produtos_finais')
            .update({ preco_venda })
            .eq('id', produto_final_id);
        }
        return NextResponse.json({ data }, { status: 201 });
      }

      // Verifica se é erro de conflito (23505) e tenta novo slug
      const msg = (error as any).message || '';
      if (String(msg).includes('duplicate') || (error as any)?.code === '23505') {
        // tentar próximo sufixo
        continue;
      }

      // Erro inesperado
      console.error('Erro ao inserir ficha (admin):', error);
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }

    return NextResponse.json(
      { error: 'Não foi possível gerar slug único após várias tentativas' },
      { status: 500 }
    );
  } catch (err) {
    console.error('Erro no endpoint create ficha:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
