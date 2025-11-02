'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme';
import { ThemeSettings } from '@/lib/types';
import { themeSettingsSchema } from '@/lib/validations';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from '@/components/Button';
import Panel from '@/components/ui/Panel';
import Text from '@/components/ui/Text';
import Card from '@/components/ui/Card';
import { Toaster, toast } from 'react-hot-toast';

export default function ConfiguracoesPage() {
  const { theme, loading: loadingTheme, updateTheme } = useTheme();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ThemeSettings>({
    resolver: zodResolver(themeSettingsSchema),
    defaultValues: theme,
  });

  useEffect(() => {
    if (theme) {
      reset(theme);
    }
  }, [theme, reset]);

  // Valores em tempo real para preview
  const watchedValues = watch();

  async function handleSave(values: ThemeSettings) {
    try {
      setSaving(true);
      await updateTheme(values);
      toast.success('Configurações salvas com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  }

  const PreviewCard = () => (
    <div 
      className="p-6 rounded-lg shadow-md"
      style={{
        backgroundColor: watchedValues.background_color,
        color: watchedValues.text_color,
        fontFamily: watchedValues.font_family,
        borderRadius: watchedValues.border_radius,
      }}
    >
      <div className="flex items-center gap-4 mb-4">
        <Image 
          src={watchedValues.logo_url || '/logo-fallback.png'} 
          alt={watchedValues.name} 
          width={48}
          height={48}
          className="object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/logo-fallback.png';
          }}
        />
        <h2 
          className="text-2xl font-bold"
          style={{ color: watchedValues.text_color }}
        >
          {watchedValues.name}
        </h2>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          className="px-4 py-2 rounded font-medium"
          style={{
            backgroundColor: watchedValues.primary_color,
            color: '#ffffff',
            borderRadius: watchedValues.border_radius,
          }}
        >
          Botão Primário
        </button>
        <button
          className="px-4 py-2 rounded font-medium"
          style={{
            backgroundColor: watchedValues.secondary_color,
            color: '#ffffff',
            borderRadius: watchedValues.border_radius,
          }}
        >
          Botão Secundário
        </button>
        <button
          className="px-4 py-2 rounded font-medium"
          style={{
            backgroundColor: watchedValues.accent_color,
            color: '#ffffff',
            borderRadius: watchedValues.border_radius,
          }}
        >
          Botão Destaque
        </button>
      </div>

      <div 
        className="p-4 rounded"
        style={{
          backgroundColor: watchedValues.secondary_color,
          color: '#ffffff',
          borderRadius: watchedValues.border_radius,
        }}
      >
        <p>Exemplo de card com cor secundária</p>
      </div>
    </div>
  );

  if (loadingTheme) {
    return (
      <Card variant="default" className="mt-6 py-8">
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
          <Text color="muted">Carregando configurações...</Text>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Panel variant="default" className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <Text variant="h2" weight="semibold">
            Configurações do Sistema
          </Text>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="default">
          <form onSubmit={handleSubmit(handleSave)} className="space-y-4 p-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Nome do Sistema
              </label>
              <input
                type="text"
                id="name"
                {...register('name')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                URL do Logo
              </label>
              <input
                type="url"
                id="logo_url"
                {...register('logo_url')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              {errors.logo_url && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.logo_url.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="font_family" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Fonte Principal
              </label>
              <select
                id="font_family"
                {...register('font_family')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Open Sans">Open Sans</option>
                <option value="Poppins">Poppins</option>
              </select>
              {errors.font_family && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.font_family.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="border_radius" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Raio da Borda
              </label>
              <select
                id="border_radius"
                {...register('border_radius')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="0rem">Quadrado</option>
                <option value="0.25rem">Pequeno</option>
                <option value="0.5rem">Médio</option>
                <option value="1rem">Grande</option>
                <option value="9999px">Arredondado</option>
              </select>
              {errors.border_radius && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.border_radius.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="primary_color" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Cor Primária
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="color"
                    id="primary_color"
                    {...register('primary_color')}
                    className="h-10 p-0 border-gray-300"
                  />
                  <input
                    type="text"
                    {...register('primary_color')}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                {errors.primary_color && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.primary_color.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="secondary_color" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Cor Secundária
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="color"
                    id="secondary_color"
                    {...register('secondary_color')}
                    className="h-10 p-0 border-gray-300"
                  />
                  <input
                    type="text"
                    {...register('secondary_color')}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                {errors.secondary_color && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.secondary_color.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="accent_color" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Cor de Destaque
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="color"
                    id="accent_color"
                    {...register('accent_color')}
                    className="h-10 p-0 border-gray-300"
                  />
                  <input
                    type="text"
                    {...register('accent_color')}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                {errors.accent_color && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.accent_color.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="background_color" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Cor de Fundo
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="color"
                    id="background_color"
                    {...register('background_color')}
                    className="h-10 p-0 border-gray-300"
                  />
                  <input
                    type="text"
                    {...register('background_color')}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                {errors.background_color && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.background_color.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="text_color" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Cor do Texto
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="color"
                    id="text_color"
                    {...register('text_color')}
                    className="h-10 p-0 border-gray-300"
                  />
                  <input
                    type="text"
                    {...register('text_color')}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                {errors.text_color && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.text_color.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={saving}>
                Salvar Configurações
              </Button>
            </div>
          </form>
        </Card>

        <Card variant="default">
          <div className="p-4">
            <h3 className="text-lg font-medium mb-4">Preview</h3>
            <PreviewCard />
          </div>
        </Card>
      </div>

      <Toaster position="top-right" />
    </>
  );
}