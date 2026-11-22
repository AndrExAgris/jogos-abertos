import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.andrexagris.jogosabertos',
  appName: 'Jogos Abertos',
  webDir: 'dist',
  android: {
    // Tudo vem do próprio APK; nada de conteúdo misto.
    allowMixedContent: false,
  },
};

export default config;
