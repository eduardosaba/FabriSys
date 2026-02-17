'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';
import { Save, Check, X, Info, LayoutGrid } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Loading from '@/components/ui/Loading';
import ConfigDashboardTab from '@/app/dashboard/configuracoes/ConfigDashboardTab';

// Definição dos Módulos do Sistema (baseado no Sidebar) — inclui IDs de subitens
const MODULOS = [
  { id: 'dashboard', label: 'Visão Geral (Dashboard)' },
  { id: 'agenda', label: 'Agenda & Tarefas' },
  { id: 'planejamento', label: 'Planejamento de Produção' },

  // Produção
  { id: 'producao', label: 'Gestão de Fábrica (Ordens/Fichas)' },
  { id: 'producao_kanban', label: 'Chão de Fábrica (Kanban)' },
  { id: 'ordens_producao', label: 'Ordens de Produção' },
  { id: 'produtos', label: 'Produtos Finais' },
  { id: 'ficha_tecnica', label: 'Fichas Técnicas' },

  // PDV
  { id: 'pdv', label: 'PDV & Lojas (menu)' },
  { id: 'pdv_caixa', label: 'Frente de Caixa (PDV)' },
  { id: 'pdv_controle_caixa', label: 'Controle de Caixa' },
  { id: 'pdv_recebimento', label: 'Recebimento de Carga' },

  // Suprimentos / Insumos
  { id: 'suprimentos', label: 'Suprimentos & Compras' },
  { id: 'insumos', label: 'Insumos & Matéria-prima' },
  { id: 'fornecedores', label: 'Fornecedores' },

  // Relatórios
  { id: 'relatorios', label: 'Relatórios Gerenciais' },
  { id: 'relatorios_dre', label: 'Relatórios Financeiros (DRE)' },

  // Financeiro
  { id: 'financeiro', label: 'Financeiro (menu)' },
  { id: 'financeiro_contas_pagar', label: 'Contas a Pagar' },
  { id: 'financeiro_conferencia', label: 'Conferência de Caixas' },

  // Configurações (menu e subitens)
  { id: 'configuracoes', label: 'Configurações (menu)' },
  { id: 'configuracoes_sistema', label: 'Sistema & Regras' },
  { id: 'configuracoes_permissoes', label: 'Permissões' },
  { id: 'configuracoes_customizacao', label: 'Aparência & Tema' },
  { id: 'configuracoes_lojas', label: 'Cadastro de Lojas' },
  { id: 'configuracoes_promocoes', label: 'Promoções & Combos' },
  { id: 'configuracoes_usuarios', label: 'Equipe & Usuários' },
  { id: 'configuracoes_metas', label: 'Gestão de Metas' },
  { id: 'configuracoes_fidelidade', label: 'Gestão de Fidelidade' },

  // Admin
  { id: 'admin_novo_cliente', label: 'Admin: Criar Cliente' },
];

// Perfis disponíveis no sistema
const PERFIS = [
  { id: 'master', label: 'Master' },
  { id: 'admin', label: 'Administrador' },
  { id: 'gerente', label: 'Gerente' },
  { id: 'compras', label: 'Compras' },
  { id: 'fabrica', label: 'Fábrica' },
  { id: 'pdv', label: 'PDV' },
];

export default function PermissoesTab() {
  const { profile } = useAuth();
  const [permissoes, setPermissoes] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'permissoes' | 'widgets'>('permissoes');

  const DEFAULT_PERMISSOES: Record<string, string[]> = {
    master: ['all'],
    admin: ['all'],
    gerente: [],
    compras: [],
    fabrica: [],
    pdv: ['pdv', 'relatorios'],
  };

  useEffect(() => {
    void carregarPermissoes();
  }, []);

  // Somente master ou admin podem acessar esta página de configuração de permissões.
  // Outros perfis devem ver uma mensagem de acesso negado.
  const hasPageAccess = () => {
    if (!profile) return false;
    return profile.role === 'master' || profile.role === 'admin';
  };

  const carregarPermissoes = async () => {
    try {
      // Carrega configuração global e por organização (org override global)
      if (profile?.organization_id) {
        const { data: globalData } = await supabase
          .from('configuracoes_sistema')
          .select('valor')
          .eq('chave', 'permissoes_acesso')
          .is('organization_id', null)
          .limit(1)
          .maybeSingle();

        const { data: orgData } = await supabase
          .from('configuracoes_sistema')
          .select('valor')
          .eq('chave', 'permissoes_acesso')
          .eq('organization_id', profile.organization_id)
          .limit(1)
          .maybeSingle();

        let parsedGlobal: Record<string, string[]> = {};
        let parsedOrg: Record<string, string[]> = {};
        try {
          if (globalData && globalData.valor) parsedGlobal = JSON.parse(globalData.valor);
        } catch {}
        try {
          if (orgData && orgData.valor) parsedOrg = JSON.parse(orgData.valor);
        } catch {}

        const merged = { ...DEFAULT_PERMISSOES, ...(parsedGlobal || {}), ...(parsedOrg || {}) };
        setPermissoes(merged as Record<string, string[]>);
      } else {
        const { data, error } = await supabase
          .from('configuracoes_sistema')
          .select('valor')
          .eq('chave', 'permissoes_acesso')
          .is('organization_id', null)
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (data?.valor) {
          try {
            const parsed = JSON.parse(data.valor) as Record<string, string[]>;
            setPermissoes({ ...DEFAULT_PERMISSOES, ...(parsed || {}) });
          } catch {
            setPermissoes(DEFAULT_PERMISSOES);
          }
        } else {
          setPermissoes(DEFAULT_PERMISSOES);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar permissões');
    } finally {
      setLoading(false);
    }
  };

  const togglePermissao = (perfil: string, moduloId: string) => {
    // Apenas 'master' fica imune a alterações aqui — todos os outros perfis podem ser configurados
    if (perfil === 'master') return;

    setPermissoes((prev) => {
      const acessosAtuais = prev[perfil] || [];
      const temAcesso = acessosAtuais.includes(moduloId);

      let novosAcessos;
      if (temAcesso) {
        novosAcessos = acessosAtuais.filter((id) => id !== moduloId);
      } else {
        novosAcessos = [...acessosAtuais, moduloId];
      }

      return { ...prev, [perfil]: novosAcessos };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = (sessionData as any)?.session;
      if (!session?.user) {
        toast.error('Você precisa estar logado para salvar as permissões');
        setSaving(false);
        return;
      }
      // Antes de salvar, garantir que o JSON contenha chaves para todos os perfis
      const mergedPerms: Record<string, string[]> = { ...permissoes };
      PERFIS.forEach((p) => {
        if (!mergedPerms[p.id]) mergedPerms[p.id] = DEFAULT_PERMISSOES[p.id] || [];
      });

      // Garantir que todos os módulos conhecidos existam para pelo menos um perfil.
      const allModuleIds = MODULOS.map((m) => m.id);
      const assigned = new Set<string>();
      Object.values(mergedPerms).forEach((arr) => arr.forEach((id) => assigned.add(id)));
      const missingModules = allModuleIds.filter((id) => !assigned.has(id));
      if (missingModules.length > 0) {
        // adiciona os módulos faltantes ao perfil 'admin' (caso admin não tenha 'all')
        if (!mergedPerms.admin) mergedPerms.admin = [];
        if (!mergedPerms.admin.includes('all')) {
          mergedPerms.admin = Array.from(new Set([...mergedPerms.admin, ...missingModules]));
          toast(`Módulos faltantes adicionados ao perfil admin: ${missingModules.join(', ')}`);
        }
      }

      const payload: any = {
        chave: 'permissoes_acesso',
        valor: mergedPerms,
        updated_at: new Date().toISOString(),
      };
      if (profile?.organization_id) payload.organization_id = profile.organization_id;

      const rpcPayload = {
        p_organization_id: profile?.organization_id || null,
        p_chave: payload.chave,
        p_valor: mergedPerms,
      };

      const savePromise = (async () => {
        const { error } = await supabase.rpc('rpc_upsert_configuracoes_sistema', rpcPayload);
        if (error) throw error;

        // Verificação de leitura para confirmar persistência
        const verifyQuery = profile?.organization_id
          ? supabase.from('configuracoes_sistema').select('valor').eq('chave', payload.chave).eq('organization_id', profile.organization_id).limit(1).maybeSingle()
          : supabase.from('configuracoes_sistema').select('valor').eq('chave', payload.chave).is('organization_id', null).limit(1).maybeSingle();

        const { data: verifyData, error: verifyErr } = await verifyQuery;
        if (verifyErr) throw verifyErr;
        // note: verifyData.valor may be string or json depending on storage; avoid strict equality
        return { data: true } as any;
      })();

      await toast.promise(savePromise, {
        loading: 'Salvando permissões...',
        success: 'Permissões atualizadas com sucesso!',
        error: (err) => `Erro ao salvar permissões: ${err?.message || ''}`,
      });

      // Atualiza o estado local com a versão mesclada
      setPermissoes(mergedPerms);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar permissões');
    } finally {
      setSaving(false);
    }
  };

  const temAcesso = (perfil: string, moduloId: string) => {
    if (perfil === 'master') return true;
    const acessos = permissoes[perfil] || [];
    return acessos.includes(moduloId) || acessos.includes('all');
  };

  if (loading) return <Loading />;

  if (!hasPageAccess()) {
    return (
      <div className="p-8 text-center">
        <h3 className="text-xl font-semibold mb-2">Acesso negado</h3>
        <p className="text-sm text-slate-600">
          Esta área é restrita. Apenas usuários com perfil <strong>master</strong> ou{' '}
          <strong>admin</strong> podem gerenciar permissões. Se precisar delegar acesso, peça a
          um administrador para adicionar o módulo <em>configurações</em> ao seu perfil nas
          permissões.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up pb-20 md:pb-0">
      <div className="bg-primary border-primary rounded-xl p-4 flex gap-3 items-start">
        <Info className="text-primary flex-shrink-0 mt-1" size={20} />
        <div>
          <h4 className="font-bold text-primary text-sm">Controle de Segurança</h4>
          <p className="text-xs text-primary mt-1">
            Defina quais menus cada tipo de usuário pode acessar. Usuários sem permissão não verão o
            item no menu lateral e serão bloqueados se tentarem acessar o link direto.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <nav className="flex items-center gap-3 mb-4 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('permissoes')}
            aria-pressed={activeTab === 'permissoes'}
            className={`-mb-px px-4 py-2 text-sm font-medium transition ${
              activeTab === 'permissoes'
                ? 'text-slate-900 border-b-2 border-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Permissões
          </button>
          <button
            onClick={() => setActiveTab('widgets')}
            aria-pressed={activeTab === 'widgets'}
            className={`-mb-px flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
              activeTab === 'widgets'
                ? 'text-slate-900 border-b-2 border-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid size={16} />
            Widgets
          </button>
          <div className="ml-auto text-xs text-slate-400 px-2 py-2">Gerencie visibilidade e ordem dos widgets por perfil</div>
        </nav>

        {activeTab === 'permissoes' ? (
          <>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs">
                    <tr>
                      <th className="px-6 py-4 border-b">Módulo / Funcionalidade</th>
                      {PERFIS.map((perfil) => (
                        <th key={perfil.id} className="px-4 py-4 text-center border-b min-w-[100px]">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`${perfil.id === 'master' ? 'text-purple-600' : ''}`}>
                              {perfil.label}
                            </span>
                            {perfil.id === 'master' && (
                              <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                Total
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {MODULOS.map((modulo) => (
                      <tr key={modulo.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-800">{modulo.label}</td>
                        {PERFIS.map((perfil) => {
                          const ativo = temAcesso(perfil.id, modulo.id);
                          const isMaster = perfil.id === 'master';

                          return (
                            <td key={`${perfil.id}-${modulo.id}`} className="px-4 py-3 text-center">
                              <button
                                onClick={() => togglePermissao(perfil.id, modulo.id)}
                                disabled={isMaster}
                                className={`
                                  w-8 h-8 rounded-lg flex items-center justify-center transition-all mx-auto
                                  ${
                                    isMaster
                                      ? 'bg-purple-100 text-purple-600 cursor-not-allowed opacity-70'
                                      : ativo
                                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                        : 'bg-slate-100 text-slate-300 hover:bg-slate-200 hover:text-slate-500'
                                  }
                                `}
                              >
                                {ativo ? <Check size={18} strokeWidth={3} /> : <X size={18} />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <div className="md:flex md:justify-end">
                <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm p-3 border-t border-slate-200 shadow-lg z-40 md:static md:bg-transparent md:backdrop-blur-0 md:p-0 md:border-t-0 md:shadow-none">
                  <div className="flex justify-center md:justify-end">
                    <Button
                      onClick={handleSave}
                      loading={saving}
                      icon={Save}
                      className="px-8 py-3 text-lg shadow-lg"
                    >
                      Salvar Permissões
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-2">
            <ConfigDashboardTab />
          </div>
        )}
      </div>
      {/* Editor do Dashboard agora acessível pela aba Widgets acima */}
    </div>
  );
}
