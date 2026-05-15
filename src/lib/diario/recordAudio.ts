// Wrapper assincrono sobre expo-av para captura de audio .m4a no
// modo press-and-hold do MicrofoneButton (Tela 18, M06.5). Mantem a
// API minima: start, stop, save no Vault. O componente cuida de
// estado de UI e haptics; este modulo so toca filesystem.
//
// Preset RECORDING_OPTIONS_PRESET_HIGH_QUALITY: AAC 44.1kHz mono
// suficiente para fala clara, ~50KB por 10 segundos. Compressao
// Opus fica para sprint M15.1 caso o usuario reclame de tamanho.
//
// I-AUDIO (M-SAVE-AUDIO-VALIDA, 2026-05-07): writer reescrito inline
// no padrao I-VIDEO/I-FOTO. Usa vaultUriJoin canonico (H1) +
// audioPath/audioCompanionPath (H2 layout-por-tipo / ADR-0023).
// Saiu do helper escreverMidiaComCompanion (que usa joinUri local
// sem normalizacao H1, off-limits desta sprint). Comportamento
// observavel:
//   - vaultRoot vazio -> throw 'Vault não conectado.' (caller trata
//     com toast PT-BR explicito).
//   - sucesso -> path relativo m4a/audio-YYYY-MM-DD-<rand4>.m4a + // ptbr-allow: nome canonico de arquivo no Vault, nao palavra portuguesa
//     companion markdown/audio-YYYY-MM-DD-<rand4>.md.
//   - transcricao opcional (best-effort): quando string presente vai
//     no frontmatter + body. Quando ausente (STT falhou ou foi
//     pulado), companion ainda salva sem o campo — semantica
//     canonica null no MidiaCompanionSchema.
//
// Comentarios sem acento (convencao shell/CI).
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { usePessoa } from '@/lib/stores/pessoa';
import { stringifyCompanionMidia } from '@/lib/midia/companion';
import { audioPath, audioCompanionPath } from '@/lib/vault/paths';
import { vaultUriJoin } from '@/lib/vault';
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

// Sufixo random curto (4 hex). Espelha o usado em capturarFoto/
// capturarVideo para coerencia de basename.
function suffixCurto(): string {
  return Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0');
}

// Opcoes do companion .md gravado ao lado do binario. Todos os
// campos sao opcionais: caller que nao informa cai em defaults
// seguros (autor lido do store usePessoa, destinatario {tipo:'mim'},
// sem legenda). Mantem assinatura antiga compativel para os callers
// que so querem o binario salvo.
//
// I-AUDIO: novo campo `transcricao` (best-effort do STT).
// MicrofoneButton passa apos transcribeStream resolver; quando
// transcribeStream falha, passa undefined e o companion fica sem o
// campo (interpretado como null pelo MidiaCompanionSchema).
export interface SaveRecordingOpcoes {
  autor?: PessoaAutor;
  para?: Para;
  legenda?: string;
  transcricao?: string;
}

// Copia o URI temporario para m4a/audio-YYYY-MM-DD-<suffix>.m4a (H2
// layout-por-tipo / ADR-0023) dentro do Vault e escreve o companion
// .md em markdown/audio-YYYY-MM-DD-<suffix>.md ao lado por convencao
// (mesmo basename). Devolve o path relativo do binario (string que o
// caller guarda em meta.audio do diario emocional).
//
// I-AUDIO: writer inline com vaultUriJoin canonico. Padrao espelha
// capturarVideo (I-VIDEO) e capturarFoto (I-FOTO). vaultRoot vazio
// agora throw em vez de silenciar — caller exibe toast PT-BR
// explicito.
export async function saveRecordingToVault(
  uri: string,
  vaultRoot: string,
  date: Date = new Date(),
  opcoes: SaveRecordingOpcoes = {}
): Promise<string> {
  // I-AUDIO: throw em vez de silenciar. Espelha I-VIDEO/I-FOTO.
  if (!vaultRoot) {
    throw new Error('Vault não conectado.');
  }

  const autor = opcoes.autor ?? usePessoa.getState().pessoaAtiva;
  const para: Para = opcoes.para ?? { tipo: 'mim' };

  const rand = suffixCurto();
  const binarioRel = audioPath(date, rand);
  const companionRel = audioCompanionPath(date, rand);
  const destinoBin = vaultUriJoin(vaultRoot, binarioRel);
  const destinoCompanion = vaultUriJoin(vaultRoot, companionRel);

  const basename = binarioRel.split('/').pop() ?? binarioRel;

  await FileSystem.copyAsync({ from: uri, to: destinoBin });

  const conteudo = stringifyCompanionMidia({
    tipo: 'midia_audio',
    arquivo: basename,
    data: date.toISOString(),
    autor,
    para,
    legenda: opcoes.legenda,
    transcricao: opcoes.transcricao,
  });
  await FileSystem.writeAsStringAsync(destinoCompanion, conteudo);

  return binarioRel;
}

// I-AUDIO: regrava o companion .md de um binario de audio ja salvo
// adicionando a transcricao obtida via STT (best-effort, paralelo
// ao save). Idempotente: se chamado duas vezes com o mesmo texto, o
// companion fica identico. Caller (MicrofoneButton) chama apenas
// quando transcribeStream resolve com texto nao-vazio.
//
// Por que regravar em vez de update parcial: stringifyCompanionMidia
// e' deterministico e barato; regravar o frontmatter completo evita
// estado intermediario inconsistente. Fica simples manter o body
// (transcricao replicada apos os ---) em sync com o frontmatter.
export interface AtualizarTranscricaoOpcoes {
  autor?: PessoaAutor;
  para?: Para;
  legenda?: string;
}

export async function atualizarCompanionAudioComTranscricao(
  vaultRoot: string,
  audioRelPath: string,
  date: Date,
  texto: string,
  opcoes: AtualizarTranscricaoOpcoes = {}
): Promise<void> {
  if (!vaultRoot) {
    throw new Error('Vault não conectado.');
  }
  // Espelha basename do binario para localizar companion correto.
  const basename = audioRelPath.split('/').pop() ?? audioRelPath;
  const basenameSemExt = basename.replace(/\.m4a$/, '');
  const companionRel = `markdown/${basenameSemExt}.md`;
  const destinoCompanion = vaultUriJoin(vaultRoot, companionRel);

  const autor = opcoes.autor ?? usePessoa.getState().pessoaAtiva;
  const para: Para = opcoes.para ?? { tipo: 'mim' };

  const conteudo = stringifyCompanionMidia({
    tipo: 'midia_audio',
    arquivo: basename,
    data: date.toISOString(),
    autor,
    para,
    legenda: opcoes.legenda,
    transcricao: texto,
  });
  await FileSystem.writeAsStringAsync(destinoCompanion, conteudo);
}
