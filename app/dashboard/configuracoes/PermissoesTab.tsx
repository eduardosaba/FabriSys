'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';
import { Save, Check, X, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Loading from '@/components/ui/Loading';

// Definição dos Módulos do Sistema (Baseado no Sidebar)
const MODULOS = [
  { id: 'dashboard', label: 'Visão Geral (Dashboard)' },
  { id: 'agenda', label: 'Agenda & Tarefas' },
  { id: 'planejamento', label: 'Planejamento de Produção' },
  { id: 'producao', label: 'Gestão de Fábrica (Ordens/Fichas)' },
  { id: 'producao_kanban', label: 'Chão de Fábrica (Apenas Kanban)' },
  { id: 'pdv', label: 'Frente de Caixa (PDV)' },
  { id: 'suprimentos', label: 'Suprimentos & Compras' },
  { id: 'relatorios', label: 'Relatórios Gerenciais' },
  { id: 'configuracoes', label: 'Configurações do Sistema' },
];

// Perfis disponíveis no sistema
const PERFIS = [
  { id: 'admin', label: 'Administrador' },
  { id: 'gerente', label: 'Gerente' },
  { id: 'caixa', label: 'Operador de Caixa' },
  { id: 'cozinha', label: 'Cozinheiro / Produção' },
  { id: 'estoque', label: 'Estoquista / Compras' },
];

export default function PermissoesTab() {
  const [permissoes, setPermissoes] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void carregarPermissoes();
  }, []);

  const carregarPermissoes = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', 'permissoes_acesso')
        .maybeSingle();

      if (error) throw error;

      if (data?.valor) {
        try {
          const parsed = JSON.parse(data.valor) as Record<string, string[]>;
          setPermissoes(parsed);
        } catch {
          setPermissoes({});
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
    if (perfil === 'admin') return; // Admin sempre tem tudo

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
      const { error } = await supabase.from('configuracoes_sistema').upsert({
        chave: 'permissoes_acesso',
        valor: JSON.stringify(permissoes),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast.success('Permissões atualizadas com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar permissões');
    } finally {
      setSaving(false);
    }
  };

  const temAcesso = (perfil: string, moduloId: string) => {
    if (perfil === 'admin') return true;
    const acessos = permissoes[perfil] || [];
    return acessos.includes(moduloId) || acessos.includes('all');
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 items-start">
        <Info className="text-blue-600 flex-shrink-0 mt-1" size={20} />
        <div>
          <h4 className="font-bold text-blue-800 text-sm">Controle de Segurança</h4>
          <p className="text-xs text-blue-700 mt-1">
            Defina quais menus cada tipo de usuário pode acessar. Usuários sem permissão não verão o
            item no menu lateral e serão bloqueados se tentarem acessar o link direto.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-4 border-b">Módulo / Funcionalidade</th>
                {PERFIS.map((perfil) => (
                  <th key={perfil.id} className="px-4 py-4 text-center border-b min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`${perfil.id === 'admin' ? 'text-purple-600' : ''}`}>
                        {perfil.label}
                      </span>
                      {perfil.id === 'admin' && (
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
                    const isAdmin = perfil.id === 'admin';

                    return (
                      <td key={`${perfil.id}-${modulo.id}`} className="px-4 py-3 text-center">
                        <button
                          onClick={() => togglePermissao(perfil.id, modulo.id)}
                          disabled={isAdmin}
                          className={`
                            w-8 h-8 rounded-lg flex items-center justify-center transition-all mx-auto
                            ${
                              isAdmin
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

      <div className="flex justify-end pt-4 border-t border-slate-200">
        <Button
          onClick={handleSave}
          loading={saving}
          icon={Save}
          className="px-8 py-3 text-lg shadow-lg shadow-blue-200"
        >
          Salvar Permissões
        </Button>
      </div>
    </div>
  );
}
