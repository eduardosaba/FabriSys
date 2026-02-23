"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import getImageUrl from '@/lib/getImageUrl';
import { useToast } from '@/hooks/useToast';
import { User, Lock, Camera, Loader2, Save, CreditCard, Calendar, ShieldCheck, Smile, X, Phone, Mail, Shield } from 'lucide-react';
import Button from '@/components/Button';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'plan'>('profile');

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [libraryAvatars, setLibraryAvatars] = useState<string[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);

  const [formData, setFormData] = useState<any>({
    full_name: '',
    email: '',
    store_name: '',
    whatsapp: '',
    avatar_url: null,
  });

  const [passData, setPassData] = useState({ newPassword: '', confirmPassword: '' });

  const [planData, setPlanData] = useState({ name: 'Gratuito', status: 'active', expires_at: null as string | null, is_trial: false });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!profile) {
          setLoading(false);
          return;
        }

        // buscar dados de profiles e settings; subscriptions é opcional (pode não existir)
        const profRes = await supabase.from('profiles').select('*').eq('id', profile.id).maybeSingle();
        const settingsRes = await supabase.from('settings').select('phone').eq('user_id', profile.id).maybeSingle();

        let sub: any = null;
        try {
          const subRes = await supabase.from('subscriptions').select('*').eq('user_id', profile.id).maybeSingle();
          sub = subRes.data;
        } catch (e) {
          // tabela subscriptions pode não existir no projeto — não falhar a página por isso
          // logamos apenas para diagnóstico
           
          console.debug('Tabela subscriptions não disponível:', e);
          sub = null;
        }

        const prof = profRes.data;
        const settings = settingsRes.data;

        setFormData({
          full_name: prof?.full_name || (profile as any).nome || profile.email?.split('@')[0] || '',
          email: profile.email || '',
          store_name: prof?.store_name || '',
          whatsapp: settings?.phone || (profile as any).telefone || '',
          avatar_url: prof?.avatar_url || (profile as any).avatar_url || null,
        });

        if (sub) {
          setPlanData({
            name: sub.plan_name || 'Gratuito',
            status: sub.status || 'active',
            expires_at: sub.current_period_end || null,
            is_trial: sub.status === 'trial',
          });
        }
      } catch (e) {
        console.error('Erro ao carregar perfil:', e);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [profile]);

  // AVATAR: Biblioteca
  const fetchAvatarLibrary = async () => {
    setLoadingAvatars(true);
    try {
      const { data, error } = await supabase.storage.from('avatars').list('biblio_avatar', { limit: 200, offset: 0, sortBy: { column: 'name', order: 'asc' } });
      if (error) throw error;
      if (!data || data.length === 0) {
        setLibraryAvatars([]);
        return;
      }

      // Para cada arquivo, tente obter uma URL pública e valide seu acesso com HEAD.
      // Se inacessível, tente criar uma signed url (caso o bucket seja privado).
      const urls = await Promise.all(
        data.map(async (file: any) => {
          const path = `biblio_avatar/${file.name}`;
          try {
            const pub = supabase.storage.from('avatars').getPublicUrl(path);
            const publicUrl = pub?.data?.publicUrl || null;
            if (!publicUrl) return null;

            // Verifica rapidamente se a URL pública está acessível
            try {
              const resp = await fetch(publicUrl, { method: 'HEAD' });
              if (resp.ok) return publicUrl;
            } catch (e) {
              // falha no HEAD — tentaremos signed url
            }

            // Tenta criar signed url (pode falhar no client se policy não permitir)
            try {
              const signed = await supabase.storage.from('avatars').createSignedUrl(path, 60);
              const signedUrl = signed?.data?.signedUrl || null;
              if (signedUrl) return signedUrl;
            } catch (e) {
              // ignore
            }

            // fallback: retorna a publicUrl mesmo que possa ser inacessível (útil para debugging)
            return publicUrl;
          } catch (err) {
            // para um arquivo problemático, não interrompe o processamento
             
            console.debug('Erro ao processar avatar:', file.name, err);
            return null;
          }
        })
      );

      setLibraryAvatars(urls.filter(Boolean) as string[]);
    } catch (err) {
      console.error('Erro ao carregar avatares:', err);
      try {
        toast({ title: 'Erro', description: 'Não foi possível carregar a galeria.', variant: 'error' });
      } catch (e) { void e; }
    } finally {
      setLoadingAvatars(false);
    }
  };

  useEffect(() => {
    if (showAvatarModal && libraryAvatars.length === 0) void fetchAvatarLibrary();
  }, [showAvatarModal]);

  const updateAvatarUrl = async (url: string | null) => {
    setFormData((p: any) => ({ ...p, avatar_url: url }));
    try {
      await Promise.all([
        supabase.auth.updateUser({ data: { avatar_url: url } }),
        supabase.from('profiles').upsert(
          { id: profile?.id, avatar_url: url, role: (profile as any)?.role || 'user', updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        ),
      ]);
      void router.refresh();
      // Forçar atualização do contexto de autenticação para refletir o novo avatar no header
      try { await updateProfile(); } catch (e) { /* ignore */ }
    } catch (e) {
      console.error('Erro ao atualizar avatar:', e);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !profile) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `public/${profile.id}/avatars/avatar-${Date.now()}.${fileExt}`;
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      // Usa o path retornado pelo upload para obter a publicUrl
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
      await updateAvatarUrl(urlData.publicUrl);
      try { toast({ title: 'Sucesso', description: 'Foto atualizada.' }); } catch (e) { void e; }
    } catch (err: any) {
      console.error('Erro upload:', err);
      try { toast({ title: 'Erro', description: String(err.message || err), variant: 'error' }); } catch(e){void e}
    }
  };

  const handleSelectLibraryAvatar = async (url: string) => {
    setShowAvatarModal(false);
    setFormData((p: any) => ({ ...p, avatar_url: url }));
    try {
      await updateAvatarUrl(url);
      try { toast({ title: 'Avatar selecionado' }); } catch(e){void e}
    } catch (e) { console.error(e); }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) value = `(${value.substring(0,2)}) ${value.substring(2)}`;
    if (value.length > 9) value = `${value.substring(0,10)}-${value.substring(10)}`;
    setFormData((p: any) => ({ ...p, whatsapp: value }));
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const normalizedPhone = formData.whatsapp?.trim() || null;
      const profileUpdates = {
        id: profile.id,
        full_name: formData.full_name,
        store_name: formData.store_name,
        whatsapp: normalizedPhone,
        avatar_url: formData.avatar_url,
        role: (profile as any)?.role || 'user',
        updated_at: new Date().toISOString(),
      };
      const settingsUpdates = { user_id: profile.id, phone: normalizedPhone, updated_at: new Date().toISOString() };

      const [pErr, sErr] = await Promise.all([
        // garante merge por id
        supabase.from('profiles').upsert(profileUpdates, { onConflict: 'id' }).then(r => r.error),
        // usa onConflict para evitar 409 caso já exista settings.user_id
        supabase.from('settings').upsert(settingsUpdates, { onConflict: 'user_id' }).then(r => r.error),
      ]);
      if (pErr) throw pErr;
      if (sErr) throw sErr;

      await supabase.auth.updateUser({ data: { full_name: formData.full_name } });
      try { toast({ title: 'Perfil salvo com sucesso!' }); } catch(e){void e}
      void router.refresh();
      await updateProfile();
    } catch (err: any) {
      console.error('Erro salvar', err);
      try { toast({ title: 'Erro', description: String(err.message || err), variant: 'error' }); } catch(e){void e}
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (passData.newPassword !== passData.confirmPassword) return tryToastError('As senhas não coincidem!');
    if (passData.newPassword.length < 6) return tryToastError('A senha deve ter no mínimo 6 caracteres.');
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passData.newPassword });
      if (error) throw error;
      try { toast({ title: 'Senha alterada com sucesso!' }); } catch(e){void e}
      setPassData({ newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      try { toast({ title: 'Erro', description: String(err.message || err), variant: 'error' }); } catch(e){void e}
    } finally { setSaving(false); }
  };

  const tryToastError = (msg: string) => { try { toast({ title: 'Erro', description: msg, variant: 'error' }); } catch(e){void e} };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Vitalício / Indeterminado';
    return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  if (loading) return (<div className="flex h-[calc(100vh-1rem)] items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>);

  const inputClass = 'w-full p-2.5 rounded-lg outline-none transition-all border bg-white dark:bg-slate-950 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
  const cardClass = 'bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm animate-in fade-in zoom-in-95 duration-300';

  return (
    <div className="flex flex-col min-h-[calc(100vh-1rem)] bg-gray-50 dark:bg-slate-950 p-4 md:p-6 overflow-hidden">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">Minha Conta</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie seus dados pessoais e de acesso.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className={`${cardClass} flex flex-col items-center text-center`}>
            <div className="relative group cursor-pointer mb-4">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 dark:border-slate-800 shadow-inner bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
                {formData.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getImageUrl(formData.avatar_url) || formData.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-slate-600"><User size={48} /></div>
                )}
              </div>

              <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                <Camera className="text-white" size={24} />
              </div>
              <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
            </div>

            <div className="flex gap-2 mb-4">
              <Button onClick={() => setShowAvatarModal(true)} size="sm" variant="secondary" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                <Smile size={14} /> Escolher da Galeria
              </Button>
            </div>

            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate w-full px-4">{formData.full_name || 'Usuário'}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 truncate w-full px-4" title={formData.email}>{formData.email}</p>

            <div className="w-full border-t border-gray-100 dark:border-slate-800 pt-4 mt-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${planData.name === 'Gratuito' ? 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'}`}>
                {planData.name === 'Gratuito' ? <User size={12} /> : <ShieldCheck size={12} /> }
                {planData.name}
              </span>
            </div>
          </div>

          <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            <Button onClick={() => setActiveTab('profile')} variant={activeTab === 'profile' ? 'primary' : 'secondary'} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap"><User size={18} /> Dados Pessoais</Button>
            <Button onClick={() => setActiveTab('security')} variant={activeTab === 'security' ? 'primary' : 'secondary'} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap"><Lock size={18} /> Segurança</Button>
            <Button onClick={() => setActiveTab('plan')} variant={activeTab === 'plan' ? 'primary' : 'secondary'} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap"><CreditCard size={18} /> Meu Plano</Button>
          </nav>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'profile' && (
            <section className={cardClass}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-4"><User size={20} className="text-[var(--primary)]" /> Editar Perfil</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className={labelClass}>Nome Completo</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={formData.full_name} onChange={(e) => setFormData((p:any)=>({...p, full_name: e.target.value}))} className={`${inputClass} pl-10`} placeholder="Seu nome" />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Nome da Loja <span className="text-gray-400 font-normal text-xs ml-1">(opcional)</span></label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={formData.store_name} onChange={(e)=>setFormData((p:any)=>({...p, store_name: e.target.value}))} placeholder="Minha Loja" className={`${inputClass} pl-10`} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>WhatsApp</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={formData.whatsapp} onChange={handlePhoneChange} placeholder="(00) 00000-0000" className={`${inputClass} pl-10`} maxLength={15} />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className={labelClass}>E-mail (Login)</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" value={formData.email} disabled className={`${inputClass} pl-10 opacity-60 cursor-not-allowed bg-gray-50 dark:bg-slate-900/50`} />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end pt-4 border-t border-gray-100 dark:border-slate-800">
                <Button onClick={handleSaveProfile} loading={saving} icon={Save} variant="primary" className="font-bold px-6 py-2.5 rounded-lg shadow-md">Salvar Dados</Button>
              </div>
            </section>
          )}

          {activeTab === 'security' && (
            <section className={cardClass}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-4"><Lock size={20} className="text-orange-500" /> Alterar Senha</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Nova Senha</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="password" autoComplete="new-password" value={passData.newPassword} onChange={(e)=>setPassData({...passData, newPassword: e.target.value})} className={`${inputClass} pl-10`} placeholder="Mínimo 6 caracteres" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Confirmar Senha</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="password" autoComplete="new-password" value={passData.confirmPassword} onChange={(e)=>setPassData({...passData, confirmPassword: e.target.value})} className={`${inputClass} pl-10`} placeholder="Repita a senha" />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end pt-4 border-t border-gray-100 dark:border-slate-800">
                <Button variant="outline" onClick={handleChangePassword} loading={saving} disabled={!passData.newPassword} className="border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 px-6 py-2.5 rounded-lg">Atualizar Senha</Button>
              </div>
            </section>
          )}

          {activeTab === 'plan' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className={`${cardClass} relative overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800`}>
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1 uppercase tracking-wider">Licença Atual</p>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">{planData.name}</h2>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${planData.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'}`}>
                        <span className={`w-2 h-2 rounded-full ${planData.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {planData.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                  <div className="h-14 w-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-100 dark:ring-indigo-800"><Shield size={32} /></div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-blue-600 dark:text-blue-400"><Calendar size={24} /></div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Vencimento</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{formatDate(planData.expires_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[80vh] border border-gray-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Smile size={20} className="text-[var(--primary)]" /> Galeria de Avatares</h3>
              <button onClick={() => setShowAvatarModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-950">
              {loadingAvatars ? (
                <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
              ) : libraryAvatars.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-12"><p>Nenhum avatar encontrado na biblioteca.</p></div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {libraryAvatars.map((url, idx) => (
                    <button key={idx} onClick={() => handleSelectLibraryAvatar(url)} className="group relative aspect-square rounded-xl bg-gray-50 dark:bg-slate-800 overflow-hidden ring-1 ring-gray-200 dark:ring-slate-700 hover:ring-2 hover:ring-[var(--primary)] transition-all shadow-sm hover:shadow-md">
                      {url ? (
                        <img
                          src={url}
                          alt={`Avatar ${idx}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-sm text-gray-400">Avatar indisponível</div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
