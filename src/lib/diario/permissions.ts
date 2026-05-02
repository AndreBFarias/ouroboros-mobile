// Helper unico para pedir permissao de microfone (M06.5).
// Pede apenas Audio.requestPermissionsAsync (expo-av) -- a permissao do
// reconhecedor de voz nativo Android e gerenciada pelo proprio sistema
// na primeira invocacao do Voice.start(); se o usuario tiver mic ok mas
// SpeechRecognizer desligado, a falha sai via onSpeechError em runtime
// (caller trata via try/catch em transcribeStream). Sub-sprint M06.5.x
// pode adicionar Voice.isRecognitionAvailable() proativo se UX do erro
// runtime for ruim na pratica.
//
// Erro de permissao tipado para o consumidor distinguir do erro
// generico (ex.: hardware indisponivel). Caller exibe toast diferente
// para cada caso (ADR-0007: zero rede, mensagens claras).
import { Audio } from 'expo-av';

export class MicPermissionError extends Error {
  constructor(message = 'permissao de microfone negada') {
    super(message);
    this.name = 'MicPermissionError';
  }
}

// Pede permissao de microfone via expo-av. Retorna true se liberado,
// false se negado. Nao lanca - caller decide UX (toast vs deep link).
export async function requestMicPermission(): Promise<boolean> {
  try {
    const result = await Audio.requestPermissionsAsync();
    return result.granted === true;
  } catch {
    return false;
  }
}
