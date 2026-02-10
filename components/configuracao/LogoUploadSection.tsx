'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { toast } from 'react-hot-toast';
import Text from '@/components/ui/Text';

interface LogoUploadSectionProps {
  title: string;
  description?: string;
  logoUrl?: string;
  logoScale?: number;
  onLogoUrlChange: (url: string) => void;
  onLogoScaleChange: (scale: number) => void;
  storagePath: string;
  previewSize?: { width: number; height: number };
}

export function LogoUploadSection({
  title,
  description,
  logoUrl,
  logoScale = 1,
  onLogoUrlChange,
  onLogoScaleChange,
  storagePath,
  previewSize = { width: 48, height: 48 },
}: LogoUploadSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const { setPreviewVars } = useTheme();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setSelectedFileName(file.name);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${storagePath}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('logos').getPublicUrl(filePath);

      if (data?.publicUrl) {
        onLogoUrlChange(data.publicUrl);
        toast.success(`${title} atualizado com sucesso!`);
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error(`Erro ao fazer upload do ${title.toLowerCase()}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-6">
      <Text className="mb-3 font-medium">{title}</Text>
      {description && <p className="mb-3 text-sm text-gray-600">{description}</p>}

      <div className="flex items-center gap-4 rounded-lg border bg-white p-4">
        {logoUrl ? (
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded bg-white">
            <img
              src={logoUrl}
              alt={`${title} atual`}
              className="rounded object-contain"
              style={{
                width: `${previewSize.width * logoScale}px`,
                height: `${previewSize.height * logoScale}px`,
                maxWidth: `${previewSize.width}px`,
                maxHeight: `${previewSize.height}px`,
              }}
            />
          </div>
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-100">
            <span className="text-xs text-gray-400">{title.split(' ')[0]}</span>
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium">Upload de {title}</label>
            {uploading && (
              <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Enviando...
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={uploading}
              className="text-muted-foreground file:bg-primary/10 hover:file:bg-primary/20 block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary"
            />
            {selectedFileName && !uploading && (
              <div className="absolute left-0 top-0 flex items-center h-full pl-3 pointer-events-none">
                <span className="text-sm text-gray-600 truncate max-w-[200px]">
                  {selectedFileName}
                </span>
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">Máximo 2MB. Formatos: PNG, JPG, SVG</p>
        </div>
      </div>

      {/* Escala do Logo */}
      <div className="mt-6">
        <label className="mb-3 block text-sm font-medium">Escala do {title}</label>
        <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.1"
              value={logoScale}
              onChange={(e) => {
                const newScale = parseFloat(e.target.value);
                onLogoScaleChange(newScale);
                try {
                  setPreviewVars?.({ logo_scale: newScale, company_logo_scale: newScale });
                } catch (err) {
                  // não bloquear a UI se preview falhar
                  console.error('Erro ao atualizar preview das variáveis de tema:', err);
                }
              }}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0.5x</span>
              <span className="font-medium">{logoScale.toFixed(1)}x</span>
              <span>5.0x</span>
            </div>
          </div>
          <div className="flex items-center justify-center w-32 h-20 border-2 border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`Preview escala ${title.toLowerCase()}`}
                className="rounded object-contain"
                style={{
                  width: `${64 * logoScale}px`,
                  height: `${64 * logoScale}px`,
                  maxWidth: '320px',
                  maxHeight: '80px',
                }}
              />
            ) : (
              <span className="text-sm text-gray-400">{title.split(' ')[0]}</span>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2 text-center">
          Preview em tempo real - Ajuste a escala do {title.toLowerCase()}
        </p>
      </div>
    </div>
  );
}
