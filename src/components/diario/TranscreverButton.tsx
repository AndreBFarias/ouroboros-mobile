// Botao "Transcrever" — press-and-hold dispara speech-recognition
// on-device sem gravar audio em paralelo. Q5.1 (Onda Q, 2026-05-12).
//
// Por que separado do MicrofoneButton: o Android SpeechRecognizer
// nao consegue compartilhar o microfone com expo-av Audio.Recording
// (sempre aborta com error=aborted). Decisao durol do dono: dois
// botoes claros (Gravar audio | Transcrever), o usuario escolhe um
// por vez. Caller renderiza ambos lado-a-lado.
//
// API:
//   <TranscreverButton
//     onTextoTranscrito={(texto) => void}     // chamado UMA VEZ no release
//     onPreviewParcial={(parcial) => void}    // opcional, cada partial
//   />
//
// Caller decide se faz append ou sobrescreve com onTextoTranscrito
// (final). Partials nunca disparam onTextoTranscrito — evita o bug
// Q22.A em que cada partial era appendado N vezes no textarea. Se o
// caller quiser preview live, passar onPreviewParcial separado.
//
// Respeita settings.privacidade.ocultarTranscricoes: quando ativo,
// nem parciais nem texto final vazam pra UI.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { MotiView } from 'moti';
import { Captions } from '@/lib/icons';
import { useToast } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { useSettings } from '@/lib/stores/settings';
import {
  transcribeStream,
  cancel as cancelTranscribe,
} from '@/lib/diario/transcribe';
import {
  requestMicPermission,
  MicPermissionError,
} from '@/lib/diario/permissions';

type Estado = 'idle' | 'requesting' | 'listening';

export interface TranscreverButtonProps {
  // Chamado UMA VEZ por sessao, no release do botao, com o texto
  // consolidado final. Caller faz append ou sobrescreve livremente.
  onTextoTranscrito: (texto: string) => void;
  // Opcional: chamado a cada partial result do reconhecedor. Pra
  // preview live em outra area da UI (NUNCA no mesmo textarea que
  // recebe o final — vide Q22.A bug de duplicacao).
  onPreviewParcial?: (parcial: string) => void;
}

export function TranscreverButton({
  onTextoTranscrito,
  onPreviewParcial,
}: TranscreverButtonProps) {
  const toast = useToast();
  const ocultarTranscricoes = useSettings(
    (s) => s.privacidade.ocultarTranscricoes
  );

  const [estado, setEstado] = useState<Estado>('idle');
  const negacoesRef = useRef<number>(0);
  // Promise da chamada transcribeStream em curso. Resolve quando o
  // reconhecedor termina (silencio prolongado ou cancelTranscribe
  // chamado no release do botao).
  const promiseRef = useRef<Promise<string> | null>(null);
  // Ultimo parcial entregue, reusado como fallback se a promise
  // resolver com string vazia (sessoes muito curtas no Android 12+).
  const ultimoParcialRef = useRef<string>('');

  // Cleanup ao desmontar: aborta sessao em curso para liberar o mic.
  useEffect(() => {
    return () => {
      cancelTranscribe().catch(() => undefined);
    };
  }, []);

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

    ultimoParcialRef.current = '';
    setEstado('listening');
    haptics.medium().catch(() => undefined);

    promiseRef.current = transcribeStream((parcial) => {
      ultimoParcialRef.current = parcial;
      if (!ocultarTranscricoes && onPreviewParcial) {
        // Q22.A: partials VAO pra preview opcional. NAO disparam o
        // onTextoTranscrito (que cumulava N vezes no caller).
        onPreviewParcial(parcial);
      }
    }).catch((err) => {
      // Se o usuario revoga permissao no meio, faz toast claro.
      if (err instanceof MicPermissionError) {
        toast.show('Sem permissão de microfone.', 'error');
        return '';
      }
      // Demais falhas (service-not-allowed em devices sem speech
      // recognizer, no-speech timeout) sao silenciadas: o usuario
      // pode tentar de novo ou digitar manualmente.
      return '';
    });
  };

  const finalizar = async () => {
    if (estado !== 'listening') return;
    haptics.light().catch(() => undefined);
    await cancelTranscribe().catch(() => undefined);
    const textoFinal = (await promiseRef.current?.catch(() => '')) ?? '';
    promiseRef.current = null;
    // Q22.A: emitir UMA UNICA chamada de onTextoTranscrito por sessao
    // com o texto consolidado. Fallback pro ultimo parcial quando o
    // reconhecedor resolve com string vazia (Android 12+ as vezes corta).
    const texto = textoFinal || ultimoParcialRef.current;
    if (texto && texto.trim().length > 0 && !ocultarTranscricoes) {
      onTextoTranscrito(texto);
    }
    setEstado('idle');
  };

  const handlePressIn = (_e: GestureResponderEvent) => {
    iniciar().catch(() => undefined);
  };

  const handlePressOut = () => {
    finalizar().catch(() => undefined);
  };

  const corBorda = estado === 'listening' ? colors.purple : colors.orange;
  const labelEstado =
    estado === 'idle'
      ? 'Transcrever'
      : estado === 'requesting'
        ? 'Solicitando…'
        : 'Ouvindo…';

  return (
    <View
      style={{ alignItems: 'center', gap: spacing.sm }}
      accessibilityLabel="bloco de transcricao por voz"
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={estado === 'requesting'}
        accessibilityRole="button"
        accessibilityLabel={
          estado === 'listening' ? 'parar transcricao' : 'botao transcrever'
        }
        accessibilityHint="press-and-hold para transcrever sua fala em texto"
        hitSlop={8}
      >
        <MotiView
          animate={{
            scale: estado === 'listening' ? 1.08 : 1,
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
          <Captions
            size={28}
            color={estado === 'listening' ? colors.purple : colors.orange}
            strokeWidth={1.5}
          />
        </MotiView>
      </Pressable>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 11,
          lineHeight: 14,
          minHeight: 14,
        }}
        accessibilityLabel={`estado transcrever ${labelEstado}`}
      >
        {labelEstado}
      </Text>
    </View>
  );
}
