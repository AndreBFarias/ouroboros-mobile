// Wrapper sobre @react-native-voice/voice para transcricao de fala
// on-device em PT-BR (M06.5). Idioma fixo 'pt-BR'. Nao usa nuvem -
// se o reconhecedor nativo do Android cair em fallback de rede,
// caller aborta e mostra toast (ADR-0007: zero rede).
//
// API minima: transcribeStream resolve com texto final no
// onSpeechResults; rejeita com MicPermissionError se faltar
// permissao. cancel limpa listeners e aborta a sessao em curso.
import Voice, {
  type SpeechErrorEvent,
  type SpeechResultsEvent,
} from '@react-native-voice/voice';
import { MicPermissionError } from '@/lib/diario/permissions';

const IDIOMA = 'pt-BR';

// Eventos de erro do Voice que indicam permissao negada ou hardware
// indisponivel. Codigos sao strings curtas do SpeechRecognizer
// nativo do Android; mantemos a lista no minimo para nao engessar
// (qualquer codigo nao listado vira Error generico que o caller
// exibe como 'microfone indisponivel' -- so codigos do Set acima
// sao tratados como MicPermissionError).
const ERROS_PERMISSAO = new Set([
  '9', // ERROR_INSUFFICIENT_PERMISSIONS
  'permissions',
]);

// Inicia uma sessao de transcricao. Resolve com texto final quando
// o reconhecedor encerra naturalmente (silencio detectado) ou
// quando caller chama Voice.stop. onPartial recebe os snapshots
// intermediarios para feedback ao vivo na UI.
export async function transcribeStream(
  onPartial: (texto: string) => void
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let textoFinal = '';
    let parcialMaisRecente = '';

    const limpar = () => {
      Voice.removeAllListeners();
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        parcialMaisRecente = e.value[0];
        onPartial(parcialMaisRecente);
      }
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        textoFinal = e.value[0];
      }
      limpar();
      // Fallback para o ultimo parcial caso o reconhecedor encerre
      // sem disparar onSpeechResults com value preenchido (acontece
      // em sessoes muito curtas no Android 12+).
      resolve(textoFinal.length > 0 ? textoFinal : parcialMaisRecente);
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      limpar();
      const code = e?.error?.code ? String(e.error.code) : '';
      if (ERROS_PERMISSAO.has(code)) {
        reject(new MicPermissionError());
        return;
      }
      reject(new Error(`erro de voz: ${code || 'desconhecido'}`));
    };

    Voice.onSpeechEnd = () => {
      // Se chegou aqui sem onSpeechResults, resolve com o ultimo
      // parcial (ou string vazia). Evita Promise pendurada quando
      // o engine fecha sem texto definitivo.
      if (textoFinal.length === 0 && parcialMaisRecente.length === 0) {
        limpar();
        resolve('');
      }
    };

    Voice.start(IDIOMA).catch((err: unknown) => {
      limpar();
      const msg = err instanceof Error ? err.message : String(err);
      if (/permission/i.test(msg)) {
        reject(new MicPermissionError(msg));
        return;
      }
      reject(err instanceof Error ? err : new Error(msg));
    });
  });
}

// Aborta a sessao em curso e limpa listeners. Idempotente: chamar
// duas vezes nao quebra. Caller usa quando componente desmonta no
// meio de uma transcricao (ex.: usuario fecha sheet).
export async function cancel(): Promise<void> {
  try {
    await Voice.stop();
  } catch {
    // ignora: sessao pode ja ter encerrado
  }
  try {
    await Voice.destroy();
  } catch {
    // ignora
  }
  Voice.removeAllListeners();
}
