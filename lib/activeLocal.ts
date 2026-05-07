export function setActiveLocal(localId: string | null) {
  try {
    if (typeof window === 'undefined') return;
    if (localId) {
      window.localStorage.setItem('pdv_active_local', localId);
    } else {
      window.localStorage.removeItem('pdv_active_local');
    }
    // Dispara um evento customizado para notificar reatividade na mesma aba
    try {
      const ev = new CustomEvent('pdv_active_local_change', { detail: { localId } });
      window.dispatchEvent(ev);
    } catch (e) {
      void e;
    }
  } catch (e) {
    void e;
  }
}

export function getActiveLocal(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('pdv_active_local');
  } catch (e) {
    void e;
    return null;
  }
}
