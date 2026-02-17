'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import Button from '@/components/Button';
import { useAuth } from '@/lib/auth';
import { Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AdminConfigModoPdv() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orgValue, setOrgValue] = useState<'padrao' | 'inventario' | ''>('');
  const [globalValue, setGlobalValue] = useState<'padrao' | 'inventario' | ''>('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // fetch org-specific
        if (profile?.organization_id) {
          const { data: cfgOrg } = await supabase
            .from('configuracoes_sistema')
            .select('valor')
            .eq('chave', 'modo_pdv')
            .eq('organization_id', profile.organization_id)
            .maybeSingle();
          if (cfgOrg && cfgOrg.valor) setOrgValue(cfgOrg.valor as any);
        }
        // global
        const { data: cfgGlobal } = await supabase
          .from('configuracoes_sistema')
          .select('valor')
          .eq('chave', 'modo_pdv')
          .is('organization_id', null)
          .maybeSingle();
        if (cfgGlobal && cfgGlobal.valor) setGlobalValue(cfgGlobal.valor as any);
      } catch (e) {
        console.error(e);
        toast.error('Erro ao carregar configurações');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [profile?.organization_id]);

  const saveOrg = async () => {
    if (!profile?.organization_id) return toast.error('Sem organização no perfil');
    if (!orgValue) return toast.error('Selecione um modo');
    setLoading(true);
    try {
      const rpcPayload = {
        p_organization_id: profile.organization_id,
        p_chave: 'modo_pdv',
        p_valor: orgValue,
      };
      const { error } = await supabase.rpc('rpc_upsert_configuracoes_sistema', rpcPayload);
      if (error) throw error;
      toast.success('Configuração salva (org)');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const saveGlobal = async () => {
    if (!globalValue) return toast.error('Selecione um modo');
    setLoading(true);
    try {
      const rpcPayload = {
        p_organization_id: null,
        p_chave: 'modo_pdv',
        p_valor: globalValue,
      };
      const { error } = await supabase.rpc('rpc_upsert_configuracoes_sistema', rpcPayload);
      if (error) throw error;
      toast.success('Configuração salva (global)');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar global');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="p-6">
      <PageHeader title="Configurações PDV" description="Editar modo PDV por organização ou global" icon={Settings} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold mb-2">Organização atual</h3>
          <p className="text-sm text-slate-500 mb-4">Configuração para sua organização (profile.organization_id)</p>
          <select value={orgValue} onChange={(e) => setOrgValue(e.target.value as any)} className="w-full p-2 border rounded mb-3">
            <option value="">-- Selecionar --</option>
            <option value="padrao">Padrão</option>
            <option value="inventario">Inventário</option>
          </select>
          <Button onClick={saveOrg}>Salvar (Organização)</Button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold mb-2">Global</h3>
          <p className="text-sm text-slate-500 mb-4">Configuração padrão global (quando não há config por organização)</p>
          <select value={globalValue} onChange={(e) => setGlobalValue(e.target.value as any)} className="w-full p-2 border rounded mb-3">
            <option value="">-- Selecionar --</option>
            <option value="padrao">Padrão</option>
            <option value="inventario">Inventário</option>
          </select>
          <Button onClick={saveGlobal}>Salvar (Global)</Button>
        </div>
      </div>
    </div>
  );
}
