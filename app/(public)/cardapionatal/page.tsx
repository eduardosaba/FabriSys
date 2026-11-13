import type { Metadata } from 'next';
import ChristmasFlipbook from '@/components/cardapionatal/ChristmasFlipbook';
import '@/components/cardapionatal/flipbook.css';
import { carregarDados } from '@/lib/cardapio-natal-dados';

// Revalida a cada 60s: edições feitas no admin aparecem rapidamente sem novo deploy.
export const revalidate = 60;

const TITULO = 'Cardápio Natalino | Larissa Saba Gourmet';
const DESCRICAO =
  'Brownies, tortas, empadões, pão metro e muito mais para o seu Natal. Folheie o cardápio e faça sua encomenda pelo WhatsApp.';
const IMAGEM_PADRAO = '/cardapionatal/og-padrao.jpg'; // 1200x630

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await carregarDados();
  const imagem = config.og_image_url ?? IMAGEM_PADRAO;
  return {
    // URLs relativas (imagem padrão) precisam de um domínio absoluto para o WhatsApp
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.larissasaba.repvendas.com.br'
    ),
    title: TITULO,
    description: DESCRICAO,
    openGraph: {
      title: TITULO,
      description: DESCRICAO,
      type: 'website',
      locale: 'pt_BR',
      siteName: 'Larissa Saba Gourmet',
      images: [
        { url: imagem, width: 1200, height: 630, alt: 'Cardápio Natalino — Larissa Saba Gourmet' },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: TITULO,
      description: DESCRICAO,
      images: [imagem],
    },
  };
}

export default async function CardapioNatalPage() {
  const { produtos, paginas, config } = await carregarDados();
  return <ChristmasFlipbook produtos={produtos} paginas={paginas} config={config} />;
}
