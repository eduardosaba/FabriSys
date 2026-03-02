import DashboardClientWrapper from '@/components/dashboard/DashboardClientWrapper';
import { fetchSystemTheme } from '@/lib/supabase-service';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // 1. Busca configs via Service Role (server-only)
  const configs = await fetchSystemTheme();

  const getCfg = (key: string, fallback?: string) =>
    configs?.find((c: any) => c.chave === key)?.valor ?? fallback;

  const theme = {
    primary: getCfg('theme_primary_color', '#2563eb'),
    secondary: getCfg('theme_secondary_color', '#64748b'),
    background: getCfg('theme_bg_color', '#f8fafc'),
    sidebar: getCfg('theme_sidebar_color', '#0f172a'),
    logo: getCfg('company_logo_url') || getCfg('logo_url') || '/logo.png',
  };

  const css = `:root {
    --primary-color: ${theme.primary};
    --primary-hover: ${theme.primary}dd;
    --secondary-color: ${theme.secondary};
    --bg-dashboard: ${theme.background};
    --sidebar-bg: ${theme.sidebar};
  }
  body { background-color: var(--bg-dashboard); }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <DashboardClientWrapper logoUrl={theme.logo}>{children}</DashboardClientWrapper>
    </>
  );
}
