'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast, Toaster } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';

// 🧩 Validação do formulário com Zod
const themeSettingsSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  logo_url: z.string().optional(),
  logo_scale: z.number().min(0.1).max(2),
  font_family: z.string(),
  border_radius: z.string(),
  colors: z.object({
    light: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
      background: z.string(),
      text: z.string(),
    }),
    dark: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
      background: z.string(),
      text: z.string(),
    }),
  }),
});

type FormData = z.infer<typeof themeSettingsSchema>;

export default function ThemeConfigurator() {
  const [saving, setSaving] = useState(false);
  const [loadingTheme, setLoadingTheme] = useState(true);
  const [previewImageError, setPreviewImageError] = useState(false);
  const { resolvedTheme } = useTheme();

  // 🎨 Valores padrão iniciais
  const defaultTheme: FormData = {
    name: 'LariSaba',
    logo_url: '/logo.png',
    logo_scale: 1,
    font_family: 'Inter',
    border_radius: '0.5rem',
    colors: {
      light: {
        primary: '#5dadbf',
        secondary: '#154156',
        accent: '#00a8a8',
        background: '#ffffff',
        text: '#000000',
      },
      dark: {
        primary: '#5dadbf',
        secondary: '#154156',
        accent: '#00a8a8',
        background: '#0f172a',
        text: '#f1f5f9',
      },
    },
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(themeSettingsSchema),
    defaultValues: defaultTheme,
  });

  const watchedValues = watch();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setLoadingTheme(false), 800);
    }
  }, []);

  function handleSave(_values: FormData) {
    try {
      setSaving(true);
      // Exemplo de salvamento no Supabase (ajuste conforme sua tabela):
      // await supabase.from('theme_config').upsert(values);
      toast.success('Configurações salvas com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  }

  if (loadingTheme) {
    return (
      <Card variant="default" className="mt-6 py-8">
        <div className="flex items-center justify-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-muted-foreground">Carregando configurações...</span>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 🧾 FORMULÁRIO PRINCIPAL */}
        <Card variant="default">
          <form onSubmit={handleSubmit(handleSave)} className="space-y-6 p-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium">Nome do Sistema</label>
              <input
                type="text"
                {...register('name')}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            {/* Logo */}
            <div>
              <label className="block text-sm font-medium">Logo</label>
              <div className="mt-2 flex items-center gap-4">
                {watchedValues.logo_url && !previewImageError ? (
                  <Image
                    src={watchedValues.logo_url}
                    alt="Logo"
                    width={48}
                    height={48}
                    className="rounded object-contain"
                    onError={() => setPreviewImageError(true)}
                  />
                ) : (
                  <div className="h-12 w-12 rounded bg-gray-100" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) return toast.error('Máximo de 2MB');
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}.${fileExt}`;
                    const res = await supabase.storage
                      .from('logos')
                      .upload(fileName, file, { upsert: true });
                    if (res.error) return toast.error('Erro ao enviar logo');
                    const urlRes = supabase.storage.from('logos').getPublicUrl(res.data.path);
                    setValue('logo_url', urlRes.data.publicUrl);
                    setPreviewImageError(false);
                    toast.success('Logo atualizada!');
                  }}
                />
              </div>
            </div>

            {/* Fonte */}
            <div>
              <label className="block text-sm font-medium">Fonte</label>
              <select
                {...register('font_family')}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
              >
                <option value="Inter">Inter</option>
                <option value="Poppins">Poppins</option>
                <option value="Roboto">Roboto</option>
                <option value="Open Sans">Open Sans</option>
              </select>
            </div>

            {/* Bordas */}
            <div>
              <label className="block text-sm font-medium">Raio das Bordas</label>
              <select
                {...register('border_radius')}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
              >
                <option value="0rem">Quadrado</option>
                <option value="0.25rem">Pequeno</option>
                <option value="0.5rem">Médio</option>
                <option value="1rem">Grande</option>
                <option value="9999px">Arredondado</option>
              </select>
            </div>

            {/* Escala do logo */}
            <div>
              <label className="block text-sm font-medium">Escala do Logo</label>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                {...register('logo_scale', { valueAsNumber: true })}
                className="mt-2 w-full"
              />
              <p className="text-sm text-gray-500">{watchedValues.logo_scale?.toFixed(1)}x</p>
            </div>

            {/* 🎨 Cores - Tema Claro */}
            <div>
              <h3 className="text-md mb-2 mt-6 font-semibold">Tema Claro</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.keys(watchedValues.colors.light).map((key) => (
                  <div key={key}>
                    <label className="block text-sm capitalize">{key}</label>
                    <input
                      type="color"
                      {...register(`colors.light.${key as keyof FormData['colors']['light']}`)}
                      className="h-10 w-full cursor-pointer rounded border"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 🌙 Cores - Tema Escuro */}
            <div>
              <h3 className="text-md mb-2 mt-6 font-semibold">Tema Escuro</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.keys(watchedValues.colors.dark).map((key) => (
                  <div key={key}>
                    <label className="block text-sm capitalize">{key}</label>
                    <input
                      type="color"
                      {...register(`colors.dark.${key as keyof FormData['colors']['dark']}`)}
                      className="h-10 w-full cursor-pointer rounded border"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" loading={saving}>
                Salvar Configurações
              </Button>
            </div>
          </form>
        </Card>

        {/* 👁️ PREVIEW */}
        <Card variant="default">
          <div className="p-4">
            <h3 className="mb-4 text-lg font-medium">Preview</h3>
            <PreviewCard data={watchedValues} themeMode={resolvedTheme} />
          </div>
        </Card>
      </div>

      <Toaster position="top-right" />
    </>
  );
}

// 🪄 Componente de preview ao lado
function PreviewCard({ data, themeMode }: { data: FormData; themeMode?: string }) {
  const colors = themeMode === 'dark' ? data.colors.dark : data.colors.light;

  return (
    <div
      className="rounded-lg p-6 shadow-md"
      style={{
        backgroundColor: colors.background,
        color: colors.text,
        fontFamily: data.font_family,
        borderRadius: data.border_radius,
      }}
    >
      <div className="mb-4 flex items-center gap-4">
        <Image
          src={data.logo_url || '/logo.png'}
          alt={data.name}
          width={Math.round(48 * (data.logo_scale || 1))}
          height={Math.round(48 * (data.logo_scale || 1))}
          className="object-contain"
          priority
        />
        <h2 className="text-2xl font-bold">{data.name}</h2>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          className="rounded px-4 py-2 font-medium"
          style={{
            backgroundColor: colors.primary,
            color: '#fff',
            borderRadius: data.border_radius,
          }}
        >
          Primário
        </button>
        <button
          className="rounded px-4 py-2 font-medium"
          style={{
            backgroundColor: colors.secondary,
            color: '#fff',
            borderRadius: data.border_radius,
          }}
        >
          Secundário
        </button>
        <button
          className="rounded px-4 py-2 font-medium"
          style={{
            backgroundColor: colors.accent,
            color: '#fff',
            borderRadius: data.border_radius,
          }}
        >
          Destaque
        </button>
      </div>
    </div>
  );
}
