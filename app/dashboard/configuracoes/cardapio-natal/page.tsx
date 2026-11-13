'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Gift, Plus, Save, Trash2, Upload, ExternalLink, Database } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import AreasEditor from './AreasEditor';
import { converterParaWebp, formatarTamanho } from '@/lib/converter-midia';
import {
  PADRAO_PRODUTOS,
  TOTAL_PAGINAS,
  PAGINA_ASPECTO,
  pontoHotspot,
  paginaSrc,
  formatarPreco,
  type Hotspot,
  mesclarPaginas,
  CONFIG_PADRAO,
  type AreaMidia,
  type ConfigCardapio,
  type MidiaTipo,
  type PaginaCfg,
  type ProdutoCardapio,
} from '@/lib/cardapio-natal';

const TABELA = 'cardapio_natal_produtos';
const BUCKET = 'cardapio-natal';

const inputCls =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white';
const btnCls =
  'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50';

function slug(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Mensagem amigável: erro de coluna/tabela inexistente quase sempre é migração SQL não aplicada. */
function mensagemErroBanco(contexto: string, e: { message: string; code?: string }): string {
  const m = e.message.toLowerCase();
  const faltaEstrutura =
    m.includes('column') ||
    m.includes('schema cache') ||
    m.includes('does not exist') ||
    e.code === 'PGRST204' ||
    e.code === '42703';
  return faltaEstrutura
    ? `${contexto}: o banco ainda não tem as colunas novas. Rode as migrações SQL mais recentes (syslari/migrations) e tente de novo. Detalhe: ${e.message}`
    : `${contexto}: ${e.message}`;
}

export default function CardapioNatalAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [produtos, setProdutos] = useState<ProdutoCardapio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [semTabela, setSemTabela] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [pagina, setPagina] = useState(2);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sujo, setSujo] = useState(false);
  const [paginas, setPaginas] = useState<PaginaCfg[]>(mesclarPaginas([]));
  const [config, setConfig] = useState<ConfigCardapio>(CONFIG_PADRAO);
  const [subindo, setSubindo] = useState<string | null>(null);
  const [areasPagina, setAreasPagina] = useState<number | null>(null);

  const permitido = profile?.role === 'admin' || profile?.role === 'master';

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase.from(TABELA).select('*').order('ordem');
    if (error) {
      // tabela inexistente (migração não aplicada)
      setSemTabela(true);
      setProdutos([]);
    } else {
      setSemTabela(false);
      setProdutos((data ?? []) as ProdutoCardapio[]);
      if (data && data.length && !selId) setSelId((data[0] as ProdutoCardapio).id);
    }
    const pag = await supabase.from('cardapio_natal_paginas').select('*');
    if (!pag.error) setPaginas(mesclarPaginas(pag.data as Partial<PaginaCfg>[]));
    const cfg = await supabase
      .from('cardapio_natal_config')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();
    if (!cfg.error && cfg.data) {
      setConfig({
        intro_url: cfg.data.intro_url ?? null,
        outro_url: cfg.data.outro_url ?? null,
        fundo_url: cfg.data.fundo_url ?? null,
        fundo_mobile_url: cfg.data.fundo_mobile_url ?? null,
        og_image_url: cfg.data.og_image_url ?? null,
      });
    }
    setCarregando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (permitido) void carregar();
  }, [permitido, carregar]);

  const selecionado = useMemo(
    () => produtos.find((p) => p.id === selId) ?? null,
    [produtos, selId]
  );

  // Cada edição incrementa a versão: o salvamento só "limpa" o estado se nada mudou durante o envio
  const versao = useRef(0);

  const atualizar = (id: string, patch: Partial<ProdutoCardapio>) => {
    versao.current += 1;
    setProdutos((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setSujo(true);
  };

  const salvarTudo = async (automatico = false) => {
    const versaoEnviada = versao.current;
    setSalvando(true);
    const payload = produtos.map((p) => ({ ...p, updated_at: new Date().toISOString() }));
    const { error } = await supabase.from(TABELA).upsert(payload);
    setSalvando(false);
    if (error) return toast.error(`Erro ao salvar: ${error.message}`);
    if (versao.current === versaoEnviada) setSujo(false);
    if (!automatico) toast.success('Cardápio salvo! A página pública atualiza em até 1 minuto.');
  };

  // Salva sozinho ~1,5 s depois da última alteração (arrastar botões, preço, texto...)
  useEffect(() => {
    if (!sujo || salvando) return;
    const t = setTimeout(() => void salvarTudo(true), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sujo, salvando, produtos]);

  // Avisa se tentar sair com alterações ainda não salvas
  useEffect(() => {
    if (!sujo) return;
    const aviso = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [sujo]);

  const carregarPadrao = async () => {
    const { error } = await supabase.from(TABELA).upsert(PADRAO_PRODUTOS);
    if (error) return toast.error(`Erro: ${error.message}`);
    toast.success('Produtos do cardápio carregados.');
    await carregar();
  };

  const novoProduto = () => {
    const nome = window.prompt('Nome do novo produto:')?.trim();
    if (!nome) return;
    const id = `${slug(nome)}-${Date.now().toString(36)}`;
    const p: ProdutoCardapio = {
      id,
      nome,
      preco: null,
      descricao: null,
      mensagem_whatsapp: null,
      hotspots: [],
      midia_tipo: null,
      midia_url: null,
      poster_url: null,
      ativo: true,
      ordem: produtos.length + 1,
    };
    setProdutos((ps) => [...ps, p]);
    setSelId(id);
    setSujo(true);
  };

  const excluir = async (p: ProdutoCardapio) => {
    if (!window.confirm(`Excluir "${p.nome}"? Essa ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from(TABELA).delete().eq('id', p.id);
    if (error) return toast.error(error.message);
    setProdutos((ps) => ps.filter((x) => x.id !== p.id));
    setSelId(null);
    toast.success('Produto excluído.');
  };

  const enviarMidia = async (file: File) => {
    if (!selecionado) return;
    setEnviando(true);
    const r = await subir(file, selecionado.id, 25, ['imagem', 'gif', 'video'], {
      maxLargura: 1200,
    });
    setEnviando(false);
    if (!r) return;
    atualizar(selecionado.id, { midia_tipo: r.tipo, midia_url: r.url });
    toast.success('Mídia enviada. Clique em Salvar para publicar.');
  };

  const cfgPagina = paginas.find((p) => p.pagina === pagina);

  const tipoDoArquivo = (f: File): MidiaTipo | null =>
    f.type.startsWith('video/')
      ? 'video'
      : f.type === 'image/gif'
        ? 'gif'
        : f.type.startsWith('image/')
          ? 'imagem'
          : null;

  /**
   * Envia o arquivo ao bucket e devolve tipo + URL pública (ou null se recusado/erro).
   * Imagens (exceto GIF) são convertidas para WebP no navegador, preservando a transparência.
   */
  const subir = async (
    file: File,
    pasta: string,
    maxMB: number,
    aceitar: MidiaTipo[],
    opts: { maxLargura?: number; converter?: boolean } = {}
  ) => {
    const tipo = tipoDoArquivo(file);
    if (!tipo || !aceitar.includes(tipo)) {
      toast.error(`Arquivo não aceito aqui. Use: ${aceitar.join(', ')}.`);
      return null;
    }
    if (file.size > Math.max(maxMB, tipo === 'imagem' ? 40 : 0) * 1024 * 1024) {
      toast.error(`Arquivo acima do limite. Comprima antes de enviar.`);
      return null;
    }
    let arquivo = file;
    if (tipo === 'imagem' && opts.converter !== false) {
      const r = await converterParaWebp(file, opts.maxLargura ?? 1600);
      arquivo = r.file;
      if (r.convertido)
        toast.success(
          `Imagem convertida para WebP (${formatarTamanho(r.tamanhoOriginal)} → ${formatarTamanho(arquivo.size)})`
        );
    }
    if (arquivo.size > maxMB * 1024 * 1024) {
      toast.error(`Arquivo acima de ${maxMB} MB. Comprima antes de enviar.`);
      return null;
    }
    const ext = arquivo.name.split('.').pop()?.toLowerCase() ?? 'bin';
    const path = `${pasta}/${Date.now()}.${ext}`;
    const up = await supabase.storage
      .from(BUCKET)
      .upload(path, arquivo, { cacheControl: '31536000', upsert: false });
    if (up.error) {
      toast.error(`Falha no envio: ${up.error.message}`);
      return null;
    }
    return { tipo, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
  };

  /** Grava a lista de páginas (reindexando a ordem) e atualiza o estado. */
  const salvarPaginas = async (lista: PaginaCfg[]) => {
    const reindexada = lista.map((p, i) => ({ ...p, ordem: i + 1 }));
    const agora = new Date().toISOString();
    const { error } = await supabase
      .from('cardapio_natal_paginas')
      .upsert(reindexada.map((p) => ({ ...p, updated_at: agora })));
    if (error) {
      toast.error(mensagemErroBanco('Erro ao salvar páginas', error), { duration: 12000 });
      return false;
    }
    setPaginas(reindexada);
    return true;
  };

  const moverPagina = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= paginas.length) return;
    const l = [...paginas];
    [l[idx], l[j]] = [l[j], l[idx]];
    void salvarPaginas(l);
  };

  const alternarAtivoPagina = (idx: number) =>
    void salvarPaginas(paginas.map((p, i) => (i === idx ? { ...p, ativo: !p.ativo } : p)));

  const trocarMidiaPagina = async (idx: number, file: File) => {
    setSubindo(`pag-${paginas[idx].pagina}`);
    const r = await subir(file, 'paginas', 40, ['imagem', 'gif', 'video'], { maxLargura: 1080 });
    if (
      r &&
      (await salvarPaginas(
        paginas.map((p, i) => (i === idx ? { ...p, midia_tipo: r.tipo, midia_url: r.url } : p))
      ))
    )
      toast.success('Página atualizada. A página pública atualiza em até 1 minuto.');
    setSubindo(null);
  };

  const voltarOriginal = (idx: number) =>
    void salvarPaginas(
      paginas.map((p, i) => (i === idx ? { ...p, midia_tipo: null, midia_url: null } : p))
    );

  const removerPagina = async (idx: number) => {
    const p = paginas[idx];
    if (p.pagina <= TOTAL_PAGINAS) return;
    if (!window.confirm('Remover esta página nova do livro?')) return;
    const { error } = await supabase.from('cardapio_natal_paginas').delete().eq('pagina', p.pagina);
    if (error) return toast.error(error.message);
    await salvarPaginas(paginas.filter((_, i) => i !== idx));
    if (pagina === p.pagina) setPagina(paginas[0]?.pagina ?? 1);
  };

  const adicionarPagina = async (file: File) => {
    setSubindo('nova');
    const r = await subir(file, 'paginas', 40, ['imagem', 'gif', 'video'], { maxLargura: 1080 });
    if (r) {
      const chave = Math.max(TOTAL_PAGINAS, ...paginas.map((p) => p.pagina)) + 1;
      const nova: PaginaCfg = {
        pagina: chave,
        ordem: paginas.length + 1,
        ativo: true,
        midia_tipo: r.tipo,
        midia_url: r.url,
        repetir: true,
        overlay_url: null,
        areas: [],
      };
      if (await salvarPaginas([...paginas, nova])) {
        setPagina(chave);
        toast.success(
          'Página adicionada ao final do livro. Reordene com as setas e posicione os botões "+".'
        );
      }
    }
    setSubindo(null);
  };

  const alternarRepetir = (idx: number) =>
    void salvarPaginas(paginas.map((p, i) => (i === idx ? { ...p, repetir: !p.repetir } : p)));

  /** Camada transparente (PNG/WebP) por cima da mídia da página. */
  const trocarOverlay = async (idx: number, file: File) => {
    setSubindo(`ov-${paginas[idx].pagina}`);
    const r = await subir(file, 'overlays', 20, ['imagem'], { maxLargura: 1080 });
    if (
      r &&
      (await salvarPaginas(paginas.map((p, i) => (i === idx ? { ...p, overlay_url: r.url } : p))))
    )
      toast.success('Camada transparente aplicada.');
    setSubindo(null);
  };

  const removerOverlay = (idx: number) =>
    void salvarPaginas(paginas.map((p, i) => (i === idx ? { ...p, overlay_url: null } : p)));

  const salvarAreas = async (chave: number, areas: AreaMidia[]) => {
    const ok = await salvarPaginas(paginas.map((p) => (p.pagina === chave ? { ...p, areas } : p)));
    if (ok) toast.success('Áreas animadas salvas.');
    return ok;
  };

  const salvarConfig = async (patch: Partial<ConfigCardapio>) => {
    const novo = { ...config, ...patch };
    const { error } = await supabase.from('cardapio_natal_config').upsert({
      id: 'default',
      intro_url: novo.intro_url,
      outro_url: novo.outro_url,
      fundo_url: novo.fundo_url,
      // coluna criada pela migração 2026-11-13; só é enviada quando em uso
      ...(novo.fundo_mobile_url != null || 'fundo_mobile_url' in patch
        ? { fundo_mobile_url: novo.fundo_mobile_url }
        : {}),
      ...(novo.og_image_url != null || 'og_image_url' in patch
        ? { og_image_url: novo.og_image_url }
        : {}),
      updated_at: new Date().toISOString(),
    });
    if (error)
      return toast.error(mensagemErroBanco('Erro ao salvar a configuração', error), {
        duration: 12000,
      });
    setConfig(novo);
    toast.success('Configuração salva. A página pública atualiza em até 1 minuto.');
  };

  /** Redimensiona/recorta para 1200x630 (JPEG) — tamanho ideal e leve para a prévia do WhatsApp. */
  const prepararImagemCompartilhamento = (file: File): Promise<File> =>
    new Promise((ok, erro) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const W = 1200;
        const H = 630;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return erro(new Error('canvas indisponível'));
        const escala = Math.max(W / img.width, H / img.height); // "cover"
        const w = img.width * escala;
        const h = img.height * escala;
        ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(
          (b) =>
            b
              ? ok(new File([b], 'compartilhamento.jpg', { type: 'image/jpeg' }))
              : erro(new Error('falha ao converter')),
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => erro(new Error('imagem inválida'));
      img.src = url;
    });

  const enviarConfig = async (
    campo: keyof ConfigCardapio,
    file: File,
    aceitar: MidiaTipo[],
    maxMB: number
  ) => {
    setSubindo(campo);
    if (campo === 'og_image_url') {
      try {
        file = await prepararImagemCompartilhamento(file);
      } catch {
        toast.error('Não foi possível processar a imagem. Tente outro arquivo.');
        setSubindo(null);
        return;
      }
    }
    const r = await subir(file, 'config', maxMB, aceitar, {
      maxLargura: 1920,
      converter: campo !== 'og_image_url',
    });
    if (r) await salvarConfig({ [campo]: r.url });
    setSubindo(null);
  };

  const miniatura = (p: PaginaCfg, cls: string) =>
    p.midia_tipo === 'video' && p.midia_url ? (
      <video src={p.midia_url} muted playsInline preload="metadata" className={cls} />
    ) : (
      <img
        src={p.midia_url ?? (p.pagina <= TOTAL_PAGINAS ? paginaSrc(p.pagina) : '')}
        alt=""
        className={cls}
        draggable={false}
      />
    );

  // ---- Editor de hotspots -------------------------------------------------
  const areaRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    produtoId: string;
    idx: number;
    modo: 'mover' | 'redimensionar' | 'ponto';
    sx: number;
    sy: number;
    orig: Hotspot;
  } | null>(null);

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const area = areaRef.current;
    if (!d || !area) return;
    const r = area.getBoundingClientRect();
    const dx = ((e.clientX - d.sx) / r.width) * 100;
    const dy = ((e.clientY - d.sy) / r.height) * 100;
    const p = produtos.find((x) => x.id === d.produtoId);
    if (!p) return;
    const hs = p.hotspots.map((h, i) => {
      if (i !== d.idx) return h;
      if (d.modo === 'ponto') {
        const o = pontoHotspot(d.orig);
        return {
          ...h,
          px: clamp(o.px + dx, h.x, h.x + h.w),
          py: clamp(o.py + dy, h.y, h.y + h.h),
        };
      }
      if (d.modo === 'mover') {
        // move o retângulo junto com o ponto "+"
        const nx = clamp(d.orig.x + dx, 0, 100 - h.w);
        const ny = clamp(d.orig.y + dy, 0, 100 - h.h);
        const o = d.orig.px != null ? pontoHotspot(d.orig) : null;
        return {
          ...h,
          x: nx,
          y: ny,
          ...(o ? { px: o.px + (nx - d.orig.x), py: o.py + (ny - d.orig.y) } : {}),
        };
      }
      return {
        ...h,
        w: clamp(d.orig.w + dx, 3, 100 - h.x),
        h: clamp(d.orig.h + dy, 2, 100 - h.y),
      };
    });
    atualizar(p.id, { hotspots: hs });
  };

  const iniciarDrag = (
    e: React.PointerEvent,
    produtoId: string,
    idx: number,
    modo: 'mover' | 'redimensionar' | 'ponto'
  ) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = produtos.find((x) => x.id === produtoId);
    if (!p) return;
    setSelId(produtoId);
    drag.current = {
      produtoId,
      idx,
      modo,
      sx: e.clientX,
      sy: e.clientY,
      orig: { ...p.hotspots[idx] },
    };
  };

  const adicionarHotspot = () => {
    if (!selecionado) return;
    atualizar(selecionado.id, {
      hotspots: [...selecionado.hotspots, { pagina, x: 20, y: 40, w: 60, h: 12 }],
    });
  };

  const removerHotspot = (idx: number) => {
    if (!selecionado) return;
    atualizar(selecionado.id, { hotspots: selecionado.hotspots.filter((_, i) => i !== idx) });
  };

  if (authLoading) return <div className="p-6 text-gray-500">Carregando…</div>;
  if (!permitido)
    return <div className="p-6 text-gray-500">Acesso restrito a administradores.</div>;

  const hotspotsDaPagina = produtos.flatMap((p) =>
    p.hotspots.map((h, idx) => ({ p, h, idx })).filter((x) => x.h.pagina === pagina)
  );

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Cardápio de Natal"
        description="Edite produtos, preços, mídias e a posição dos botões sobre as páginas do flipbook."
        icon={Gift}
      >
        <a
          href="/cardapionatal"
          target="_blank"
          rel="noopener noreferrer"
          className={`${btnCls} border border-gray-300 text-gray-700 hover:bg-gray-200 dark:border-gray-600 dark:text-gray-200`}
        >
          <ExternalLink size={16} /> Ver página pública
        </a>
        <button
          type="button"
          onClick={() => void salvarTudo()}
          disabled={salvando || !sujo}
          className={`${btnCls} bg-red-700 text-white hover:bg-red-800`}
        >
          <Save size={16} /> {salvando ? 'Salvando…' : sujo ? 'Salvar agora' : 'Tudo salvo'}
        </button>
      </PageHeader>

      {carregando && <p className="text-sm text-gray-500">Carregando produtos…</p>}

      {semTabela && !carregando && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          A tabela <code>cardapio_natal_produtos</code> ainda não existe. Aplique a migração{' '}
          <code>syslari/migrations/2026-11-12_cardapio_natal.sql</code> no Supabase e recarregue.
          Enquanto isso, a página pública usa os dados padrão.
        </div>
      )}

      {!semTabela && !carregando && produtos.length === 0 && (
        <div className="rounded-md border border-gray-300 p-4 text-sm">
          <p className="mb-3">Nenhum produto cadastrado ainda.</p>
          <button
            type="button"
            onClick={carregarPadrao}
            className={`${btnCls} bg-red-700 text-white hover:bg-red-800`}
          >
            <Database size={16} /> Carregar produtos do PDF (24 itens)
          </button>
        </div>
      )}

      {!semTabela && !carregando && (
        <section className="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <div>
            <h2 className="text-base font-bold">Abertura, encerramento e fundo</h2>
            <p className="text-xs text-gray-500">
              Tudo opcional. O vídeo de abertura toca em tela cheia na 1ª visita (com botão
              “Pular”). O de encerramento abre quando o cliente tenta avançar além da última página.
              A imagem de fundo aparece atrás do livro.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {(
              [
                {
                  campo: 'intro_url',
                  titulo: 'Vídeo de abertura',
                  aceitar: ['video'] as MidiaTipo[],
                  mb: 60,
                  accept: 'video/mp4,video/webm',
                  video: true,
                },
                {
                  campo: 'outro_url',
                  titulo: 'Vídeo de encerramento',
                  aceitar: ['video'] as MidiaTipo[],
                  mb: 60,
                  accept: 'video/mp4,video/webm',
                  video: true,
                },
                {
                  campo: 'fundo_url',
                  titulo: 'Imagem de fundo (computador)',
                  aceitar: ['imagem'] as MidiaTipo[],
                  mb: 10,
                  accept: 'image/png,image/jpeg,image/webp',
                  video: false,
                  dica: 'JPG/PNG/WebP até 10 MB, em paisagem (1920×1080).',
                },
                {
                  campo: 'og_image_url',
                  titulo: 'Imagem ao compartilhar o link',
                  aceitar: ['imagem'] as MidiaTipo[],
                  mb: 10,
                  accept: 'image/png,image/jpeg,image/webp',
                  video: false,
                  dica: 'Aparece na prévia do link no WhatsApp. É recortada automaticamente para 1200×630. Se não enviar, usa a imagem padrão do cardápio.',
                },
                {
                  campo: 'fundo_mobile_url',
                  titulo: 'Imagem de fundo (celular)',
                  aceitar: ['imagem'] as MidiaTipo[],
                  mb: 10,
                  accept: 'image/png,image/jpeg,image/webp',
                  video: false,
                  dica: 'JPG/PNG/WebP até 10 MB, em retrato (1080×1920). Sem ela, o celular usa a do computador.',
                },
              ] as const
            ).map((c) => {
              const url = config[c.campo];
              return (
                <div
                  key={c.campo}
                  className="rounded-md border border-gray-200 p-2 text-sm dark:border-gray-700"
                >
                  <div className="mb-1 font-medium">{c.titulo}</div>
                  {url &&
                    (c.video ? (
                      <video
                        src={url}
                        muted
                        playsInline
                        controls
                        preload="metadata"
                        className="mb-2 max-h-40 w-full rounded bg-black"
                      />
                    ) : (
                      <img src={url} alt="" className="mb-2 max-h-40 w-full rounded object-cover" />
                    ))}
                  <div className="flex flex-wrap gap-2">
                    <label className={`${btnCls} cursor-pointer bg-gray-200 text-gray-800`}>
                      <Upload size={14} />{' '}
                      {subindo === c.campo ? 'Enviando…' : url ? 'Trocar' : 'Enviar'}
                      <input
                        type="file"
                        accept={c.accept}
                        className="hidden"
                        disabled={subindo !== null}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void enviarConfig(c.campo, f, c.aceitar, c.mb);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {url && (
                      <button
                        type="button"
                        className={`${btnCls} text-red-700`}
                        onClick={() => void salvarConfig({ [c.campo]: null })}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {'dica' in c
                      ? c.dica
                      : `MP4/WebM até ${c.mb} MB. Começa mudo; o cliente pode ativar o som.`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!semTabela && !carregando && (
        <section className="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <div>
            <h2 className="text-base font-bold">
              Páginas do livro ({paginas.filter((p) => p.ativo).length} ativas)
            </h2>
            <p className="text-xs text-gray-500">
              Reordene com as setas, desative, troque a arte por GIF/vídeo/imagem ou adicione
              páginas novas (formato 9:16, 1080×1920). Depois posicione os botões “+” dos produtos
              na página nova, no editor abaixo.
            </p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {paginas.map((p, i) => (
              <div
                key={p.pagina}
                className={`w-48 shrink-0 rounded-md border p-2 text-xs ${p.ativo ? 'border-gray-200 dark:border-gray-700' : 'opacity-50'} ${
                  p.pagina === pagina ? 'ring-2 ring-red-500' : ''
                }`}
              >
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => setPagina(p.pagina)}
                  title="Editar botões desta página"
                >
                  <div
                    className="relative overflow-hidden rounded bg-black"
                    style={{ aspectRatio: String(PAGINA_ASPECTO) }}
                  >
                    {miniatura(p, 'h-full w-full object-cover')}
                  </div>
                </button>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-semibold">
                    Pág. {i + 1}
                    {p.pagina > TOTAL_PAGINAS && (
                      <span className="ml-1 rounded bg-red-100 px-1 text-red-800">nova</span>
                    )}
                  </span>
                  <span className="text-gray-500">
                    {p.midia_tipo === 'video'
                      ? 'vídeo'
                      : p.midia_tipo === 'gif'
                        ? 'GIF'
                        : p.midia_url
                          ? 'imagem'
                          : 'PDF'}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded border px-1.5 py-0.5 disabled:opacity-30"
                    disabled={i === 0}
                    onClick={() => moverPagina(i, -1)}
                    aria-label="Mover para trás"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="rounded border px-1.5 py-0.5 disabled:opacity-30"
                    disabled={i === paginas.length - 1}
                    onClick={() => moverPagina(i, 1)}
                    aria-label="Mover para frente"
                  >
                    →
                  </button>
                  <label className="ml-auto flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={p.ativo}
                      onChange={() => alternarAtivoPagina(i)}
                    />{' '}
                    ativa
                  </label>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <label className="cursor-pointer rounded bg-gray-200 px-2 py-1 font-semibold text-gray-800">
                    {subindo === `pag-${p.pagina}` ? 'Enviando…' : 'Trocar mídia'}
                    <input
                      type="file"
                      accept="image/*,video/mp4,video/webm"
                      className="hidden"
                      disabled={subindo !== null}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void trocarMidiaPagina(i, f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {p.pagina <= TOTAL_PAGINAS && p.midia_url && (
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-red-700"
                      onClick={() => voltarOriginal(i)}
                    >
                      Voltar ao PDF
                    </button>
                  )}
                  <label
                    className="cursor-pointer rounded bg-gray-200 px-2 py-1 font-semibold text-gray-800"
                    title="PNG/WebP com fundo transparente, por cima do vídeo/imagem"
                  >
                    {subindo === `ov-${p.pagina}`
                      ? 'Enviando…'
                      : p.overlay_url
                        ? 'Trocar camada'
                        : 'Camada transparente'}
                    <input
                      type="file"
                      accept="image/png,image/webp"
                      className="hidden"
                      disabled={subindo !== null}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void trocarOverlay(i, f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {p.overlay_url && (
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-red-700"
                      onClick={() => removerOverlay(i)}
                    >
                      Remover camada
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded bg-gray-200 px-2 py-1 font-semibold text-gray-800"
                    onClick={() => setAreasPagina(p.pagina)}
                  >
                    Áreas animadas ({p.areas.length})
                  </button>
                  {p.midia_tipo === 'video' && (
                    <label className="flex w-full items-center gap-1">
                      <input
                        type="checkbox"
                        checked={p.repetir}
                        onChange={() => alternarRepetir(i)}
                      />{' '}
                      repetir em loop
                    </label>
                  )}
                  {p.pagina > TOTAL_PAGINAS && (
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-red-700"
                      onClick={() => void removerPagina(i)}
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            ))}
            <label
              className="flex w-48 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-gray-300 p-2 text-xs font-semibold text-gray-600"
              style={{ minHeight: 180 }}
            >
              <Plus size={20} />
              {subindo === 'nova' ? 'Enviando…' : 'Adicionar página'}
              <input
                type="file"
                accept="image/*,video/mp4,video/webm"
                className="hidden"
                disabled={subindo !== null}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void adicionarPagina(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </section>
      )}

      {areasPagina != null &&
        (() => {
          const pg = paginas.find((p) => p.pagina === areasPagina);
          if (!pg) return null;
          return (
            <AreasEditor
              key={pg.pagina}
              titulo={`Página ${paginas.findIndex((p) => p.pagina === pg.pagina) + 1}`}
              base={miniatura(pg, 'h-full w-full object-cover')}
              overlayUrl={pg.overlay_url}
              areas={pg.areas}
              onUpload={(f) =>
                subir(f, 'areas', 40, ['imagem', 'gif', 'video'], { maxLargura: 1080 })
              }
              onSalvar={(a) => salvarAreas(pg.pagina, a)}
              onFechar={() => setAreasPagina(null)}
            />
          );
        })()}

      {!semTabela && produtos.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr_360px]">
          {/* Lista */}
          <aside className="max-h-[75vh] overflow-auto rounded-md border border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white p-2 dark:bg-gray-900">
              <span className="text-sm font-semibold">{produtos.length} produtos</span>
              <button
                type="button"
                onClick={novoProduto}
                className={`${btnCls} bg-gray-200 py-1 text-gray-800`}
              >
                <Plus size={14} /> Novo
              </button>
            </div>
            <ul>
              {produtos.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelId(p.id);
                      if (p.hotspots[0]) setPagina(p.hotspots[0].pagina);
                    }}
                    className={`flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm ${
                      p.id === selId
                        ? 'bg-red-50 dark:bg-red-950'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    } ${p.ativo ? '' : 'opacity-50'}`}
                  >
                    <span className="truncate">{p.nome}</span>
                    <span className="shrink-0 text-xs text-gray-500">{formatarPreco(p.preco)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* Editor visual de hotspots */}
          <section className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-medium" htmlFor="pg">
                Página
              </label>
              <select
                id="pg"
                className={`${inputCls} w-28`}
                value={pagina}
                onChange={(e) => setPagina(Number(e.target.value))}
              >
                {paginas.map((p, i) => (
                  <option key={p.pagina} value={p.pagina}>
                    {i + 1}
                    {p.pagina > TOTAL_PAGINAS ? ' (nova)' : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={adicionarHotspot}
                disabled={!selecionado}
                className={`${btnCls} bg-gray-200 text-gray-800`}
              >
                <Plus size={14} /> Botão para “{selecionado?.nome.slice(0, 22) ?? '—'}” nesta página
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Arraste os retângulos para posicioná-los e o canto inferior direito para
              redimensionar. A bolinha amarela “+” é o botão que o cliente vê: arraste-a para um
              lugar que não cubra textos. O produto selecionado fica em vermelho.
            </p>
            <div
              ref={areaRef}
              className="relative mx-auto touch-none select-none overflow-hidden rounded-md border border-gray-300 bg-black"
              style={{ width: 'min(100%, 360px)', aspectRatio: String(PAGINA_ASPECTO) }}
              onPointerMove={onPointerMove}
              onPointerUp={() => (drag.current = null)}
            >
              {cfgPagina ? miniatura(cfgPagina, 'h-full w-full object-cover') : null}
              {cfgPagina?.overlay_url && (
                <img
                  src={cfgPagina.overlay_url}
                  alt=""
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                  draggable={false}
                />
              )}
              {hotspotsDaPagina.map(({ p, h, idx }) => {
                const ativo = p.id === selId;
                return (
                  <div
                    key={`${p.id}-${idx}`}
                    onPointerDown={(e) => iniciarDrag(e, p.id, idx, 'mover')}
                    className={`absolute cursor-move rounded-md border-2 ${
                      ativo
                        ? 'z-10 border-red-500 bg-red-500/25'
                        : 'border-yellow-300/80 bg-yellow-300/10'
                    }`}
                    style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.w}%`, height: `${h.h}%` }}
                    title={p.nome}
                  >
                    <span className="pointer-events-none absolute left-0 top-0 max-w-full truncate bg-black/70 px-1 text-[9px] leading-tight text-white">
                      {p.nome}
                    </span>
                    <span
                      onPointerDown={(e) => iniciarDrag(e, p.id, idx, 'ponto')}
                      title="Arraste para posicionar o botão +"
                      className="absolute z-20 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full bg-yellow-300 text-xs font-bold text-red-900 shadow ring-2 ring-white"
                      style={{
                        left: `${((pontoHotspot(h).px - h.x) / h.w) * 100}%`,
                        top: `${((pontoHotspot(h).py - h.y) / h.h) * 100}%`,
                      }}
                    >
                      +
                    </span>
                    <span
                      onPointerDown={(e) => iniciarDrag(e, p.id, idx, 'redimensionar')}
                      className="absolute -bottom-1 -right-1 h-3.5 w-3.5 cursor-nwse-resize rounded-sm bg-white ring-2 ring-red-500"
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Formulário do produto */}
          <section className="space-y-3">
            {!selecionado ? (
              <p className="text-sm text-gray-500">Selecione um produto.</p>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium">Nome</label>
                  <input
                    className={inputCls}
                    value={selecionado.nome}
                    onChange={(e) => atualizar(selecionado.id, { nome: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Preço (R$)</label>
                    <input
                      className={inputCls}
                      type="number"
                      step="0.01"
                      min="0"
                      value={selecionado.preco ?? ''}
                      onChange={(e) =>
                        atualizar(selecionado.id, {
                          preco: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      placeholder="Sob consulta"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Ordem</label>
                    <input
                      className={inputCls}
                      type="number"
                      value={selecionado.ordem}
                      onChange={(e) => atualizar(selecionado.id, { ordem: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Descrição (opcional)</label>
                  <textarea
                    className={inputCls}
                    rows={3}
                    value={selecionado.descricao ?? ''}
                    onChange={(e) =>
                      atualizar(selecionado.id, { descricao: e.target.value || null })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Mensagem do WhatsApp (opcional)
                  </label>
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={selecionado.mensagem_whatsapp ?? ''}
                    placeholder={`Olá! Quero encomendar o produto: ${selecionado.nome}.`}
                    onChange={(e) =>
                      atualizar(selecionado.id, { mensagem_whatsapp: e.target.value || null })
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Imagem / GIF / vídeo do produto
                  </label>
                  {selecionado.midia_url && selecionado.midia_tipo === 'video' && (
                    <video
                      src={selecionado.midia_url}
                      className="mb-2 max-h-48 w-full rounded-md bg-black"
                      controls
                      muted
                      playsInline
                    />
                  )}
                  {selecionado.midia_url && selecionado.midia_tipo !== 'video' && (
                    <img
                      src={selecionado.midia_url}
                      alt=""
                      className="mb-2 max-h-48 w-full rounded-md object-cover"
                    />
                  )}
                  <div className="flex flex-wrap gap-2">
                    <label className={`${btnCls} cursor-pointer bg-gray-200 text-gray-800`}>
                      <Upload size={14} />{' '}
                      {enviando
                        ? 'Enviando…'
                        : selecionado.midia_url
                          ? 'Trocar mídia'
                          : 'Enviar mídia'}
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm"
                        className="hidden"
                        disabled={enviando}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void enviarMidia(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {selecionado.midia_url && (
                      <button
                        type="button"
                        className={`${btnCls} text-red-700`}
                        onClick={() =>
                          atualizar(selecionado.id, {
                            midia_url: null,
                            midia_tipo: null,
                            poster_url: null,
                          })
                        }
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Vídeos: MP4/WebM curtos (até 25 MB), sem áudio.
                  </p>
                </div>

                <div>
                  <span className="mb-1 block text-sm font-medium">Botões nas páginas</span>
                  {selecionado.hotspots.length === 0 && (
                    <p className="text-xs text-gray-500">Nenhum botão posicionado.</p>
                  )}
                  <ul className="space-y-1">
                    {selecionado.hotspots.map((h, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between rounded border px-2 py-1 text-sm"
                      >
                        <button
                          type="button"
                          className="underline"
                          onClick={() => setPagina(h.pagina)}
                        >
                          Página {h.pagina}
                        </button>
                        <button
                          type="button"
                          onClick={() => removerHotspot(i)}
                          aria-label="Remover botão"
                        >
                          <Trash2 size={14} className="text-red-600" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selecionado.ativo}
                    onChange={(e) => atualizar(selecionado.id, { ativo: e.target.checked })}
                  />
                  Ativo (aparece no cardápio)
                </label>

                <button
                  type="button"
                  onClick={() => excluir(selecionado)}
                  className={`${btnCls} text-red-700`}
                >
                  <Trash2 size={14} /> Excluir produto
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
