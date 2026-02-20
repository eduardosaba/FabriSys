'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';
import Loading from '@/components/ui/Loading';
import {
  WIDGET_REGISTRY as WIDGETS,
  DEFAULT_LAYOUT_BY_ROLE as DEFAULT_BY_ROLE,
} from '@/components/dashboard';
import { toast } from 'react-hot-toast';

const ROLES = Object.keys(DEFAULT_BY_ROLE);

// Converte o `defaultSize` do registro em um número de cols (1..3)
const defaultSizeToCols = (size: string | undefined) => {
  switch (size) {
    case '2x1':
    case '2x2':
      return 2;
    case '4x1':
      return 3;
    default:
      return 1;
  }
};

export default function ConfigDashboardTab() {
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // config: ordered list of widget ids per role
  const [config, setConfig] = useState<Record<string, string[]>>({});
  // widgetMeta: per-role per-widget settings (e.g., cols)
  const [widgetMeta, setWidgetMeta] = useState<Record<string, Record<string, number>>>({});
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSaved = useRef<string | null>(null);
  // NOVO: controla se o carregamento inicial já terminou
  const isLoaded = useRef(false);
  // controla modal de widgets faltando
  const [missingModalRole, setMissingModalRole] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('configuracoes_sistema')
          .select('valor')
          .eq('chave', 'dashboard_widgets')
          // Ajustado para buscar o da organização ou o global
          .or(`organization_id.eq.${profile?.organization_id},organization_id.is.null`)
          .order('organization_id', { ascending: false }) // Prioriza o da organização
          .limit(1)
          .maybeSingle();

        let parsed: any = {};
        if (data?.valor) {
          try {
            parsed = JSON.parse(data.valor);
          } catch (e) {
            void e;
          }
        }

        // support two formats: legacy { role: [ids] } or new { roles: { role: [ids] }, meta: { role: { id: { cols }}} }
        const rolesPart = parsed?.roles || parsed;
        const metaPart = parsed?.meta || {};

        const normalized: Record<string, string[]> = {};
        const normalizedMeta: Record<string, Record<string, number>> = {};

        ROLES.forEach((r) => {
          const rawList = Array.isArray(rolesPart[r]) ? rolesPart[r] : DEFAULT_BY_ROLE[r] || [];
          // remove possíveis duplicatas vindas do banco ou saves anteriores
          normalized[r] = Array.from(new Set(rawList));
          normalizedMeta[r] = metaPart[r] || {};
        });

        setConfig(normalized);
        setWidgetMeta(normalizedMeta);

        // Sincroniza o lastSaved para evitar save imediato
        const initialSerialized = JSON.stringify({ roles: normalized, meta: normalizedMeta });
        lastSaved.current = initialSerialized;
        isLoaded.current = true; // MARCA COMO CARREGADO
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar configuração do dashboard');
      } finally {
        setLoading(false);
      }
    }
    if (profile) void load();
  }, [profile]);

  const toggleWidget = (role: string, wid: string) => {
    setConfig((prev) => {
      const arr = prev[role] || [];
      if (arr.includes(wid)) return { ...prev, [role]: arr.filter((x) => x !== wid) };
      return { ...prev, [role]: [...arr, wid] };
    });
  };

  const setWidgetCols = (role: string, wid: string, cols: number) => {
    setWidgetMeta((prev) => ({ ...prev, [role]: { ...(prev[role] || {}), [wid]: cols } }));
  };

  // global drag end supports moving between roles and from the palette
  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const source = result.source;
    const destination = result.destination;
    const srcRole = source.droppableId.replace('droppable-', '');
    const destRole = destination.droppableId.replace('droppable-', '');
    // draggableId format: `${role}-${wid}` or `palette-${wid}`
    const draggedId = result.draggableId;
    const wid = draggedId.includes('-') ? draggedId.split('-').slice(1).join('-') : draggedId;

    const srcIndex = source.index;
    const destIndex = destination.index;

    setConfig((prev) => {
      const next = { ...prev } as Record<string, string[]>;

      // remove from source if it was a role (palette is persistent)
      if (srcRole !== 'palette') {
        const sourceList = Array.from(prev[srcRole] || []);
        sourceList.splice(srcIndex, 1);
        next[srcRole] = Array.from(new Set(sourceList));
      }

      // insert into destination if it's a role (ignore palette as destination)
      if (destRole !== 'palette') {
        const destList = Array.from(prev[destRole] || []);
        if (!destList.includes(wid)) {
          destList.splice(destIndex, 0, wid);
        }
        next[destRole] = Array.from(new Set(destList));
      }

      return next;
    });
  }, []);

  const handleSave = async () => {
    // Bloqueia se já estiver salvando ou se ainda não carregou
    if (saving || !isLoaded.current) return;

    setSaving(true);
    try {
      const payloadObj = { roles: config, meta: widgetMeta };
      const serialized = JSON.stringify(payloadObj);

      // Evita salvar se for identico ao último
      if (lastSaved.current === serialized) {
        setSaving(false);
        return;
      }

      const rpcPayload = {
        p_organization_id: profile?.organization_id || null,
        p_chave: 'dashboard_widgets',
        p_valor: payloadObj,
      };

      const { error } = await supabase.rpc('rpc_upsert_configuracoes_sistema', rpcPayload);
      if (error) throw error;

      lastSaved.current = serialized;
      console.log('Configuração salva automaticamente (RPC)');
    } catch (err: any) {
      console.error('Erro no autosave:', err.message);
    } finally {
      setSaving(false);
    }
  };

  // autosave with debounce
  // autosave corrigido: só dispara após o carregamento inicial
  useEffect(() => {
    if (!isLoaded.current) return; // Não salva se não terminou de carregar

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void handleSave();
    }, 2000); // 2 segundos de debounce para não sobrecarregar o banco

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [config, widgetMeta]);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">Configuração do Dashboard</h3>
      <p className="text-sm text-slate-500">
        Escolha quais widgets aparecem para cada tipo de usuário.
      </p>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Palette com todos os widgets disponíveis */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">Todos os widgets</h4>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                {Object.keys(WIDGETS).length}
              </span>
            </div>
            <Droppable droppableId={`droppable-palette`}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-2 max-h-64 overflow-auto transition-all ${snapshot.isDraggingOver ? 'border-2 border-dashed border-indigo-300 bg-indigo-50' : ''}`}
                >
                  {Object.keys(WIDGETS).map((wid, idx) => {
                    const meta = WIDGETS[wid];
                    return (
                      <Draggable key={wid} draggableId={`palette-${wid}`} index={idx}>
                        {(prov) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            className="flex items-center justify-between gap-2 p-2 rounded hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                {...prov.dragHandleProps}
                                className="cursor-grab p-1"
                                title="Arraste para adicionar a um perfil"
                              >
                                <GripVertical size={16} />
                              </div>
                              <span className="text-sm">{meta?.title || wid}</span>
                            </div>
                            <span className="text-xs text-slate-400">{wid}</span>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
            <div className="mt-3 text-xs text-slate-500">
              Arraste um widget para um perfil para adicioná-lo.
            </div>
          </div>

          {ROLES.map((role) => (
            <div key={role} className="bg-white p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{role}</h4>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                  {(config[role] || []).length}
                </span>
              </div>
              {/* Indica quais widgets ainda não foram adicionados a este perfil */}
              {(() => {
                const missingWidgets = Object.keys(WIDGETS).filter(
                  (w) => !(config[role] || []).includes(w)
                );
                if (missingWidgets.length === 0) return null;
                const preview = missingWidgets
                  .slice(0, 3)
                  .map((w) => WIDGETS[w]?.title || w)
                  .join(', ');
                const more = missingWidgets.length > 3 ? ` +${missingWidgets.length - 3}` : '';
                return (
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      onClick={() => setMissingModalRole(role)}
                      className="text-xs text-rose-600 underline"
                    >
                      Faltando: {preview}
                      {more}
                    </button>
                    <span className="text-xs text-slate-400">({missingWidgets.length})</span>
                  </div>
                );
              })()}
              <Droppable droppableId={`droppable-${role}`}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-[56px] max-h-64 overflow-auto transition-all ${snapshot.isDraggingOver ? 'border-2 border-dashed border-indigo-300 bg-indigo-50' : ''}`}
                  >
                    {(config[role] || []).length === 0 && (
                      <div
                        className={`py-4 text-center text-sm rounded transition-all ${snapshot.isDraggingOver ? 'text-indigo-700' : 'text-slate-400'} ${snapshot.isDraggingOver ? 'border border-dashed border-indigo-200' : 'border border-dashed border-slate-100'}`}
                      >
                        Solte widgets aqui
                      </div>
                    )}

                    {(config[role] || []).map((wid, idx) => {
                      const meta = WIDGETS[wid];
                      const defaultCols = meta?.defaultSize
                        ? defaultSizeToCols(meta.defaultSize)
                        : 1;
                      const colsVal = widgetMeta[role]?.[wid] ?? defaultCols;
                      return (
                        <Draggable key={wid} draggableId={`${role}-${wid}`} index={idx}>
                          {(prov) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              className="flex items-center justify-between gap-2 p-2 rounded hover:bg-slate-50"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  {...prov.dragHandleProps}
                                  className="cursor-grab p-1"
                                  title="Arraste para reordenar"
                                >
                                  <GripVertical size={16} />
                                </div>
                                <input
                                  type="checkbox"
                                  checked={true}
                                  onChange={() => toggleWidget(role, wid)}
                                />
                                <span className="text-sm">{meta?.title || wid}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <select
                                  value={String(colsVal)}
                                  onChange={(e) => setWidgetCols(role, wid, Number(e.target.value))}
                                  className="text-xs border rounded p-1 bg-white"
                                >
                                  <option value="1">1</option>
                                  <option value="2">2</option>
                                  <option value="3">3</option>
                                </select>
                                <span className="text-xs text-slate-400">{wid}</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <div className="mt-3 text-xs text-slate-500">
                Arraste para reordenar a visualização deste role. Use as checkboxes para
                ativar/desativar.
              </div>
            </div>
          ))}
        </div>
      </DragDropContext>

      <div className="pt-4 border-t border-slate-200 flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          Salvar Configuração
        </Button>
      </div>
      {/* Modal de widgets faltando */}
      {missingModalRole &&
        (() => {
          const missingWidgets = Object.keys(WIDGETS).filter(
            (w) => !(config[missingModalRole] || []).includes(w)
          );
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black opacity-50"
                onClick={() => setMissingModalRole(null)}
              />
              <div className="bg-white p-4 rounded shadow-lg max-w-lg w-full z-10">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">Widgets faltando — {missingModalRole}</h4>
                  <button
                    onClick={() => setMissingModalRole(null)}
                    className="text-sm text-slate-500"
                  >
                    Fechar
                  </button>
                </div>
                <ul className="space-y-2 max-h-64 overflow-auto">
                  {missingWidgets.map((w) => (
                    <li key={w} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{WIDGETS[w]?.title || w}</div>
                        <div className="text-xs text-slate-400">{w}</div>
                      </div>
                      <button
                        onClick={() => {
                          toggleWidget(missingModalRole, w);
                          setMissingModalRole(null);
                        }}
                        className="text-xs text-blue-600"
                      >
                        Adicionar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
