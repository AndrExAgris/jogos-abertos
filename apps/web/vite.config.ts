import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const versao = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version as string;

/*
 * O Open Design é carregado como o README dele manda: <link> e <script> no
 * <head>, sem passar pelo bundler. Este plugin serve a pasta no
 * desenvolvimento e copia os arquivos para /open-design/ no build.
 */
const pastaOD = fileURLToPath(new URL('../../packages/ui/open-design', import.meta.url));
const tipos: Record<string, string> = {
  '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.txt': 'text/plain', '.md': 'text/markdown',
};
function listar(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? listar(p) : [p];
  });
}
function openDesign(): Plugin {
  return {
    name: 'ja-open-design',
    configureServer(server) {
      server.middlewares.use('/open-design', (req, res, next) => {
        const caminho = join(pastaOD, decodeURIComponent((req.url ?? '/').split('?')[0]));
        if (!caminho.startsWith(pastaOD)) return next();
        try {
          const dados = readFileSync(caminho);
          res.setHeader('Content-Type', tipos[extname(caminho)] ?? 'application/octet-stream');
          res.end(dados);
        } catch {
          next();
        }
      });
    },
    generateBundle() {
      for (const arquivo of listar(pastaOD)) {
        this.emitFile({
          type: 'asset',
          fileName: `open-design/${relative(pastaOD, arquivo)}`,
          source: readFileSync(arquivo),
        });
      }
    },
  };
}

export default defineConfig({
  base: './',
  define: {
    __VERSAO__: JSON.stringify(versao),
  },
  plugins: [
    openDesign(),
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icones/*.png'],
      manifest: {
        id: './',
        name: 'Jogos Abertos',
        short_name: 'Jogos Abertos',
        description: 'Minijogos clássicos em português, para jogar sozinho ou a dois, sem internet.',
        lang: 'pt-BR',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#181a1d',
        theme_color: '#181a1d',
        icons: [
          { src: 'icones/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icones/icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icones/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tudo em cache: o app tem que abrir sem internet.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest,json,txt}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  build: {
    target: 'es2020',
  },
  worker: {
    format: 'es',
  },
});
