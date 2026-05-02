// Wrapper sobre expo-speech-recognition para transcrição de fala
// on-device em PT-BR (M06.5). Idioma fixo 'pt-BR'. Não usa nuvem --
// se o reconhecedor nativo do Android cair em fallback de rede,
// caller aborta e mostra toast (ADR-0007: zero rede).
//
// Substituiu @react-native-voice/voice (deprecated, usava
// com.android.support legado e quebrava manifest merger no Gradle 8
// por conflito com androidx.core). expo-speech-recognition usa
// AndroidX nativamente e segue New Architecture do RN.
//
// API mínima: transcribeStream resolve com texto final no evento
// 'result' isFinal=true; rejeita com MicPermissionError em
// 'not-allowed'/'service-not-allowed'. cancel limpa listeners e
// aborta a sessão em curso (idempotente).
import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionResultEvent,
  type ExpoSpeechRecognitionErrorEvent,
} from 'expo-speech-recognition';
import { MicPermissionError } from '@/lib/diario/permissions';

const IDIOMA = 'pt-BR';

// Códigos de erro do expo-speech-recognition que indicam permissão
// negada ou serviço bloqueado por policy. Códigos vêm da Web Speech
// API spec; o módulo os mapeia para SpeechRecognizer Android. Lista
// fechada -- qualquer código não listado vira Error genérico que o
// caller exibe como 'microfone indisponível'.
const ERROS_PERMISSAO = new Set([
  'not-allowed',
  'service-not-allowed',
]);

// Inicia uma sessão de transcrição. Resolve com texto final quando
// o reconhecedor encerra (silêncio detectado, stop manual, ou
// resultado final). onPartial recebe os snapshots intermediários
// para feedback ao vivo na UI.
export async function transcribeStream(
  onPartial: (texto: string) => void
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let textoFinal = '';
    let parcialMaisRecente = '';

    // Subscriptions retornadas por addListener. Guardadas para
    // cleanup determinístico (limpar() chamado em todos os caminhos
    // de saída -- success, error, end).
    const subs: { remove: () => void }[] = [];
    let resolvido = false;

    const limpar = () => {
      subs.forEach((s) => {
        try {
          s.remove();
        } catch {
          // ignora se a subscription já foi removida
        }
      });
      subs.length = 0;
    };

    const concluir = (texto: string) => {
      if (resolvido) return;
      resolvido = true;
      limpar();
      resolve(texto);
    };

    const falhar = (erro: Error) => {
      if (resolvido) return;
      resolvido = true;
      limpar();
      reject(erro);
    };

    subs.push(
      ExpoSpeechRecognitionModule.addListener(
        'result',
        (e: ExpoSpeechRecognitionResultEvent) => {
          if (!e.results || e.results.length === 0) return;
          const transcript = e.results[0].transcript ?? '';
          if (e.isFinal) {
            textoFinal = transcript;
          } else {
            parcialMaisRecente = transcript;
            onPartial(parcialMaisRecente);
          }
        }
      )
    );

    subs.push(
      ExpoSpeechRecognitionModule.addListener(
        'error',
        (e: ExpoSpeechRecognitionErrorEvent) => {
          const code = e.error || '';
          if (ERROS_PERMISSAO.has(code)) {
            falhar(new MicPermissionError());
            return;
          }
          falhar(new Error(`erro de voz: ${code || 'desconhecido'}`));
        }
      )
    );

    // 'end' dispara depois de stop()/abort() ou silêncio prolongado.
    // Fallback para o último parcial caso o reconhecedor encerre sem
    // 'result' final preenchido (sessões muito curtas no Android 12+).
    subs.push(
      ExpoSpeechRecognitionModule.addListener('end', () => {
        concluir(textoFinal.length > 0 ? textoFinal : parcialMaisRecente);
      })
    );

    try {
      ExpoSpeechRecognitionModule.start({
        lang: IDIOMA,
        interimResults: true,
        continuous: false,
        // requiresOnDeviceRecognition true respeita ADR-0007
        // (zero rede). Em devices sem suporte on-device, o módulo
        // emite 'service-not-allowed' que cai no ERROS_PERMISSAO.
        requiresOnDeviceRecognition: true,
        addsPunctuation: true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/permission/i.test(msg) || /not-allowed/i.test(msg)) {
        falhar(new MicPermissionError(msg));
        return;
      }
      falhar(err instanceof Error ? err : new Error(msg));
    }
  });
}

// Aborta a sessão em curso e limpa listeners. Idempotente: chamar
// duas vezes não quebra. Caller usa quando componente desmonta no
// meio de uma transcrição (ex.: usuário fecha sheet).
export async function cancel(): Promise<void> {
  try {
    ExpoSpeechRecognitionModule.abort();
  } catch {
    // ignora: sessão pode já ter encerrado
  }
}

// Alias retrocompatível para callers que importavam cancelTranscribe
// (nome usado em MicrofoneButton.tsx). Mantém API estável.
export const cancelTranscribe = cancel;
