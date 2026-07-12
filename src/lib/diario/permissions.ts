// Helper único para pedir permissão de microfone (M06.5).
// Combina Audio.requestPermissionsAsync (expo-av, captura do .m4a)
// com ExpoSpeechRecognitionModule.requestPermissionsAsync
// (expo-speech-recognition, transcrição on-device). Retorna true só
// se ambas liberarem; caller decide UX.
//
// Antes da migração para expo-speech-recognition (M06.5 + INTEGRACAO),
// só pedíamos a permissão do expo-av e contávamos com o sistema para
// gerenciar a permissão do reconhecedor de voz na primeira invocação.
// Como o módulo novo expõe requestPermissionsAsync explícito, agora
// pedimos as duas de uma vez antes de iniciar a gravação -- o erro
// de runtime que vinha via onSpeechError some quando o usuário tem
// só uma das duas.
//
// Erro de permissão tipado para o consumidor distinguir do erro
// genérico (ex.: hardware indisponível). Caller exibe toast diferente
// para cada caso (ADR-0007: zero rede, mensagens claras).
// A28 (2026-05-06): import top-level de expo-speech-recognition
// crashava em Expo Go ("Cannot find native module"). Movido para
// require lazy via helper carregarSpeech.
import { Audio } from 'expo-av';

interface SpeechPermsModule {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
}
function carregarSpeech(): SpeechPermsModule | null {
  try {
    const mod = require('expo-speech-recognition') as {
      ExpoSpeechRecognitionModule?: SpeechPermsModule;
    };
    return mod.ExpoSpeechRecognitionModule ?? null;
  } catch {
    return null;
  }
}

export class MicPermissionError extends Error {
  constructor(message = 'Permissão de microfone negada.') {
    super(message);
    this.name = 'MicPermissionError';
  }
}

// Pede permissões de microfone (gravação) e reconhecimento de voz
// (transcrição). Retorna true se ambas liberadas, false caso
// contrário. Não lança -- caller decide UX (toast vs deep link).
// Em Expo Go, o módulo de speech recognition não existe; retorna
// false para que o caller mostre toast informativo.
export async function requestMicPermission(): Promise<boolean> {
  try {
    const audio = await Audio.requestPermissionsAsync();
    if (audio.granted !== true) return false;
    const speech = carregarSpeech();
    if (!speech) return false;
    const speechResult = await speech.requestPermissionsAsync();
    return speechResult.granted === true;
  } catch {
    return false;
  }
}
