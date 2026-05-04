// SeletorPara (M33). Chips dinamicos para escolher destinatario / tema
// de uma anotacao em diario emocional, evento, contador ou marco.
//
// Diferencas vs SeletorPessoaDestino (M31, em /components/todo):
//  - Apenas 3 opcoes (mim / outra / casal). Nao ha "terceiro".
//  - Esconde o componente inteiro em modo sozinho (return null) para
//    nao poluir o form com um unico chip "Para mim" redundante.
//  - Le tipoCompanhia de useSettings.pessoa (canonico atual M29), nao
//    de useOnboarding (legado).
//
// Comportamento:
//  - tipoCompanhia === 'sozinho'  -> return null (campo invisivel).
//  - tipoCompanhia === 'duo'      -> 3 chips: "Para mim" / "Para [Nome]"
//                                    / "Para o casal".
//
// Saida: callback onChange recebe um Para discriminado conforme
// schema em '@/lib/schemas/para'. Caller passa o valor atual em
// `value` (controlado).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useMemo, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { ChipGroup, type ChipOption } from '@/components/ui/Chip';
import { colors, spacing } from '@/theme/tokens';
import { useNomeDe, usePessoa } from '@/lib/stores/pessoa';
import { useSettings } from '@/lib/stores/settings';
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import type { Para } from '@/lib/schemas/para';

export interface SeletorParaProps {
  value: Para;
  onChange: (next: Para) => void;
  // Quando true, desabilita interacoes (durante salvamento).
  disabled?: boolean;
}

// Mapeia o destino atual para a string de chip selecionado.
// Encoding usa 'outra:<pessoa>' para diferenciar pessoa_a/b se um dia
// expandirmos (hoje so existe um parceiro relevante).
function paraToChip(p: Para): string {
  switch (p.tipo) {
    case 'mim':
      return 'mim';
    case 'casal':
      return 'casal';
    case 'outra':
      return `outra:${p.pessoa}`;
  }
}

export function SeletorPara({
  value,
  onChange,
  disabled = false,
}: SeletorParaProps): ReactNode {
  const tipoCompanhia = useSettings((s) => s.pessoa.tipoCompanhia);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  // Parceiro = o outro autor do casal.
  const pessoaParceiro: PessoaAutor =
    pessoaAtiva === 'pessoa_a' ? 'pessoa_b' : 'pessoa_a';
  const nomeParceiro = useNomeDe(pessoaParceiro);

  const opcoes = useMemo<ChipOption[]>(
    () => [
      { value: 'mim', label: 'Para mim', accent: 'purple' },
      {
        value: `outra:${pessoaParceiro}`,
        label: `Para ${nomeParceiro}`,
        accent: 'pink',
      },
      { value: 'casal', label: 'Para o casal', accent: 'cyan' },
    ],
    [pessoaParceiro, nomeParceiro]
  );

  const handleChipChange = useCallback(
    (next: string | null) => {
      if (!next) return;
      if (next === 'mim') {
        onChange({ tipo: 'mim' });
        return;
      }
      if (next === 'casal') {
        onChange({ tipo: 'casal' });
        return;
      }
      if (next.startsWith('outra:')) {
        const autor = next.slice('outra:'.length);
        if (autor === 'pessoa_a' || autor === 'pessoa_b') {
          onChange({ tipo: 'outra', pessoa: autor });
        }
      }
    },
    [onChange]
  );

  // Em modo sozinho o campo e' invisivel; o default {tipo:'mim'} ja
  // foi seedado pelo caller no useState inicial e o frontmatter sai
  // correto sem o usuario precisar tocar em nada.
  if (tipoCompanhia === 'sozinho') {
    return null;
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 11,
          lineHeight: 14,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        Para quem
      </Text>
      <ChipGroup
        mode="single"
        value={paraToChip(value)}
        onChange={handleChipChange}
        options={opcoes}
        disabled={disabled}
      />
    </View>
  );
}
