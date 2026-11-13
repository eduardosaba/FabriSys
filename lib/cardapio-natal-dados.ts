import { createClient } from '@supabase/supabase-js';
import {
  CONFIG_PADRAO,
  PADRAO_PRODUTOS,
  mesclarPaginas,
  type ConfigCardapio,
  type PaginaCfg,
  type ProdutoCardapio,
} from '@/lib/cardapio-natal';

export interface DadosCardapio {
  produtos: ProdutoCardapio[];
  paginas: PaginaCfg[];
  config: ConfigCardapio;
}

/** Leitura pública (anon + RLS) no servidor. Cai nos dados padrão se o banco não responder. */
export async function carregarDados(): Promise<DadosCardapio> {
  const padrao: DadosCardapio = {
    produtos: PADRAO_PRODUTOS,
    paginas: mesclarPaginas([]),
    config: CONFIG_PADRAO,
  };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return padrao;
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const [prod, pag, cfg] = await Promise.all([
      supabase.from('cardapio_natal_produtos').select('*').eq('ativo', true).order('ordem'),
      supabase.from('cardapio_natal_paginas').select('*'),
      supabase.from('cardapio_natal_config').select('*').eq('id', 'default').maybeSingle(),
    ]);
    return {
      // Tabelas vazias ou com erro -> dados padrão
      produtos:
        prod.error || !prod.data?.length ? PADRAO_PRODUTOS : (prod.data as ProdutoCardapio[]),
      paginas: mesclarPaginas(pag.error ? [] : (pag.data as Partial<PaginaCfg>[])).filter(
        (p) => p.ativo
      ),
      config:
        cfg.error || !cfg.data
          ? CONFIG_PADRAO
          : {
              intro_url: cfg.data.intro_url ?? null,
              outro_url: cfg.data.outro_url ?? null,
              fundo_url: cfg.data.fundo_url ?? null,
              fundo_mobile_url: cfg.data.fundo_mobile_url ?? null,
              og_image_url: cfg.data.og_image_url ?? null,
            },
    };
  } catch {
    return padrao;
  }
}
