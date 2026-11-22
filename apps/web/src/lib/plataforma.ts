import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { voltar } from './rotas.svelte.ts';

export const nativo = Capacitor.isNativePlatform();

/**
 * Botão Voltar do Android: fecha diálogo aberto, senão volta uma tela, e no
 * início sai do app.
 */
export function ligarVoltarAndroid(): void {
  if (!nativo) return;
  void App.addListener('backButton', () => {
    const dialogo = document.querySelector<HTMLDialogElement>('dialog[open]');
    if (dialogo) {
      dialogo.close();
      return;
    }
    const caminho = location.hash.replace(/^#/, '') || '/';
    if (caminho === '/') void App.exitApp();
    else voltar();
  });
}

/** Entrega um arquivo ao usuário: download no navegador, compartilhar no Android. */
export async function salvarArquivo(nome: string, conteudo: string, tipo = 'application/json'): Promise<void> {
  if (nativo) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const escrito = await Filesystem.writeFile({
      path: nome, data: conteudo, directory: Directory.Cache, encoding: Encoding.UTF8,
    });
    await Share.share({ title: nome, files: [escrito.uri], dialogTitle: 'Salvar cópia do progresso' });
    return;
  }
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
