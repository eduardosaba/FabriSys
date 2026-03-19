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

      // Primeiro, tratamos `storagePath` como o nome do bucket (cada logo em bucket separado)
      const primaryBucket = storagePath;
      let bucketName = primaryBucket;
      let filePath = fileName; // guarda o caminho efetivo dentro do bucket

      // Tenta enviar para o bucket específico (fornecendo contentType e sem upsert)
      let uploadResult = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { contentType: file.type || undefined, upsert: false });

      // Se falhar, log detalhado e tentar fallback para bucket 'logos'
      if (uploadResult.error) {
        console.warn('Upload primário falhou:', {
          bucket: bucketName,
          path: filePath,
          error: uploadResult.error,
          fullResult: uploadResult,
        });

        const fallbackBucket = 'logos';

        // Tentativa 1 de fallback: mesmo fileName no bucket de fallback (sem prefixo)
        let fallbackPath = fileName;
        let fallbackResult = await supabase.storage
          .from(fallbackBucket)
          .upload(fallbackPath, file, { contentType: file.type || undefined, upsert: false });

        // Se ainda falhar, tentar com prefixo storagePath/fileName (último recurso)
        if (fallbackResult.error) {
          console.warn('Fallback sem prefixo falhou:', {
            bucket: fallbackBucket,
            path: fallbackPath,
            error: fallbackResult.error,
            fullResult: fallbackResult,
          });

          fallbackPath = `${storagePath}/${fileName}`;
          fallbackResult = await supabase.storage
            .from(fallbackBucket)
            .upload(fallbackPath, file, { contentType: file.type || undefined, upsert: false });
        }

        if (fallbackResult.error) {
          // nenhum dos tentativas de fallback funcionou — lançar erro com contexto
          const err = fallbackResult.error;
          console.error('Fallback upload falhou (todos):', {
            primary: { bucket: bucketName, path: filePath },
            fallback: { bucket: fallbackBucket, path: fallbackPath },
            error: err,
            primaryResult: uploadResult,
            fallbackResult: fallbackResult,
          });
          // anexar mensagem amigável ao objeto de erro
          const e = new Error(
            `Upload falhou. primary:${bucketName}/${filePath} fallback:${fallbackBucket}/${fallbackPath} - ${err?.message || JSON.stringify(err)}`
          );
          // preservar detalhes no campo extra
          (e as any).details = { primaryResult: uploadResult, fallbackResult };
          throw e;
        }

        // fallback funcionou
        bucketName = fallbackBucket;
        filePath = fallbackPath;
        uploadResult = fallbackResult;
      }

      // Obter URL pública (getPublicUrl é síncrono)
      try {
        const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
        const publicUrl = data?.publicUrl || (data as any)?.public_url || null;
        if (publicUrl) {
          onLogoUrlChange(publicUrl);
          toast.success(`${title} atualizado com sucesso!`);
        } else {
          console.warn('Nenhuma publicUrl retornada para upload:', { bucketName, filePath, data });
        }
      } catch (e) {
        console.error('Erro ao obter publicUrl do storage:', e);
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
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={uploading}
              className="text-muted-foreground file:bg-primary/10 hover:file:bg-primary/20 block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary"
            />
            {selectedFileName && !uploading && (
              <div className="mt-2 text-sm text-gray-600 truncate max-w-full">
                <strong>Arquivo:</strong>&nbsp;<span className="truncate">{selectedFileName}</span>
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">Máximo 2MB. Formatos: PNG, JPG, SVG</p>
        </div>
      </div>

      {/* Escala removida: usar tamanho fixo nos componentes (h-20) */}
    </div>
  );
}
