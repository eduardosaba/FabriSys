'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/Button';
import { Store, Plus, Trash2, Edit, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { Modal, InputField } from '@/components/ui/shared';

interface Local {
  id: string;
  nome: string;
  tipo: 'pdv' | 'fabrica' | 'deposito';
  logo_url?: string;
  ordem?: number;
  ativo: boolean;
}

export default function LojasPage() {
  const { profile, loading: authLoading } = useAuth();
  const confirmDialog = useConfirm();
  const [locais, setLocais] = useState<Local[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nome: '', tipo: 'pdv', logo_url: '', ordem: 0 });
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `pdv_${Date.now()}.${fileExt}`;

      let bucketName = 'pdvs';
      let filePath = fileName;

      let uploadResult = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { contentType: file.type || undefined, upsert: true });

      if (uploadResult.error) {
        bucketName = 'logos';
        filePath = `pdvs/${fileName}`;
        uploadResult = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, { contentType: file.type || undefined, upsert: true });
      }

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      if (data?.publicUrl) {
        setFormData((prev) => ({ ...prev, logo_url: data.publicUrl }));
        toast.success('Imagem enviada com sucesso!');
      }
    } catch (error: any) {
      console.error('Erro no upload da imagem:', error);
      toast.error(`Erro no upload: ${error?.message || 'Tente outro arquivo ou informe uma URL'}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const carregar = async () => {
    let { data, error } = await supabase.from('locais').select('*').order('ordem', { ascending: true }).order('nome');
    if (error && error.message?.includes('ordem')) {
      const res = await supabase.from('locais').select('*').order('nome');
      data = res.data;
    }
    setLocais(data || []);
  };

  useEffect(() => {
    void carregar();
  }, []);

  const handleSave = async () => {
    if (!formData.nome) return toast.error('Nome obrigatório');
    if (authLoading) return toast.error('Autenticação em andamento, aguarde.');
    if (!profile?.id) return toast.error('Perfil não definido. Faça login novamente.');
    setLoading(true);
    try {
      const savePromise = (async () => {
        const payloadData: Record<string, unknown> = {
          nome: formData.nome,
          tipo: formData.tipo,
          logo_url: formData.logo_url.trim() || null,
          ordem: Number(formData.ordem) || 0,
        };

        if (editingId) {
          let { error } = await supabase
            .from('locais')
            .update(payloadData)
            .eq('id', editingId);

          if (error && (error.message?.includes('logo_url') || error.message?.includes('ordem'))) {
            const cleanPayload = { ...payloadData };
            if (error.message?.includes('logo_url')) delete cleanPayload.logo_url;
            if (error.message?.includes('ordem')) delete cleanPayload.ordem;
            const res = await supabase.from('locais').update(cleanPayload).eq('id', editingId);
            error = res.error;
          }
          if (error) throw error;
          return 'updated';
        }

        const payload: Record<string, unknown> = {
          ...payloadData,
          created_by: profile.id,
        };
        if (profile.organization_id) payload.organization_id = profile.organization_id;

        let { error } = await supabase.from('locais').insert(payload);
        if (error && (error.message?.includes('logo_url') || error.message?.includes('ordem'))) {
          const cleanPayload = { ...payload };
          if (error.message?.includes('logo_url')) delete cleanPayload.logo_url;
          if (error.message?.includes('ordem')) delete cleanPayload.ordem;
          const res = await supabase.from('locais').insert(cleanPayload);
          error = res.error;
        }
        if (error) throw error;
        return 'created';
      })();

      await toast.promise(savePromise, {
        loading: editingId ? 'Atualizando loja...' : 'Cadastrando loja...',
        success: editingId ? 'Loja atualizada!' : 'Loja cadastrada!',
        error: (err) => `Erro: ${err?.message || ''}`,
      });

      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ nome: '', tipo: 'pdv', logo_url: '', ordem: 0 });
      void carregar();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (local: Local) => {
    setEditingId(local.id);
    setFormData({ nome: local.nome, tipo: local.tipo, logo_url: local.logo_url || '', ordem: local.ordem || 0 });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Excluir Loja',
      message: 'Deseja excluir esta loja? Pode haver vendas vinculadas que impedirão a exclusão.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (!confirmed) return;
    const { error } = await supabase.from('locais').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir (pode haver vendas vinculadas)');
    else {
      toast.success('Loja excluída');
      void carregar();
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-3 md:p-6 pb-20 md:pb-6 animate-fade-up">
      <PageHeader
        title="Gerenciar Lojas e Locais"
        description="Cadastre seus Pontos de Venda (PDVs) e Fábricas."
        icon={Store}
      >
        <Button
          icon={Plus}
          onClick={() => {
            setEditingId(null);
            setFormData({ nome: '', tipo: 'pdv', logo_url: '', ordem: 0 });
            setIsModalOpen(true);
          }}
          className="w-full md:w-auto"
        >
          Nova Loja
        </Button>
      </PageHeader>

      {/* Versão Desktop - Tabela */}
      <div className="hidden md:block bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b text-slate-600 uppercase text-xs">
            <tr>
              <th className="px-6 py-3">Logo</th>
              <th className="px-6 py-3">Nome do Local</th>
              <th className="px-6 py-3">Tipo</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {locais.map((local) => (
              <tr key={local.id} className="hover:bg-slate-50">
                <td className="px-6 py-3">
                  {local.logo_url ? (
                    <img
                      src={local.logo_url}
                      alt={local.nome}
                      className="h-9 w-9 rounded-xl object-cover border border-slate-200"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <Store size={18} />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-medium text-slate-800">{local.nome}</td>
                <td className="px-6 py-4">
                  <span
                    className={
                      'px-2 py-1 rounded text-xs font-bold uppercase border ' +
                      (local.tipo === 'fabrica'
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200')
                    }
                  >
                    {local.tipo}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      aria-label={`Editar ${local.nome}`}
                      onClick={() => handleEdit(local)}
                      className="text-primary hover:bg-primary p-2 rounded"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      aria-label={`Excluir ${local.nome}`}
                      onClick={() => handleDelete(local.id)}
                      className="text-red-400 hover:bg-red-50 p-2 rounded"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Versão Mobile - Cards */}
      <div className="md:hidden space-y-3">
        {locais.map((local) => (
          <div key={local.id} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              {local.logo_url ? (
                <img
                  src={local.logo_url}
                  alt={local.nome}
                  className="h-10 w-10 rounded-xl object-cover border border-slate-200 shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                  <Store size={20} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 text-sm truncate">{local.nome}</h3>
                <span
                  className={
                    'inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ' +
                    (local.tipo === 'fabrica'
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200')
                  }
                >
                  {local.tipo}
                </span>
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  aria-label={`Editar ${local.nome}`}
                  onClick={() => handleEdit(local)}
                  className="p-2 hover:bg-primary text-primary rounded"
                >
                  <Edit size={16} />
                </button>
                <button
                  aria-label={`Excluir ${local.nome}`}
                  onClick={() => handleDelete(local.id)}
                  className="p-2 hover:bg-red-50 text-red-600 rounded"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {locais.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-400">
            Nenhuma loja cadastrada.
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingId(null);
          setFormData({ nome: '', tipo: 'pdv', logo_url: '', ordem: 0 });
        }}
        title={editingId ? 'Editar Local' : 'Cadastrar Local'}
      >
        <div className="space-y-4 p-4">
          <InputField
            label="Nome da Loja / Local"
            value={formData.nome}
            onChange={(e: any) => setFormData({ ...formData, nome: e.target.value })}
            placeholder="Ex: PDV Shopping"
          />
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Tipo</label>
            <select
              className="w-full border p-2 rounded-lg bg-white"
              value={formData.tipo}
              onChange={(e: any) => setFormData({ ...formData, tipo: e.target.value })}
            >
              <option value="pdv">Ponto de Venda (Loja)</option>
              <option value="fabrica">Fábrica (Produção)</option>
              <option value="deposito">Depósito</option>
            </select>
          </div>
          <InputField
            label="Ordem de Exibição (Posição: 1 para UNIFAN, 2 para CSA, 3 para UNEF, etc.)"
            type="number"
            value={formData.ordem}
            onChange={(e: any) => setFormData({ ...formData, ordem: Number(e.target.value) || 0 })}
            placeholder="1"
          />
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 block">Logo / Imagem do PDV</label>
            <div className="flex flex-col gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              {formData.logo_url ? (
                <div className="flex items-center gap-3 bg-white p-2.5 border border-slate-200 rounded-lg shadow-sm">
                  <img
                    src={formData.logo_url}
                    alt="Pré-visualização"
                    className="h-12 w-12 rounded-lg object-cover border border-slate-200 shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{formData.logo_url}</p>
                    <p className="text-[11px] text-emerald-600 font-semibold">Imagem carregada</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logo_url: '' })}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-md transition-colors"
                    title="Remover imagem"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-primary/50 rounded-lg bg-white transition-colors">
                  <label className="flex flex-col items-center gap-1.5 cursor-pointer text-slate-600 hover:text-primary transition-colors text-center w-full">
                    {uploadingLogo ? (
                      <Loader2 className="animate-spin text-primary" size={24} />
                    ) : (
                      <Upload size={24} className="text-slate-400" />
                    )}
                    <span className="text-xs font-semibold">
                      {uploadingLogo ? 'Enviando imagem...' : 'Fazer Upload de Imagem'}
                    </span>
                    <span className="text-[11px] text-slate-400">Clique para selecionar do seu dispositivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              <InputField
                label="Ou informe o link (URL) da imagem"
                value={formData.logo_url}
                onChange={(e: any) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://exemplo.com/logo-pdv.png"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setEditingId(null);
                setFormData({ nome: '', tipo: 'pdv', logo_url: '', ordem: 0 });
              }}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={loading} className="w-full sm:w-auto">
              {editingId ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.handleCancel}
        onConfirm={confirmDialog.handleConfirm}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        variant={confirmDialog.options.variant}
      />
    </div>
  );
}
