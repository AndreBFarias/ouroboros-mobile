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
import { mediaAudiosPath } from '@/lib/vault/paths';
import { stringifyCompanionMidia } from '@/lib/midia/companion';
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

// Gera sufixo aleatorio curto (4 chars hex) para evitar colisao
// entre gravacoes dentro do mesmo minuto. Math.random e bom o
// suficiente: colisao em 4 hex = 1/65536, e o resolvedor de path
// padrao do Vault aplica sufixo numerico se ainda assim colidir.
function suffixCurto(): string {
  return Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0');
}

// Concatena root SAF e path relativo, normalizando barras. Espelha
// helper privado de saveEvento para nao criar dependencia circular.
function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

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
  const relBin = mediaAudiosPath(date, suffixCurto());
  const destinoBin = joinUri(vaultRoot, relBin);
  await FileSystem.copyAsync({ from: uri, to: destinoBin });

  // Companion .md ao lado do binario. Erro de escrita do companion
  // nao deve invalidar o binario (audio e' o ativo principal); por
  // isso o try interno engole falha defensivamente. Caller continua
  // recebendo o relPath do binario.
  try {
    const relCompanion = relBin.replace(/\.m4a$/i, '.md');
    const destinoCompanion = joinUri(vaultRoot, relCompanion);
    const basename = relBin.split('/').pop() ?? relBin;
    const autor =
      opcoes.autor ?? usePessoa.getState().pessoaAtiva;
    const para: Para = opcoes.para ?? { tipo: 'mim' };
    const conteudo = stringifyCompanionMidia({
      tipo: 'midia_audio',
      arquivo: basename,
      data: date.toISOString(),
      autor,
      para,
      legenda: opcoes.legenda,
    });
    await FileSystem.writeAsStringAsync(destinoCompanion, conteudo);
  } catch {
    // Falha do companion nao bloqueia o fluxo. Binario ja esta no
    // Vault e e o que importa para o usuario. Sprint futura pode
    // adicionar reconciliacao (gerar companion ausente em batch).
  }

  return relBin;
}
