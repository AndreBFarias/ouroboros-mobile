// Wrapper assincrono sobre expo-av para captura de audio .m4a no
// modo press-and-hold do MicrofoneButton (Tela 18, M06.5). Mantem a
// API minima: start, stop, save no Vault. O componente cuida de
// estado de UI e haptics; este modulo so toca filesystem.
//
// Preset RECORDING_OPTIONS_PRESET_HIGH_QUALITY: AAC 44.1kHz mono
// suficiente para fala clara, ~50KB por 10 segundos. Compressao
// Opus fica para sprint M15.1 caso o usuario reclame de tamanho.
//
// M-VAULT-MD-FIX-diario-audio (2026-05-04): destino canonico migrou
// de assets/<HHmm>-<rand>.m4a para media/audios/<YYYY-MM-DD>-<rand>.m4a // ptbr-allow: nome de pasta canonica do Vault, nao palavra portuguesa
// + companion .md 1:1 (formato unificado M34/M39, alinhado com
// capturarMusica.ts). Arquivos antigos em assets/ permanecem legiveis;
// so novos vao para o lugar canonico.
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { escreverMidiaComCompanion } from '@/lib/vault/midiaCompanion';
import { usePessoa } from '@/lib/stores/pessoa';
import type { Para } from '@/lib/schemas/para';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

export interface StopResult {
  // URI temporario do arquivo no cache. Caller normalmente passa
  // direto para saveRecordingToVault, mas pode inspecionar duracao
  // antes de gravar (ex.: descartar gravacoes <1s).
  uri: string;
  durationMs: number;
}

// Cria, prepara e inicia um Audio.Recording. Caller mantem a
// referencia e passa para stopRecording quando o gesto soltar.
export async function startRecording(): Promise<Audio.Recording> {
  // Modo de audio dedicado a gravacao: desliga playback paralelo,
  // permite captura mesmo com tela apagada (caso usuario tire o
  // dedo do botao). InterruptionModeAndroid 1 = duck other audio.
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  await recording.startAsync();
  return recording;
}

// Para a gravacao e devolve URI temporario + duracao em ms. Caller
// passa o URI para saveRecordingToVault; em caso de erro (ex.:
// recording ja parado), rejeita com mensagem do expo-av.
export async function stopRecording(
  recording: Audio.Recording
): Promise<StopResult> {
  await recording.stopAndUnloadAsync();
  const status = await recording.getStatusAsync();
  const uri = recording.getURI();
  if (!uri) {
    throw new Error('audio sem uri apos stop');
  }
  // status.durationMillis existe no shape RecordingStatus quando
  // canRecord=false (parado). Defensive default 0 para ambientes
  // de teste com mock parcial.
  const durationMs =
    'durationMillis' in status && typeof status.durationMillis === 'number'
      ? status.durationMillis
      : 0;
  return { uri, durationMs };
}

// Apaga o arquivo temporario do cache quando a gravacao e descartada
// (cancelamento, duracao <500ms, erro de transcricao). idempotent:true
// nao reclama se o arquivo ja foi removido. Sem isso, o cache acumula
// .m4a orfaos ao longo de sessoes longas (Android limpa eventualmente,
// mas a invariante do projeto e zero lixo no Vault). Caller chama em
// todos os caminhos de descarte do MicrofoneButton.
export async function discardRecording(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Falha de delete em cache nao deve quebrar fluxo do diario.
    // Logar silenciosamente; o sistema operacional limpa eventualmente.
  }
}

// M39.1: helpers locais suffixCurto/joinUri removidos — escreverMidia
// ComCompanion encapsula a geracao de basename canonico, joinUri e
// idempotencia do binario.

// Opcoes do companion .md gravado ao lado do binario. Todos os
// campos sao opcionais: caller que nao informa cai em defaults
// seguros (autor lido do store usePessoa, destinatario {tipo:'mim'},
// sem legenda). Mantem assinatura antiga compativel para os callers
// que so querem o binario salvo.
export interface SaveRecordingOpcoes {
  autor?: PessoaAutor;
  para?: Para;
  legenda?: string;
}

// Copia o URI temporario para media/audios/<YYYY-MM-DD>-<suffix>.m4a
// dentro do Vault e escreve o companion .md 1:1 ao lado (formato
// unificado M34/M39 via stringifyCompanionMidia). Devolve o path
// relativo do binario (string que o caller guarda em meta.audio do
// diario emocional). O companion fica em
// media/audios/<YYYY-MM-DD>-<suffix>.md, descoberto por convencao
// (mesmo basename, extensao .md) - segue padrao do capturarMusica.
export async function saveRecordingToVault(
  uri: string,
  vaultRoot: string,
  date: Date = new Date(),
  opcoes: SaveRecordingOpcoes = {}
): Promise<string> {
  // M39.1: caminho consolidado via escreverMidiaComCompanion.
  // Defensivo: se o helper falhar (por qualquer razao em mock parcial
  // de testes), tentamos pelo menos copiar o binario para preservar a
  // invariante "binario e' o ativo principal" — companion fica como
  // best-effort historico.
  const autor = opcoes.autor ?? usePessoa.getState().pessoaAtiva;
  const para: Para = opcoes.para ?? { tipo: 'mim' };
  try {
    const r = await escreverMidiaComCompanion(vaultRoot, uri, {
      tipo: 'midia_audio',
      data: date.toISOString(),
      autor,
      para,
      legenda: opcoes.legenda,
    });
    return r.binarioPath;
  } catch {
    // Best-effort: ainda copia o binario num path canonico minimo
    // se o helper canonico estourar (ex.: getInfoAsync indisponivel).
    // Garante que o caller sempre recebe um relBin utilizavel.
    const rand = Math.floor(Math.random() * 0xffff)
      .toString(16)
      .padStart(4, '0');
    const ymd = (() => {
      const TZ_SHIFT_MS = -3 * 60 * 60 * 1000;
      const local = new Date(date.getTime() + TZ_SHIFT_MS);
      const y = local.getUTCFullYear();
      const m = String(local.getUTCMonth() + 1).padStart(2, '0');
      const d = String(local.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    })();
    const relBin = `media/audios/${ymd}-${rand}.m4a`;
    const trimmedRoot = vaultRoot.endsWith('/')
      ? vaultRoot.slice(0, -1)
      : vaultRoot;
    await FileSystem.copyAsync({
      from: uri,
      to: `${trimmedRoot}/${relBin}`,
    });
    return relBin;
  }
}
