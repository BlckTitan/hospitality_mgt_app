let navigate: (path: string) => void = (path) => {
  window.location.assign(path);
};

export function registerListNavigator(fn: (path: string) => void) {
  navigate = fn;
}

export function goToList(path: string) {
  if (typeof window === 'undefined') return;
  const target = new URL(path, window.location.origin);
  if (target.pathname === window.location.pathname && target.search === window.location.search) {
    return;
  }
  navigate(path);
}
