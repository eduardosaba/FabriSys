import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

interface PageAccess {
  href: string;
  label: string;
  icon: string;
  lastAccess: number;
}

export function usePageTracking() {
  const { profile } = useAuth();
  const userId = profile?.id;

  const [pinnedPages, setPinnedPages] = useState<string[]>([]);
  const [recentPages, setRecentPages] = useState<PageAccess[]>([]);

  // 🎯 Sincroniza com o LocalStorage sempre que o Usuário mudar
  useEffect(() => {
    if (typeof window !== 'undefined' && userId) {
      const savedPinned = localStorage.getItem(`pinnedPages_${userId}`);
      const savedRecent = localStorage.getItem(`recentPages_${userId}`);

      setPinnedPages(savedPinned ? JSON.parse(savedPinned) : []);
      setRecentPages(savedRecent ? JSON.parse(savedRecent) : []);
    }
  }, [userId]);

  const togglePinPage = (href: string) => {
    if (!userId) return;
    setPinnedPages((prev) => {
      const newPinned = prev.includes(href) ? prev.filter((p) => p !== href) : [...prev, href];
      localStorage.setItem(`pinnedPages_${userId}`, JSON.stringify(newPinned));
      return newPinned;
    });
  };

  const trackPageAccess = (href: string, label: string, iconName: string) => {
    if (!userId) return;
    const now = Date.now();
    setRecentPages((prev) => {
      const filtered = prev.filter((p) => p.href !== href);
      const newRecent = [{ href, label, icon: iconName, lastAccess: now }, ...filtered].slice(0, 5);
      localStorage.setItem(`recentPages_${userId}`, JSON.stringify(newRecent));
      return newRecent;
    });
  };

  // ... outras funções (clearHistory, etc) seguindo a mesma lógica de conferir se tem userId

  return {
    pinnedPages,
    recentPages,
    togglePinPage,
    trackPageAccess,
    isPagePinned: (href: string) => pinnedPages.includes(href),
    clearHistory: () => {
      setRecentPages([]);
      if (userId) localStorage.removeItem(`recentPages_${userId}`);
    },
  };
}
