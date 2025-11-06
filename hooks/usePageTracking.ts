import { useState } from 'react';
import { useAuth } from '@/lib/auth';

interface PageAccess {
  href: string;
  label: string;
  icon: string;
  lastAccess: number;
}

export function usePageTracking() {
  const { profile } = useAuth();
  const userId = profile?.id || 'default';

  const [pinnedPages, setPinnedPages] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`pinnedPages_${userId}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [recentPages, setRecentPages] = useState<PageAccess[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`recentPages_${userId}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Função para fixar/desfixar página
  const togglePinPage = (href: string) => {
    setPinnedPages((prev) => {
      const newPinned = prev.includes(href) ? prev.filter((p) => p !== href) : [...prev, href];

      if (typeof window !== 'undefined') {
        localStorage.setItem(`pinnedPages_${userId}`, JSON.stringify(newPinned));
      }
      return newPinned;
    });
  };

  // Função para registrar acesso à página
  const trackPageAccess = (href: string, label: string, iconName: string) => {
    const now = Date.now();
    setRecentPages((prev) => {
      const filtered = prev.filter((p) => p.href !== href);
      const newRecent = [{ href, label, icon: iconName, lastAccess: now }, ...filtered].slice(0, 5);

      if (typeof window !== 'undefined') {
        localStorage.setItem(`recentPages_${userId}`, JSON.stringify(newRecent));
      }
      return newRecent;
    });
  };

  // Função para verificar se uma página está fixada
  const isPagePinned = (href: string) => pinnedPages.includes(href);

  // Função para limpar histórico
  const clearHistory = () => {
    setRecentPages([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`recentPages_${userId}`);
    }
  };

  // Função para limpar páginas fixadas
  const clearPinnedPages = () => {
    setPinnedPages([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`pinnedPages_${userId}`);
    }
  };

  return {
    pinnedPages,
    recentPages,
    togglePinPage,
    trackPageAccess,
    isPagePinned,
    clearHistory,
    clearPinnedPages,
  };
}
