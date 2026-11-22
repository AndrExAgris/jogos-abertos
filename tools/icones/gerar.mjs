// Gera os ícones PNG do app (PWA e Android) a partir de icone.svg.
// Uso: pnpm --filter @ja/tools-icones gerar
import sharp from 'sharp';
import { mkdir, copyFile, access, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..', '..');
const svg = join(aqui, 'icone.svg');
const pub = join(raiz, 'apps/web/public');

async function png(saida, tamanho, recorte = 1) {
  await mkdir(dirname(saida), { recursive: true });
  // recorte < 1 amplia o centro (ícone "any" com menos margem que o maskable).
  const base = Math.round(tamanho / recorte);
  const margem = Math.round((base - tamanho) / 2);
  await sharp(svg, { density: 384 })
    .resize(base, base)
    .extract({ left: margem, top: margem, width: tamanho, height: tamanho })
    .png()
    .toFile(saida);
  console.log('ok', saida.replace(raiz + '/', ''));
}

await copyFile(svg, join(pub, 'favicon.svg'));
await png(join(pub, 'icones/icone-192.png'), 192, 0.8);
await png(join(pub, 'icones/icone-512.png'), 512, 0.8);
await png(join(pub, 'icones/icone-maskable-512.png'), 512);
await png(join(pub, 'icones/apple-touch-icon.png'), 180, 0.8);

// Android (só se o projeto nativo já existir).
const res = join(raiz, 'apps/web/android/app/src/main/res');
try {
  await access(res);
  const densidades = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, f] of Object.entries(densidades)) {
    await png(join(res, `mipmap-${d}/ic_launcher.png`), Math.round(48 * f), 0.8);
    await png(join(res, `mipmap-${d}/ic_launcher_round.png`), Math.round(48 * f), 0.8);
    // Primeiro plano do ícone adaptativo: 108 dp, com a arte no centro de 72 dp.
    await png(join(res, `mipmap-${d}/ic_launcher_foreground.png`), Math.round(108 * f));
  }
  // Tela de abertura: a grade no centro, sobre o fundo escuro, em cada tamanho que o Capacitor criou.
  for (const pasta of (await readdir(res)).filter((p) => p.startsWith('drawable'))) {
    const arquivo = join(res, pasta, 'splash.png');
    try { await access(arquivo); } catch { continue; }
    const { width, height } = await sharp(arquivo).metadata();
    const lado = Math.round(Math.min(width, height) * 0.5);
    const arte = await sharp(svg, { density: 384 }).resize(lado, lado).png().toBuffer();
    await sharp({ create: { width, height, channels: 3, background: '#181a1d' } })
      .composite([{ input: arte, gravity: 'center' }])
      .png()
      .toFile(arquivo + '.tmp');
    await copyFile(arquivo + '.tmp', arquivo);
    const { unlink } = await import('node:fs/promises');
    await unlink(arquivo + '.tmp');
    console.log('ok', arquivo.replace(raiz + '/', ''));
  }
} catch {
  console.log('Projeto Android ainda não existe; pulei os ícones nativos.');
}
