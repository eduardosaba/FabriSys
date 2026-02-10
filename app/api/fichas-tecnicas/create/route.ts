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
    const {
      produto_final_id,
      insumos,
      nome,
      preco_venda,
      rendimento,
      slug_base,
      created_by,
      organization_id,
    } = body;

    if (!produto_final_id || !Array.isArray(insumos)) {
      return NextResponse.json({ error: 'payload inválido' }, { status: 400 });
    }

    // Cria registros por insumo
    const slug = slug_base || `ft-${produto_final_id}`;
    const maxAttempts = 5;

    const attemptsInfo: Array<any> = [];
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidateSlug = attempt === 0 ? slug : `${slug}-${attempt}`;

      // Log temporário para depuração de geração de slug único
      console.log('[create/fichas] tentativa', attempt, 'slug_candidate=', candidateSlug);

      // Construir linhas garantindo `unidade_medida`.
      const rows: any[] = [];
      for (let index = 0; index < insumos.length; index++) {
        const insumo = insumos[index];
        if (!insumo || !insumo.insumoId) continue;

        let unidade = insumo.unidadeMedida ?? insumo.unidade_medida ?? null;

        // Se não foi fornecida, buscar na tabela `insumos` para evitar null constraint
        if (!unidade) {
          try {
            const { data: insumoRow, error: insumoErr } = await supabaseAdmin
              .from('insumos')
              .select('unidade_medida')
              .eq('id', insumo.insumoId)
              .limit(1)
              .maybeSingle();
            if (!insumoErr && insumoRow && (insumoRow as any).unidade_medida) {
              unidade = (insumoRow as any).unidade_medida;
            }
          } catch (e) {
            console.error('Erro ao buscar insumo para unidade_medida:', e);
          }
        }

        // Fallback seguro caso ainda seja nulo
        if (!unidade) unidade = 'un';

        rows.push({
          produto_final_id,
          insumo_id: insumo.insumoId,
          quantidade: insumo.quantidade,
          unidade_medida: unidade,
          perda_padrao: insumo.perdaPadrao,
          rendimento_unidades: rendimento,
          ordem_producao: index + 1,
          versao: 1,
          ativo: true,
          created_by: created_by ?? null,
          organization_id: organization_id ?? null,
          nome: nome || null,
          slug: candidateSlug,
        });
      }

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
      const code = (error as any)?.code;
      console.error('[create/fichas] erro insercao tentativa', attempt, 'msg=', msg, 'code=', code);
      attemptsInfo.push({ attempt, candidateSlug, msg, code });
      if (String(msg).includes('duplicate') || code === '23505') {
        // tentar próximo sufixo
        continue;
      }

      // Erro inesperado
      console.error('Erro ao inserir ficha (admin):', error);
      const errMsg = (error && (error as any).message) || String(error);
      const errCode = (error && (error as any).code) || undefined;
      return NextResponse.json({ error: errMsg, code: errCode }, { status: 500 });
    }

    return NextResponse.json(
      { error: 'Não foi possível gerar slug único após várias tentativas', attempts: attemptsInfo },
      { status: 500 }
    );
  } catch (err) {
    console.error('Erro no endpoint create ficha:', err);
    const errMsg = (err && (err as any).message) || String(err);
    const errCode = (err && (err as any).code) || undefined;
    return NextResponse.json({ error: errMsg, code: errCode }, { status: 500 });
  }
}
