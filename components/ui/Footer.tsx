'use client';

import React from 'react';

interface FooterProps {
  companyName?: string;
  currentYear?: number;
  systemVersion?: string;
  theme?: { name?: string };
  profile?: { role?: string };
}

const Footer: React.FC<FooterProps> = ({
  companyName = 'Confectio',
  currentYear = new Date().getFullYear(),
  systemVersion = '1.0.0',
  theme = {},
  profile,
}) => {
  return (
    <footer
      className={`hidden md:flex border-t px-3 py-2 md:px-6 md:py-4 md:fixed md:bottom-0 md:left-0 md:z-40 w-full justify-center`}
      style={{
        background: 'var(--footer-bg, var(--secondary))',
        borderColor: 'var(--primary)',
      }}
    >
      <div className="w-full">
        <div className="flex max-w-7xl w-full items-center justify-between">
          {/* Marca e Direitos Autorais */}
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              {companyName}
            </div>
            <div className="text-xs text-gray-500 hidden sm:block">• © {currentYear}</div>
          </div>

          {/* Informações do Sistema */}
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            {/* Versão do Sistema */}
            <div className="flex items-center gap-2">
              <span className="font-medium">Sistema:</span>
              <span className="rounded bg-gray-100 px-2 py-1 text-xs font-mono dark:bg-gray-800">
                v{systemVersion}
              </span>
            </div>

            {/* Nome do Sistema */}
            <div className="flex items-center gap-2">
              <span className="font-medium">Plataforma:</span>
              <span className="text-gray-800 dark:text-gray-200">{theme.name || 'SAAS'}</span>
            </div>

            {/* Status do Usuário (apenas para debug em desenvolvimento) */}
            {process.env.NODE_ENV === 'development' && profile && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Usuário:</span>
                <span className="rounded bg-primary px-2 py-1 text-xs text-white">
                  {profile.role}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Linha adicional com informações técnicas (visível apenas para master) */}
        {profile?.role === 'master' && (
          <div className="mt-2 border-t border-gray-100 pt-2 dark:border-gray-800 hidden md:block">
            <div className="mx-auto flex max-w-7xl items-center justify-between text-xs text-gray-500 dark:text-gray-500">
              <div>
                <span>Desenvolvido com Next.js • Supabase • Tailwind CSS</span>
              </div>
              <div className="flex items-center gap-4">
                <span>Suporte: suporte@fabrisys.com</span>
                <span>Documentação: docs.fabrisys.com</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};

export default Footer;
