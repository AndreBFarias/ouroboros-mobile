// Aba Áudio do MidiaPicker (M07.x). Reusa o MicrofoneButton da M06.5
// em modo "captura simples": Opcao A do adendo do planejador --
// passamos onTextoTranscrito como no-op e usamos so onAudioGravado
// para alimentar o MidiaAudioSchema. Sem refactor do MicrofoneButton
// (que continua exportando dois callbacks obrigatorios).
//
// Observacao de UX: a transcricao roda em paralelo internamente,
// mas o resultado e descartado no callback. Custo perceptivel zero
// para o usuario; se em algum momento isso travar a UX, dispatchar
// INFRA-microfone-modo-simples para refatorar com prop transcribe?.
//
// Limitacao: o MicrofoneButton nao expoe duracao do audio gravado
// (so emite path relativo). Para popular MidiaAudio.duracao_seg,
// terimos que mexer na assinatura do callback -- fora do escopo
// M07.x. Persistimos midia sem duracao_seg; o WaveformPreview
// mostra '--:--' quando ausente. Sprint futura pode aprimorar.
import { useState } from 'react';
import { Text, View } from 'react-native';
import { MicrofoneButton } from '@/components/diario/MicrofoneButton';
import { WaveformPreview } from '@/components/midia/WaveformPreview';
import { colors, spacing } from '@/theme/tokens';
import type { MidiaAudio } from '@/lib/schemas/midia';

export interface MidiaAudioTabProps {
  onAdd: (m: MidiaAudio) => void;
  desabilitado?: boolean;
}

export function MidiaAudioTab({
  onAdd,
  desabilitado = false,
}: MidiaAudioTabProps) {
  // Mantemos preview do ultimo audio gravado nesta aba ate o
  // usuario trocar de aba ou adicionar outra midia. Nao confirmamos
  // duas vezes (haptic + toast ja vieram do MicrofoneButton via
  // toast 'Transcrevendo' que vira success implicito quando audio
  // grava com sucesso).
  const [ultimoPath, setUltimoPath] = useState<string | null>(null);

  return (
    <View
      style={{ gap: spacing.base }}
      accessibilityLabel="aba audio"
    >
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 12,
        }}
      >
        Pressione e segure para gravar
      </Text>
      {desabilitado ? (
        <Text
          style={{
            color: colors.mutedDecor,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
          }}
        >
          Limite de mídias atingido.
        </Text>
      ) : (
        <MicrofoneButton
          // No-op: a transcricao chega mas e ignorada nesta aba. Em
          // sprint futura, refactor adiciona prop transcribe? para
          // pular o pipeline inteiro.
          onTextoTranscrito={() => undefined}
          onAudioGravado={(relPath) => {
            setUltimoPath(relPath);
            const midia: MidiaAudio = { tipo: 'audio', path: relPath };
            onAdd(midia);
          }}
        />
      )}
      {ultimoPath ? <WaveformPreview path={ultimoPath} /> : null}
    </View>
  );
}
