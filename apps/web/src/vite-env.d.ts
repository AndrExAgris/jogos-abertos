/// <reference types="svelte" />
/// <reference types="vite/client" />

declare const __VERSAO__: string;

interface PreferenciasOD {
  tema: string;
  primaria: string;
  secundaria: string;
  densidade: string;
  movimento: string;
  temaAplicado: 'claro' | 'escuro';
}

interface Window {
  OpenDesign: {
    preferencias(): PreferenciasOD;
    definir(p: Partial<Record<keyof PreferenciasOD, string>>): void;
    restaurar(): void;
    toast(op: { tipo?: 'sucesso' | 'erro' | 'aviso' | 'info'; texto: string; acao?: { rotulo: string; ao?: () => void } }): void;
    abrirDialogo(id: string | HTMLElement): void;
    fecharDialogo(id: string | HTMLElement, valor?: string): void;
  };
}
