import { create } from 'zustand';

/** Merkt sich das Installationsangebot des Browsers (Chrome/Edge/Android), damit die App einen eigenen Knopf zeigen kann. */
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const useInstall = create<{ prompt: InstallPrompt | null; installed: boolean }>(() => ({
  prompt: null,
  installed: typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches,
}));

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    useInstall.setState({ prompt: e as InstallPrompt });
  });
  window.addEventListener('appinstalled', () => useInstall.setState({ prompt: null, installed: true }));
}

export async function install() {
  const p = useInstall.getState().prompt;
  if (!p) return;
  await p.prompt();
  await p.userChoice;
  useInstall.setState({ prompt: null });
}
