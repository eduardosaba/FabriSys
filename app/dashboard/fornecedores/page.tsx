'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Truck,
  Plus,
  Search,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Loader2,
  FileText,
  Star,
  Filter,
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';

// --- IMPORTS (Ajuste conforme sua estrutura de pastas real) ---
import { supabase } from '@/lib/supabase';
import { Button, Modal } from '@/components/ui/shared';
import PageHeader from '@/components/ui/PageHeader';
import { maskCpfCnpj, onlyDigits, formatCpfCnpj } from '@/lib/utils';

// --- SCHEMAS & TYPES ---
const fornecedorSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cnpj: z
    .string()
    .optional()
    .nullish()
    .refine((v) => {
      if (!v) return true;
      const l = onlyDigits(v || '').length;
      return l === 11 || l === 14;
    }, 'CPF/CNPJ inválido (11 ou 14 dígitos)'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional().or(z.literal('')),
  endereco: z.string().optional().or(z.literal('')),
  categoria: z.array(z.string()).optional(), // agora aceita múltiplas categorias
  avaliacao: z.string().optional(), // Novo Campo (1-5)
});

type FornecedorFormData = z.infer<typeof fornecedorSchema>;

interface Fornecedor {
  id: number;
  nome: string;
  cnpj?: string | null;
  email?: string;
  telefone?: string;
  endereco?: string;
  // pode ser string (legado) ou array de strings (novo comportamento)
  categoria?: string | string[];
  avaliacao?: number;
}

// Categorias sugeridas para o sistema — usado como fallback
const CATEGORIAS_FORNECEDOR = [
  'Laticínios',
  'Hortifruti',
  'Carnes',
  'Secos e Molhados',
  'Embalagens',
  'Bebidas',
  'Serviços',
  'Outros',
];

export default function FornecedoresPage() {
  const confirmDialog = useConfirm();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const [categoriasDb, setCategoriasDb] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState(''); // Estado do filtro
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FornecedorFormData>({
    resolver: zodResolver(fornecedorSchema),
  });

  // --- BUSCAR DADOS ---
  useEffect(() => {
    void fetchFornecedores();
    void fetchCategorias();
  }, []);

  async function fetchCategorias() {
    try {
      let q = supabase.from('categorias').select('nome').order('nome');
      if (profile?.organization_id) q = q.eq('organization_id', profile.organization_id);
      const { data, error } = await q;
      if (error) throw error;
      const names = (data || []).map((r: any) => String(r.nome));
      setCategoriasDb(names.length ? names : CATEGORIAS_FORNECEDOR);
    } catch (err) {
      console.error('Erro ao carregar categorias (fornecedores):', err);
      setCategoriasDb(CATEGORIAS_FORNECEDOR);
    }
  }

  async function fetchFornecedores() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('fornecedores').select('*').order('nome');

      if (error) throw error;
      setFornecedores(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  }

  // --- PREPARAR EDIÇÃO ---
  useEffect(() => {
    if (editingFornecedor) {
      reset({
        nome: editingFornecedor.nome,
        cnpj: formatCpfCnpj(editingFornecedor.cnpj),
        email: editingFornecedor.email || '',
        telefone: editingFornecedor.telefone || '',
        endereco: editingFornecedor.endereco || '',
        // normalize categoria to array for the form
        categoria: Array.isArray(editingFornecedor.categoria)
          ? editingFornecedor.categoria
          : editingFornecedor.categoria
            ? String(editingFornecedor.categoria)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : ['Outros'],
        avaliacao: String(editingFornecedor.avaliacao || '5'),
      });
    } else {
      reset({
        nome: '',
        cnpj: '',
        email: '',
        telefone: '',
        endereco: '',
        categoria: ['Outros'],
        avaliacao: '5',
      });
    }
  }, [editingFornecedor, reset]);

  // --- SALVAR ---
  async function handleSave(values: FornecedorFormData) {
    try {
      // normalize payload values
      const categoriaField = values.categoria;
      const categoriaToStore = Array.isArray(categoriaField)
        ? categoriaField.join(',')
        : (categoriaField as unknown as string) || 'Outros';

      const payload = {
        ...values,
        cnpj: values.cnpj ? onlyDigits(String(values.cnpj)) : null,
        email: (values.email as string) || null,
        telefone: (values.telefone as string) || null,
        endereco: (values.endereco as string) || null,
        categoria: categoriaToStore,
        avaliacao: Number(values.avaliacao) || 5,
      };

      let error;

      if (editingFornecedor) {
        const { error: updateError } = await supabase
          .from('fornecedores')
          .update(payload)
          .eq('id', editingFornecedor.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('fornecedores').insert(payload);
        error = insertError;
      }

      if (error) throw error;

      toast.success(editingFornecedor ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!');
      await fetchFornecedores();
      handleCloseModal();
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      const code = String(e?.code ?? '');
      const message = String(e?.message ?? '');
      if (code === '23505') {
        toast.error('Já existe um fornecedor com este CNPJ.');
      } else {
        toast.error('Erro ao salvar: ' + message);
      }
    }
  }

  // --- EXCLUIR ---
  async function handleDelete(id: number) {
    const confirmed = await confirmDialog.confirm({
      title: 'Excluir Fornecedor',
      message:
        'Tem certeza que deseja excluir este fornecedor? Isso pode afetar pedidos e notas vinculadas.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase.from('fornecedores').delete().eq('id', id);
      if (error) throw error;

      toast.success('Fornecedor excluído!');
      setFornecedores((prev) => prev.filter((f) => f.id !== id));
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      const code = String(e?.code ?? '');
      if (code === '23503') {
        toast.error('Não é possível excluir: Fornecedor vinculado a produtos ou notas.');
      } else {
        toast.error('Erro ao excluir.');
      }
    }
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingFornecedor(null);
    reset();
  }

  // --- FILTRO COMBINADO ---
  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return fornecedores.filter((f) => {
      const matchesSearch =
        f.nome.toLowerCase().includes(term) ||
        f.cnpj?.includes(term) || // Adicionado optional chaining
        (f.email && f.email.toLowerCase().includes(term));

      const matchesCategory = filterCategoria ? f.categoria === filterCategoria : true;

      return matchesSearch && matchesCategory;
    });
  }, [fornecedores, searchTerm, filterCategoria]);

  // Helper para cor da categoria
  const getCategoryColor = (cat?: string) => {
    switch (cat) {
      case 'Laticínios':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Hortifruti':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Carnes':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'Embalagens':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-orange-50 text-orange-700 border-orange-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <Toaster position="top-right" />

      <PageHeader
        title="Gestão de Fornecedores"
        description="Gerencie parceiros, contatos e categorias de compra."
        icon={Truck}
      >
        <Button
          onClick={() => {
            setEditingFornecedor(null);
            setIsModalOpen(true);
          }}
          icon={Plus}
        >
          Novo Fornecedor
        </Button>
      </PageHeader>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Barra de Busca e Filtros */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome, CNPJ, CPF ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all bg-white"
            />
          </div>
          <div className="relative w-full md:w-64">
            <Filter className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <select
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all bg-white appearance-none"
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
            >
              <option value="">Todas as Categorias</option>
              {(categoriasDb.length ? categoriasDb : CATEGORIAS_FORNECEDOR).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="flex h-48 items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mr-2" /> Carregando lista...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Truck size={48} className="mx-auto mb-3 opacity-20" />
            <p>Nenhum fornecedor encontrado.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-3">Empresa</th>
                    <th className="px-6 py-3">Categoria / Avaliação</th>
                    <th className="px-6 py-3">Contato</th>
                    <th className="px-6 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((fornecedor) => (
                    <tr key={fornecedor.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800 text-base">{fornecedor.nome}</p>
                        <div className="flex items-center gap-1 text-slate-500 text-xs mt-1 font-mono">
                          <FileText size={12} /> {formatCpfCnpj(fornecedor.cnpj)}
                        </div>
                        {fornecedor.endereco && (
                          <div
                            className="flex items-center gap-1 text-slate-400 text-xs mt-1 truncate max-w-[200px]"
                            title={fornecedor.endereco}
                          >
                            <MapPin size={12} /> {fornecedor.endereco}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          {(() => {
                            const cats = Array.isArray(fornecedor.categoria)
                              ? fornecedor.categoria
                              : fornecedor.categoria
                                ? String(fornecedor.categoria)
                                    .split(',')
                                    .map((s) => s.trim())
                                    .filter(Boolean)
                                : ['Outros'];
                            return cats.map((c) => (
                              <span
                                key={c}
                                className={`px-2 py-0.5 rounded border text-xs font-medium w-fit ${getCategoryColor(c)}`}
                              >
                                {c}
                              </span>
                            ));
                          })()}
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={12}
                                className={`${star <= (fornecedor.avaliacao || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`}
                              />
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          {fornecedor.email && (
                            <div className="flex items-center gap-2 text-slate-600 text-xs">
                              <Mail size={14} className="text-slate-400" /> {fornecedor.email}
                            </div>
                          )}
                          {fornecedor.telefone && (
                            <div className="flex items-center gap-2 text-slate-600 text-xs">
                              <Phone size={14} className="text-slate-400" /> {fornecedor.telefone}
                            </div>
                          )}
                          {!fornecedor.email && !fornecedor.telefone && (
                            <span className="text-slate-400 italic">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingFornecedor(fornecedor);
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(fornecedor.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Excluir"
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

            {/* Mobile: cards */}
            <div className="md:hidden space-y-3">
              {filteredItems.map((fornecedor) => (
                <div
                  key={fornecedor.id}
                  className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-3">
                      <p className="font-bold text-slate-800">{fornecedor.nome}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <FileText size={12} /> {formatCpfCnpj(fornecedor.cnpj)}
                      </div>
                      {fornecedor.endereco && (
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-2 truncate">
                          <MapPin size={12} /> {fornecedor.endereco}
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(() => {
                          const cats = Array.isArray(fornecedor.categoria)
                            ? fornecedor.categoria
                            : fornecedor.categoria
                              ? String(fornecedor.categoria)
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean)
                              : ['Outros'];
                          return cats.map((c) => (
                            <span
                              key={c}
                              className={`px-2 py-0.5 rounded border text-xs font-medium ${getCategoryColor(c)}`}
                            >
                              {c}
                            </span>
                          ));
                        })()}
                      </div>
                      <div className="mt-3 text-xs text-slate-600 space-y-1">
                        {fornecedor.email && (
                          <div className="flex items-center gap-2">
                            <Mail size={12} className="text-slate-400" /> {fornecedor.email}
                          </div>
                        )}
                        {fornecedor.telefone && (
                          <div className="flex items-center gap-2">
                            <Phone size={12} className="text-slate-400" /> {fornecedor.telefone}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={`${star <= (fornecedor.avaliacao || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingFornecedor(fornecedor);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(fornecedor.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal de Cadastro */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
        size="md"
      >
        <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Razão Social / Nome
              </label>
              <input
                {...register('nome')}
                className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ${errors.nome ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-orange-500 focus:ring-orange-100'}`}
                placeholder="Ex: Distribuidora Aliança"
              />
              {errors.nome && <p className="mt-1 text-xs text-red-500">{errors.nome.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">CNPJ / CPF</label>
                <input
                  {...register('cnpj')}
                  onChange={(e) => {
                    const val = maskCpfCnpj(e.target.value);
                    setValue('cnpj', val);
                  }}
                  className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ${errors.cnpj ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-orange-500 focus:ring-orange-100'}`}
                  placeholder="00.000.000/0000-00"
                />
                {errors.cnpj && <p className="mt-1 text-xs text-red-500">{errors.cnpj.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Categoria</label>
                <div className="grid grid-cols-2 gap-2">
                  {(watch('categoria') || ['Outros']) && null}
                  {(categoriasDb.length ? categoriasDb : CATEGORIAS_FORNECEDOR).map((cat) => {
                    const selected = Array.isArray(watch('categoria'))
                      ? (watch('categoria') as string[]).includes(cat)
                      : false;
                    return (
                      <label key={cat} className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            const current = watch('categoria') || [];
                            const next = e.target.checked
                              ? Array.from(new Set([...current, cat]))
                              : current.filter((c) => c !== cat);
                            setValue('categoria', next, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-slate-700">{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ${errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-orange-500 focus:ring-orange-100'}`}
                  placeholder="contato@empresa.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Telefone</label>
                <input
                  {...register('telefone')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Avaliação (1-5)
              </label>
              <select
                {...register('avaliacao')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white"
              >
                <option value="5">⭐⭐⭐⭐⭐ Excelente</option>
                <option value="4">⭐⭐⭐⭐ Bom</option>
                <option value="3">⭐⭐⭐ Regular</option>
                <option value="2">⭐⭐ Ruim</option>
                <option value="1">⭐ Péssimo</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Endereço Completo
              </label>
              <textarea
                {...register('endereco')}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 resize-none"
                placeholder="Rua, Número, Bairro, Cidade - UF"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t mt-2">
            <Button type="button" variant="secondary" onClick={handleCloseModal} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} loading={isSubmitting} className="flex-1">
              Salvar
            </Button>
          </div>
        </form>
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
