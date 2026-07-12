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
// A28 (2026-05-06): require lazy + safe stub. expo-speech-recognition
// e modulo nativo nao disponivel em Expo Go. Import top-level
// crashava o boot do bundle ("Cannot find native module
// 'ExpoSpeechRecognition'") em modo dev quando rotas eram pre-
// avaliadas mesmo com lazy=true. Solucao: try/require dinamico que
// retorna null em Expo Go; funcoes lancam erro claro se chamadas
// sem o modulo presente. Em APK preview/release o modulo carrega
// normal e a funcao opera como antes.
import { MicPermissionError } from '@/lib/diario/permissions';

interface ExpoSpeechRecognitionResultEvent {
  isFinal?: boolean;
  results?: Array<{ transcript?: string }>;
}
interface ExpoSpeechRecognitionErrorEvent {
  error?: string;
}
interface SpeechRecognitionModule {
  addListener: (
    event: 'result' | 'error' | 'end',
    cb: (
      e:
        | ExpoSpeechRecognitionResultEvent
        | ExpoSpeechRecognitionErrorEvent
        | unknown
    ) => void
  ) => { remove: () => void };
  start: (config: {
    lang: string;
    interimResults?: boolean;
    continuous?: boolean;
    requiresOnDeviceRecognition?: boolean;
    addsPunctuation?: boolean;
  }) => void;
  abort: () => void;
}

function carregarModulo(): SpeechRecognitionModule | null {
  try {
    const mod = require('expo-speech-recognition') as {
      ExpoSpeechRecognitionModule?: SpeechRecognitionModule;
    };
    return mod.ExpoSpeechRecognitionModule ?? null;
  } catch {
    return null;
  }
}

const IDIOMA = 'pt-BR';

// Códigos de erro do expo-speech-recognition que indicam permissão
// negada ou serviço bloqueado por policy. Códigos vêm da Web Speech
// API spec; o módulo os mapeia para SpeechRecognizer Android. Lista
// fechada -- qualquer código não listado vira Error genérico que o
// caller exibe como 'microfone indisponível'.
const ERROS_PERMISSAO = new Set(['not-allowed', 'service-not-allowed']);

// Inicia uma sessão de transcrição. Resolve com texto final quando
// o reconhecedor encerra (silêncio detectado, stop manual, ou
// resultado final). onPartial recebe os snapshots intermediários
// para feedback ao vivo na UI.
export async function transcribeStream(
  onPartial: (texto: string) => void
): Promise<string> {
  const ExpoSpeechRecognitionModule = carregarModulo();
  if (!ExpoSpeechRecognitionModule) {
    throw new Error(
      'Microfone disponível apenas no app instalado. Em Expo Go, este recurso fica desativado.'
    );
  }
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
      ExpoSpeechRecognitionModule.addListener('result', (raw) => {
        const e = raw as ExpoSpeechRecognitionResultEvent;
        if (!e.results || e.results.length === 0) return;
        const transcript = e.results[0].transcript ?? '';
        if (e.isFinal) {
          textoFinal = transcript;
        } else {
          parcialMaisRecente = transcript;
          onPartial(parcialMaisRecente);
        }
      })
    );

    subs.push(
      ExpoSpeechRecognitionModule.addListener('error', (raw) => {
        const e = raw as ExpoSpeechRecognitionErrorEvent;
        const code = e.error || '';
        if (ERROS_PERMISSAO.has(code)) {
          falhar(new MicPermissionError());
          return;
        }
        falhar(new Error(`erro de voz: ${code || 'desconhecido'}`));
      })
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
        // Q5.2 (Onda Q, 2026-05-12): continuous=true permite fala
        // longa sem timeout de silencio do SpeechRecognizer Android
        // (default fechava a sessao apos ~6-8s sem audio). Caller
        // chama abort() no release do botao para encerrar manualmente.
        continuous: true,
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
// meio de uma transcrição (ex.: usuário fecha sheet). No-op em Expo
// Go (modulo nativo ausente).
export async function cancel(): Promise<void> {
  const mod = carregarModulo();
  if (!mod) return;
  try {
    mod.abort();
  } catch {
    // ignora: sessão pode já ter encerrado
  }
}

// Alias retrocompatível para callers que importavam cancelTranscribe
// (nome usado em MicrofoneButton.tsx). Mantém API estável.
export const cancelTranscribe = cancel;
