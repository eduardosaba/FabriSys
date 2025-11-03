import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// 60s timeout para evitar problemas com o upload de arquivos grandes
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;

    if (!file || !path) {
      return NextResponse.json({ error: 'Arquivo e caminho são obrigatórios' }, { status: 400 });
    }

    // Criar uma URL única para o arquivo no bucket public
    const fileExt = file.name.split('.').pop();
    const fileName = `${path.replace(/\.[^/.]+$/, '')}.${fileExt}`;

    // Upload do arquivo para o bucket public
    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase.storage.from('public').upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    });

    if (error) throw error;

    // Pegar a URL pública do arquivo
    const {
      data: { publicUrl },
    } = supabase.storage.from('public').getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    return NextResponse.json({ error: 'Erro ao fazer upload do arquivo' }, { status: 500 });
  }
}
