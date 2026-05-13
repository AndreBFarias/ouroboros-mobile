// Botao circular de gravacao do diario emocional (Tela 18, M06.5).
// Press-and-hold inicia captura de audio (.m4a); release encerra.
// Estados: idle | requesting | recording. Idle = circulo cyan vazio
// com icone Mic; recording = pulsa + mostra contador 'mm:ss' e
// waveform abaixo do botao.
//
// Q5.1 (Onda Q, 2026-05-12 noite): transcricao live REMOVIDA deste
// componente — SpeechRecognizer Android nao consegue compartilhar o
// microfone com Audio.Recording (sempre aborta com error=aborted).
// A transcricao ao vivo passou a viver no TranscreverButton.tsx,
// disparado por um botao separado ao lado deste. Decisao durol do
// dono 2026-05-12: dois botoes claros (Gravar audio | Transcrever)
// em vez de um botao tentando os dois ao mesmo tempo.
//
// Limite 60s: timer interno forca stop ao atingir, dispara toast.
//
// API:
//   <MicrofoneButton
//     onTextoTranscrito={(texto) => void}
//     onAudioGravado={(relPath) => void}
//   />
//
// Caller cuida de append no textarea e de salvar relPath em
// meta.audio. Componente nao guarda estado entre montagens.
import { useEffect, useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { MotiView } from 'moti';
import { Mic } from '@/lib/icons';
import { useToast } from '@/components/ui';
import { Waveform } from '@/components/diario/Waveform';
import { colors, spacing } from '@/theme/tokens';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import {
  startRecording,
  stopRecording,
  saveRecordingToVault,
  discardRecording,
} from '@/lib/diario/recordAudio';
import { requestMicPermission } from '@/lib/diario/permissions';
import { comTimeout } from '@/lib/util/comTimeout';
import type { Audio } from 'expo-av';

const LIMITE_MS = 60_000; // 60 segundos
const TICK_MS = 250; // refresh do contador e do waveform

type Estado = 'idle' | 'requesting' | 'recording' | 'salvando';

export interface MicrofoneButtonProps {
  // Caller recebe path relativo (ex.: 'm4a/audio-2026-05-12-3f2a.m4a')
  // para salvar em meta.audio. Se gravacao for descartada (erro
  // de permissao, < 500ms), nao chama esse callback.
  onAudioGravado: (relPath: string) => void;
}

// Formata milissegundos como 'mm:ss'. Cap em 99:59 para evitar
// overflow visual; o limite real e 60s mas mantemos defensivo.
function formatTimer(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.min(99, Math.floor(totalSec / 60));
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// Gera vetor de 24 amplitudes a partir do metering em dB. Voice/
// expo-av reportam metering em dB (-160 a 0). Normalizamos para
// [0, 1] empurrando o piso para -50 dB (silencio percebido).
function meteringParaAmplitude(metering: number | undefined): number {
  if (typeof metering !== 'number') return 0;
  const piso = -50;
  if (metering <= piso) return 0;
  const norm = (metering - piso) / Math.abs(piso);
  return Math.max(0, Math.min(1, norm));
}

export function MicrofoneButton({
  onAudioGravado,
}: MicrofoneButtonProps) {
  const toast = useToast();
  const vaultRoot = useVault((s) => s.vaultRoot);

  const [estado, setEstado] = useState<Estado>('idle');
  const [tempoMs, setTempoMs] = useState<number>(0);
  const [amplitudes, setAmplitudes] = useState<number[]>([]);

  // Refs mantem objetos vivos entre renders sem disparar re-render.
  const recordingRef = useRef<Audio.Recording | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const limiteRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inicioRef = useRef<number>(0);
  // Conta vezes que o usuario teve permissao negada nesta sessao;
  // primeira vez = toast simples, segunda = deep link para Settings
  // (decisao de UX da spec, secao 10).
  const negacoesRef = useRef<number>(0);

  // Limpa timers e listener de status. Idempotente.
  const limparTimers = () => {
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
    if (limiteRef.current) {
      clearTimeout(limiteRef.current);
      limiteRef.current = null;
    }
  };

  // Cleanup ao desmontar: aborta gravacao + apaga o .m4a temporario
  // que ficou no cache (lição M06.5 ACHADO 3 do validador -- usuario
  // sai da tela mid-record nao pode deixar arquivo orfao acumulando).
  useEffect(() => {
    return () => {
      limparTimers();
      const rec = recordingRef.current;
      if (rec) {
        rec
          .stopAndUnloadAsync()
          .then(() => {
            const uri = rec.getURI();
            if (uri) {
              void discardRecording(uri);
            }
          })
          .catch(() => undefined);
      }
    };
  }, []);

  // Pipeline de stop: para a gravacao, salva no Vault e dispara
  // transcricao. Se gracioso=false, limpa sem chamar callbacks
  // (usado em erro/cancel).
  const finalizar = async (gracioso: boolean) => {
    limparTimers();
    const rec = recordingRef.current;
    recordingRef.current = null;
    if (!rec) {
      setEstado('idle');
      return;
    }

    let stopResult: { uri: string; durationMs: number } | null = null;
    try {
      stopResult = await stopRecording(rec);
    } catch {
      setEstado('idle');
      return;
    }

    if (!gracioso || !vaultRoot) {
      // Cancelamento explicito: limpa o .m4a temporario do cache
      // antes de devolver controle a UI (lição M06.5 validador
      // ACHADO 3 -- evita acumulo em sessoes longas).
      void discardRecording(stopResult.uri);
      setEstado('idle');
      return;
    }

    // Descarta gravacoes muito curtas (< 500ms) - normalmente toque
    // acidental. Mantem UX mais limpa do que mostrar transcricao
    // vazia para o usuario. Limpa o cache tambem (mesmo motivo do
    // bloco anterior).
    if (stopResult.durationMs < 500) {
      void discardRecording(stopResult.uri);
      setEstado('idle');
      return;
    }

    setEstado('salvando');

    // I-AUDIO (M-SAVE-AUDIO-VALIDA, 2026-05-07): save com timeout 30s
    // (SAF write em /sdcard/Documents/ pode levar mais em OEMs lentos
    // tipo MIUI/HyperOS). Q5.1: companion .md fica sem transcricao
    // (campo opcional). Usuario pode anexar texto via TranscreverButton
    // separado ou digitar manualmente na textarea do diario.
    const dataCaptura = new Date();
    try {
      const relPath = await comTimeout(
        saveRecordingToVault(stopResult.uri, vaultRoot, dataCaptura),
        30_000
      );
      onAudioGravado(relPath);
      toast.show('Áudio salvo.', 'success');
    } catch (err) {
      void discardRecording(stopResult.uri);
      const msg = err instanceof Error ? err.message : String(err);
      toast.show(`Não foi possível salvar: ${msg}`, 'error');
      console.error('save audio fail', err);
    }
    setEstado('idle');
    setTempoMs(0);
    setAmplitudes([]);
  };

  const iniciar = async () => {
    if (estado !== 'idle') return;
    setEstado('requesting');

    const ok = await requestMicPermission();
    if (!ok) {
      negacoesRef.current += 1;
      if (negacoesRef.current >= 2) {
        toast.show('Sem permissão de microfone.', 'error');
        Linking.openSettings().catch(() => undefined);
      } else {
        toast.show('Sem permissão de microfone.', 'error');
      }
      setEstado('idle');
      return;
    }

    let rec: Audio.Recording;
    try {
      rec = await startRecording();
    } catch {
      toast.show('Microfone indisponível agora.', 'error');
      setEstado('idle');
      return;
    }
    recordingRef.current = rec;
    inicioRef.current = Date.now();
    setEstado('recording');
    setTempoMs(0);
    haptics.medium().catch(() => undefined);

    // Listener de status: atualiza amplitudes em background. Nao
    // dispara re-render se o componente ja desmontou (ref vazio).
    rec.setOnRecordingStatusUpdate((status) => {
      if (recordingRef.current !== rec) return;
      const amp = meteringParaAmplitude(
        'metering' in status && typeof status.metering === 'number'
          ? status.metering
          : undefined
      );
      setAmplitudes((prev) => {
        const next = [...prev, amp];
        if (next.length > 24) next.shift();
        return next;
      });
    });

    // Ticker do contador. Roda independente do status update do
    // expo-av para manter UI fluida mesmo se metering vier raro.
    tickerRef.current = setInterval(() => {
      const decorrido = Date.now() - inicioRef.current;
      setTempoMs(decorrido);
    }, TICK_MS);

    // Hard cap de 60s. Stop automatico + toast.
    limiteRef.current = setTimeout(() => {
      toast.show('Áudio limitado a 60 segundos.', 'warn');
      finalizar(true).catch(() => undefined);
    }, LIMITE_MS);
  };

  const handlePressIn = (_e: GestureResponderEvent) => {
    iniciar().catch(() => undefined);
  };

  const handlePressOut = () => {
    if (estado !== 'recording') return;
    haptics.light().catch(() => undefined);
    finalizar(true).catch(() => undefined);
  };

  const corBorda =
    estado === 'recording' ? colors.red : colors.cyan;
  const labelEstado =
    estado === 'idle'
      ? 'Gravar áudio'
      : estado === 'requesting'
        ? 'Solicitando…'
        : estado === 'recording'
          ? formatTimer(tempoMs)
          : 'Salvando…';

  return (
    <View
      style={{ alignItems: 'center', gap: spacing.sm }}
      accessibilityLabel="bloco de gravacao de audio"
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={estado === 'salvando' || estado === 'requesting'}
        accessibilityRole="button"
        accessibilityLabel={
          estado === 'recording' ? 'parar gravacao' : 'botao gravar audio'
        }
        accessibilityHint="press-and-hold para gravar audio do diario"
        hitSlop={8}
      >
        <MotiView
          animate={{
            scale: estado === 'recording' ? 1.08 : 1,
            borderColor: corBorda,
          }}
          transition={springs.subtle}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.bgAlt,
            borderWidth: 2,
            borderColor: corBorda,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Mic
            size={28}
            color={estado === 'recording' ? colors.red : colors.cyan}
            strokeWidth={1.5}
          />
        </MotiView>
      </Pressable>

      <Text
        style={{
          color: estado === 'recording' ? colors.cyan : colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 12,
          minHeight: 16,
        }}
        accessibilityLabel="estado da gravacao"
      >
        {labelEstado}
      </Text>

      {estado === 'recording' ? (
        <View style={{ width: '100%', paddingHorizontal: spacing.base }}>
          <Waveform amplitudes={amplitudes} />
        </View>
      ) : null}
    </View>
  );
}
