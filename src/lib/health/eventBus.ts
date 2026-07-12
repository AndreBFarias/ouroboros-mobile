// R-INT-3 (2026-05-16): event bus minimalista pra comunicar falhas
// de sync com o Health Connect entre as funcoes puras de
// `src/lib/health/sync.ts` (que rodam fora de arvore React) e a UI
// (Toast global do _layout).
//
// Padrao T1B3 (AUDIT-T1B3): toast EXPLICITO em qualquer falha de
// permissao ou erro de API, em vez de catch silencioso. Antes desta
// sprint, `escreverTreinoEmHC` / `escreverPesoEmHC` /
// `escreverBodyFatEmHC` / `escreverMenstruacaoEmHC` engoliam toda
// excecao retornando `false`, fazendo o usuario achar que o sync
// estava funcionando enquanto Samsung Health / Google Fit ficavam
// vazios (sintoma reportado na validacao alpha-11).
//
// Implementacao deliberadamente simples: um Set de listeners + emit
// sincrono. Sem deps externas (zustand, RxJS); sem timing async pra
// nao mascarar ordem de eventos em testes. O bridge React (useHCToast)
// subscreve uma vez no _layout dentro do ToastProvider e cancela na
// desmontagem.
//
// Comentarios sem acento (convencao shell/CI).

export type HCSyncMotivo =
  | 'no_module' // SDK nativo ausente (Expo Go, web, Android < 8)
  | 'permission_denied' // requestPermission negada ou subset insuficiente
  | 'api_error'; // qualquer outro erro lancado pelo modulo nativo

export type HCSyncTipo = 'treino' | 'peso' | 'gordura' | 'menstruacao';

export interface HCSyncFailEvent {
  tipo: HCSyncTipo;
  motivo: HCSyncMotivo;
  mensagem: string;
  erro?: unknown;
}

type Listener = (event: HCSyncFailEvent) => void;

const listeners: Set<Listener> = new Set();

// Registra um listener; devolve unsubscribe.
export function subscribeHCSyncFail(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Emite um evento de falha pra todos os listeners. Erros em listeners
// individuais nao impactam outros listeners (defesa minima).
export function emitHCSyncFail(event: HCSyncFailEvent): void {
  for (const l of listeners) {
    try {
      l(event);
    } catch {
      // Listener com bug nao deve bloquear outros.
    }
  }
}

// Util de teste / cleanup global. Remove todos os listeners. Nao usar
// em produto; usado por testes que precisam isolar emissoes entre
// describes.
export function __resetHCSyncFailListeners(): void {
  listeners.clear();
}

// Mensagens canonicas em PT-BR com acentuacao completa (regra UI).
// Helpers expostos pra que o bridge React e os testes compartilhem o
// shape final do toast sem duplicar literais.
export function mensagemCanonica(
  tipo: HCSyncTipo,
  motivo: HCSyncMotivo
): string {
  const sufixo =
    motivo === 'no_module'
      ? 'Conexão Saúde indisponível neste aparelho.'
      : motivo === 'permission_denied'
        ? 'Sem permissão para gravar na Conexão Saúde.'
        : 'Falha ao sincronizar com Conexão Saúde.';
  const prefixoTipo: Record<HCSyncTipo, string> = {
    treino: 'Treino salvo localmente.',
    peso: 'Peso salvo localmente.',
    gordura: 'Medida salva localmente.',
    menstruacao: 'Ciclo salvo localmente.',
  };
  return `${prefixoTipo[tipo]} ${sufixo}`;
}
