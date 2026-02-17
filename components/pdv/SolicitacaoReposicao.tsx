'use client';

import { useState, useEffect, useRef } from 'react';
import { FLOAT_BTN_SIZE, loadFloatingPosition, saveFloatingPosition, saveFloatingPositionServer, loadFloatingPositionServer } from './floatingPosition';
import { supabase } from '@/lib/supabase';
import { BellRing, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { getOperationalContext } from '@/lib/operationalLocal';

export default function SolicitacaoReposicao({ localId }: { localId?: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [quantidade, setQuantidade] = useState<number>(10);
  const { profile } = useAuth();
  const [isDesktop, setIsDesktop] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const movedRef = useRef(0);

  useEffect(() => {
    if (isOpen && produtos.length === 0) {
      void (async () => {
        const { data } = await supabase
          .from('produtos_finais')
          .select('id, nome')
          .eq('ativo', true)
          .order('nome');
        setProdutos(data || []);
      })();
    }
  }, [isOpen, produtos.length]);

  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth >= 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    let mounted = true;
    (async () => {
      try {
        if (profile?.id) {
          const srv = await loadFloatingPositionServer(profile.id, 'floating:reposicao');
          if (srv && srv.x !== undefined && srv.y !== undefined) {
            if (mounted) setPosition(srv);
            return;
          }
        }
      } catch (e) {
        // ignore
      }

      try {
        const saved = loadFloatingPosition('floating:reposicao');
        if (saved) {
          if (mounted) setPosition(saved);
          return;
        }
      } catch (e) {
        // ignore
      }

      // default position: bottom-left (compute top from window height)
      const defaultBottom = 80; // keep above payment bar
      if (mounted) setPosition({ x: 16, y: Math.max(16, window.innerHeight - FLOAT_BTN_SIZE - defaultBottom) });
    })();
    return () => {
      mounted = false;
    };
  }, [isDesktop, profile?.id]);

  const solicitar = async (produtoId: string) => {
    setLoading(true);
    try {
      let effectiveLocal = localId ?? null;
      if (!effectiveLocal) {
        try {
          const ctx = await getOperationalContext(profile);
          effectiveLocal = ctx.caixa?.local_id ?? ctx.localId ?? null;
        } catch (e) {
          effectiveLocal = null;
        }
      }
      if (!effectiveLocal) throw new Error('Loja não identificada para solicitação');
      const { error } = await supabase.from('solicitacoes_reposicao').insert({
        local_id: effectiveLocal,
        produto_id: produtoId,
        status: 'pendente',
        urgencia: 'alta',
        created_at: new Date().toISOString(),
        observacao: `Quantidade solicitada: ${quantidade}`,
      });

      if (error) throw error;
      toast.success('Solicitação enviada para a fábrica!');
      setIsOpen(false);
    } catch {
      toast.error('Erro ao solicitar.');
    } finally {
      setLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDesktop) return;
    draggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: position?.x ?? 16,
      offsetY: position?.y ?? 16,
    };
    movedRef.current = 0;
    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const dx = ev.clientX - dragStartRef.current.x;
      const dy = ev.clientY - dragStartRef.current.y;
      const newX = dragStartRef.current.offsetX + dx;
      const newY = dragStartRef.current.offsetY + dy;
      // clamp to viewport
      const clampedX = Math.max(8, Math.min(newX, window.innerWidth - 56 - 8));
      const clampedY = Math.max(8, Math.min(newY, window.innerHeight - 56 - 8));
      setPosition({ x: clampedX, y: clampedY });
      movedRef.current = Math.hypot(dx, dy);
    };
    const onUp = () => {
      draggingRef.current = false;
      saveFloatingPosition('floating:reposicao', position);
      void saveFloatingPositionServer(profile?.id, 'floating:reposicao', position);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isDesktop) return;
    const t = e.touches[0];
    draggingRef.current = true;
    dragStartRef.current = {
      x: t.clientX,
      y: t.clientY,
      offsetX: position?.x ?? 16,
      offsetY: position?.y ?? 16,
    };
    movedRef.current = 0;
    const onMove = (ev: TouchEvent) => {
      if (!draggingRef.current) return;
      const touch = ev.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      const newX = dragStartRef.current.offsetX + dx;
      const newY = dragStartRef.current.offsetY + dy;
      const clampedX = Math.max(8, Math.min(newX, window.innerWidth - 56 - 8));
      const clampedY = Math.max(8, Math.min(newY, window.innerHeight - 56 - 8));
      setPosition({ x: clampedX, y: clampedY });
      movedRef.current = Math.hypot(dx, dy);
    };
    const onEnd = () => {
      draggingRef.current = false;
      try {
        if (position) localStorage.setItem('solicitacaoReposicaoPosition', JSON.stringify(position));
        void saveFloatingPositionServer(profile?.id, 'floating:reposicao', position);
      } catch (e) {}
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  };

  const handleClick = () => {
    // ignore click if it was a drag
    if (movedRef.current > 6) {
      movedRef.current = 0;
      return;
    }
    setIsOpen(true);
  };

  return (
    <>
      {isDesktop ? (
        <button
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={handleClick}
          style={position ? { left: position.x, top: position.y } : { left: 16 }}
          className="fixed bg-orange-600 text-white p-3 rounded-full shadow-lg hover:bg-orange-700 transition-all z-50 flex items-center gap-2 group"
          title="Pedir Reposição"
        >
          <BellRing size={24} />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-sm font-bold">
            Pedir Reposição
          </span>
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 md:bottom-4 left-4 bg-orange-600 text-white p-3 rounded-full shadow-lg hover:bg-orange-700 transition-all z-50 flex items-center gap-2 group"
          title="Pedir Reposição"
        >
          <BellRing size={24} />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-sm font-bold">
            Pedir Reposição
          </span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
            <div className="bg-orange-50 p-4 border-b border-orange-100 flex justify-between items-center">
              <h3 className="font-bold text-orange-800 flex items-center gap-2">
                <BellRing size={18} /> O que está faltando?
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
              <p className="text-xs text-slate-500 mb-2">
                Clique no produto para avisar a fábrica imediatamente.
              </p>

              <div className="mb-2">
                <label className="text-xs text-slate-500 mb-1 block">Quantidade padrão</label>
                <input
                  type="number"
                  min={1}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value || '1')))}
                  className="w-24 p-2 border rounded"
                />
              </div>

              {produtos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => solicitar(p.id)}
                  disabled={loading}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-colors flex justify-between items-center group"
                >
                  <span className="font-medium text-slate-700">{p.nome}</span>
                  <Send
                    size={16}
                    className="text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
