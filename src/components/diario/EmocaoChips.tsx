// Wrapper sobre <ChipGroup mode="multi"> que devolve a lista de
// emocoes correspondente ao modo do diario (negativas para trigger,
// positivas para vitoria). A troca de modo dispara um spring subtle
// no opacity do bloco para sinalizar a mudanca de paleta sem cortar
// a visao do usuario (jump-cut quebraria a regra de fisica natural,
// ADR-010).
//
// Slugs guardados são snake_case ASCII; renderizacao via formatEmocao
// gera Sentence case com diacriticos PT-BR. Accent dos chips segue a
// borda do form: red em modo trigger, green em modo vitoria.
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { MotiView } from 'moti';
import { ChipGroup } from '@/components/ui';
import { springs } from '@/lib/motion';
import {
  EMOCOES_NEGATIVAS_OPTIONS,
  EMOCOES_POSITIVAS_OPTIONS,
} from '@/lib/diario/emocoes';

export type EmocaoChipsModo = 'trigger' | 'vitoria';

export interface EmocaoChipsProps {
  modo: EmocaoChipsModo;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

export function EmocaoChips({
  modo,
  value,
  onChange,
  disabled = false,
}: EmocaoChipsProps) {
  // Re-mount key controla o ciclo de animacao: ao trocar de modo a
  // chave muda, o MotiView reinicia from -> animate, dando o hop
  // visual sutil. Sem isso o moti so re-renderiza sem transicao.
  const [animKey, setAnimKey] = useState<number>(0);
  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [modo]);

  const options =
    modo === 'trigger'
      ? EMOCOES_NEGATIVAS_OPTIONS
      : EMOCOES_POSITIVAS_OPTIONS;

  return (
    <View accessibilityLabel={`emocao chips ${modo}`}>
      <MotiView
        key={animKey}
        from={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={springs.subtle}
      >
        <ChipGroup
          mode="multi"
          value={value}
          onChange={onChange}
          options={[...options]}
          disabled={disabled}
        />
      </MotiView>
    </View>
  );
}
