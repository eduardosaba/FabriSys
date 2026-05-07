'use client';

import { X } from 'lucide-react';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type FullscreenContextType = {
  isFullScreen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  toggleForTarget: () => void; // finds [data-fullscreen-target] inside provider
};

const FullscreenContext = createContext<FullscreenContextType | undefined>(undefined);

export function FullScreenProvider({ children }: { children: React.ReactNode }) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const ANIM_DURATION = 220;

  const open = useCallback(() => setIsFullScreen(true), []);
  const toggle = useCallback(() => setIsFullScreen((s) => !s), []);

  const close = useCallback(() => {
    const t = targetRef.current;
    if (!t) {
      setIsFullScreen(false);
      return;
    }
    try {
      t.style.transition = `transform ${ANIM_DURATION}ms ease-in-out, opacity ${ANIM_DURATION}ms ease-in-out`;
      // animate to slightly smaller + fade out
      t.style.transform = 'scale(0.98)';
      t.style.opacity = '0';
    } catch (e) {
      void e;
    }
    // wait for animation then disable fullscreen and let effect cleanup restore styles
    setTimeout(() => setIsFullScreen(false), ANIM_DURATION + 10);
  }, []);

  // Toggle focusing the first element marked with data-fullscreen-target
  const toggleForTarget = useCallback(() => {
    if (!rootRef.current) return;
    const el = rootRef.current.querySelector('[data-fullscreen-target]');
    if (!el) {
      const mainEl = rootRef.current.querySelector('main');
      if (mainEl && mainEl instanceof HTMLElement) {
        targetRef.current = mainEl;
      } else {
        targetRef.current = null;
      }
    } else {
      if (el instanceof HTMLElement) targetRef.current = el;
      else targetRef.current = null;
    }

    setIsFullScreen((s) => !s);
  }, []);

  // apply/remove styles on target when isFullScreen changes
  useEffect(() => {
    const root = rootRef.current;
    const target = targetRef.current;
    if (isFullScreen && root && target) {
      // Dim only truly independent siblings (not ancestors) — but we will hide header/aside explicitly below.
      Array.from(root.children).forEach((c) => {
        try {
          if (c === target || (c as HTMLElement).contains(target)) return;
        } catch (e) {
          // ignore
        }
        (c as HTMLElement).style.transition = 'opacity 180ms ease-in-out';
        (c as HTMLElement).style.opacity = '0.06';
        (c as HTMLElement).setAttribute('aria-hidden', 'true');
      });

      const prev = {
        position: target.style.position,
        zIndex: target.style.zIndex,
        inset: (target.style as any).inset,
        left: (target.style as any).left,
        top: (target.style as any).top,
        right: (target.style as any).right,
        bottom: (target.style as any).bottom,
        width: target.style.width,
        height: target.style.height,
        transition: target.style.transition,
        transform: target.style.transform,
        overflow: target.style.overflow,
        opacity: target.style.opacity,
        margin: target.style.margin,
        maxWidth: (target.style as any).maxWidth,
        boxSizing: (target.style as any).boxSizing,
      };
      (target as any).__prev_fs_styles = prev;

      // Hide common header/sidebar elements to let the target occupy whole viewport.
      const selectors = ['header', 'aside', '.sidebar', '#sidebar', '.app-sidebar', '.left-rail'];
      const hidden: Array<{ el: Element; prevDisplay: string }> = [];
      selectors.forEach((sel) => {
        try {
          document.querySelectorAll(sel).forEach((el) => {
            // don't hide if the element contains the target
            if (el.contains(target)) return;
            const prevDisplay = (el as HTMLElement).style.display || '';
            hidden.push({ el, prevDisplay });
            (el as HTMLElement).style.display = 'none';
            (el as HTMLElement).setAttribute('data-fs-hidden', 'true');
          });
        } catch (e) {
          // ignore
        }
      });
      (target as any).__prev_fs_hidden = hidden;

      // prevent body scroll while in fullscreen
      try {
        (document.body as any).__prev_overflow = document.body.style.overflow || '';
        document.body.style.overflow = 'hidden';
      } catch (e) {
        void e;
      }
      // Expand target to fill viewport and prepare animation
      try {
        Object.assign(target.style, {
          position: 'fixed',
          zIndex: '10020',
          left: '0',
          top: '0',
          right: '0',
          bottom: '0',
          width: '100vw',
          maxWidth: 'none',
          boxSizing: 'border-box',
          height: '100vh',
          transition: `transform ${ANIM_DURATION}ms ease-in-out, opacity ${ANIM_DURATION}ms ease-in-out`,
          transform: 'scale(0.98)',
          opacity: '0',
          overflow: 'auto',
          margin: '0',
        } as any);

        // force reflow then animate to full
        void target.getBoundingClientRect();
        requestAnimationFrame(() => {
          try {
            target.style.transform = 'scale(1)';
            target.style.opacity = '1';
          } catch (e) {
            void e;
          }
        });
      } catch (e) {
        void e;
      }

      try {
        target.focus({ preventScroll: true });
      } catch (e) {
        void e;
      }
    }

    if (!isFullScreen && root && target) {
      Array.from(root.children).forEach((c) => {
        try {
          if (c === target || (c as HTMLElement).contains(target)) return;
        } catch (e) {
          void e;
        }
        (c as HTMLElement).style.opacity = '';
        (c as HTMLElement).removeAttribute('aria-hidden');
      });

      // restore hidden header/sidebar
      try {
        const hidden = (target as any).__prev_fs_hidden || [];
        hidden.forEach((h: any) => {
          try {
            (h.el as HTMLElement).style.display = h.prevDisplay || '';
            (h.el as HTMLElement).removeAttribute('data-fs-hidden');
          } catch (e) {
            void e;
          }
        });
      } catch (e) {
        void e;
      }

      // restore body overflow
      try {
        const prevOverflow = (document.body as any).__prev_overflow;
        if (typeof prevOverflow !== 'undefined') document.body.style.overflow = prevOverflow || '';
      } catch (e) {
        void e;
      }

      const prev = (target as any).__prev_fs_styles || {};
      Object.assign(target.style, {
        position: prev.position || '',
        zIndex: prev.zIndex || '',
        left: prev.left || '',
        top: prev.top || '',
        right: prev.right || '',
        bottom: prev.bottom || '',
        width: prev.width || '',
        height: prev.height || '',
        transition: prev.transition || '',
        transform: prev.transform || '',
        overflow: prev.overflow || '',
        opacity: typeof prev.opacity !== 'undefined' ? prev.opacity : '',
        margin: prev.margin || '',
        maxWidth: prev.maxWidth || '',
        boxSizing: prev.boxSizing || '',
      } as any);
      try {
        target.blur();
      } catch (e) {
        void e;
      }
      targetRef.current = null;
    }

    return () => {
      if (root && targetRef.current) {
        Array.from(root.children).forEach((c) => {
          (c as HTMLElement).style.opacity = '';
          (c as HTMLElement).removeAttribute('aria-hidden');
        });
        const t = targetRef.current;
        if (t) {
          const prev = (t as any).__prev_fs_styles || {};
          Object.assign(t.style, {
            position: prev.position || '',
            zIndex: prev.zIndex || '',
            inset: prev.inset || '',
            width: prev.width || '',
            height: prev.height || '',
            transition: prev.transition || '',
            transform: prev.transform || '',
            opacity: typeof prev.opacity !== 'undefined' ? prev.opacity : '',
            margin: prev.margin || '',
          } as any);
        }
      }
    };
  }, [isFullScreen]);

  // ESC handler to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        try {
          close();
        } catch (err) {
          setIsFullScreen(false);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullScreen]);

  return (
    <FullscreenContext.Provider value={{ isFullScreen, open, close, toggle, toggleForTarget }}>
      <div id="app-fullscreen-root" ref={rootRef} className={`min-h-screen`}>
        {children}
        {isFullScreen && (
          <button
            aria-label="Sair da tela cheia"
            onClick={close}
            onMouseDown={(e) => e.stopPropagation()}
            className="fixed top-4 right-4 z-[10050] inline-flex items-center justify-center rounded-md bg-white/90 p-2 shadow-lg hover:bg-white pointer-events-auto"
            style={{ backdropFilter: 'blur(6px)', pointerEvents: 'auto', zIndex: 10050 }}
          >
            <X className="h-5 w-5 text-slate-900" />
          </button>
        )}
      </div>
    </FullscreenContext.Provider>
  );
}

export function useFullScreen() {
  const ctx = useContext(FullscreenContext);
  if (!ctx) throw new Error('useFullScreen must be used within FullScreenProvider');
  return ctx;
}

// Safe hook that never throws — returns noop functions when provider is missing.
export function useFullScreenSafe() {
  const ctx = useContext(FullscreenContext);
  if (!ctx)
    return {
      isFullScreen: false,
      open: () => {},
      close: () => {},
      toggle: () => {},
      toggleForTarget: () => {},
    } as FullscreenContextType;
  return ctx;
}

export default FullScreenProvider;
