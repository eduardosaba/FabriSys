export function setActiveLocal(localId: string | null) {
  try {
    if (typeof window === 'undefined') return;
    if (localId) {
      window.localStorage.setItem('pdv_active_local', localId);
    } else {
      window.localStorage.removeItem('pdv_active_local');
    }
  } catch (e) {
    // noop
  }
}

export function getActiveLocal(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('pdv_active_local');
  } catch (e) {
    return null;
  }
}
