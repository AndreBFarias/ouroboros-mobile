// Helper canonico de Promise race com timeout. Funcao pura, sem
// dependencia de UI/store/network. Usado pelos callers de save
// resilient (Bloco I do plano golden-zebra) para impedir loader
// infinito quando SAF write trava em devices com OEMs lentos
// (MIUI/HyperOS/OneUI). Default 10s cobre p99 de write em
// /sdcard/Documents/ sem frustrar o usuario.
//
// Historico:
//   - I-FRASE (M-SAVE-FRASE-VALIDA, 2026-05-07): primeiro caller a
//     declarar comTimeout local em MenuCapturaVerde.
//   - I-HUMOR (M-SAVE-HUMOR-VALIDA, 2026-05-07): segundo caller em
//     humor-rapido. Achado registrado: padrao virou pattern; extracao
//     ficou agendada para o terceiro caller.
//   - I-DIARIO (M-SAVE-DIARIO-VALIDA, 2026-05-07): terceiro caller
//     em diario-emocional. Esta sprint extrai o helper para
//     @/lib/util/comTimeout e migra os 3 callers (FRASE, HUMOR,
//     DIARIO) para importar daqui em vez de declarar local.
//
// Decisoes:
//   - Default exportado SAVE_TIMEOUT_DEFAULT_MS = 10_000 (10s). Caller
//     pode passar ms diferente se conhecer o caso.
//   - Mensagem do erro: 'timeout salvando' (PT-BR sem acento, padrao
//     do projeto para mensagens de erro tecnicas que viram suffix do
//     toast 'Não foi possível salvar: timeout salvando').
//   - Timer e' limpo apos resolve da promise interna para evitar leak
//     em testes que usam jest.useFakeTimers (caso real do humor: sem
//     clearTimeout, fakeTimers acumulava handles entre testes).
//
// Comentarios sem acento (convencao shell/CI).

export const SAVE_TIMEOUT_DEFAULT_MS = 10_000;

export async function comTimeout<T>(
  p: Promise<T>,
  ms: number = SAVE_TIMEOUT_DEFAULT_MS
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race<T>([
      p,
      new Promise<T>((_, rej) => {
        timer = setTimeout(
          () => rej(new Error('timeout salvando')),
          ms
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
