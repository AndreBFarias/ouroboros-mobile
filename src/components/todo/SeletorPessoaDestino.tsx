// SeletorPessoaDestino (M31). Chips dinamicos para escolher destino
// da tarefa: mim, outra (parceiro), casal ou terceiro (nome livre).
//
// Comportamento:
//  - "Para mim" sempre presente (autor === dono, default v1 compat).
//  - "Para [nome do parceiro]" so aparece quando tipoCompanhia === 'duo'
//    em useSettings (M28). Nome vem de useNomeDe(autor parceiro).
//  - "Para o casal" so aparece em duo. Marca tarefa de responsabilidade
//    compartilhada.
//  - "Para outro" sempre presente. Quando selecionado, expande input
//    abaixo dos chips para o usuario digitar nome livre (1-60 chars).
//
// Saida: callback onChange recebe um TarefaPessoaDestino discriminado.
// O caller passa o destino atual em `value` (controlado).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Text, TextInput, View } from 'react-native';
import { ChipGroup, type ChipOption } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';
import { useNomeDe, usePessoa } from '@/lib/stores/pessoa';
import { useSettings } from '@/lib/stores/settings';
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import type { TarefaPessoaDestino } from '@/lib/schemas/tarefa';

export interface SeletorPessoaDestinoProps {
  value: TarefaPessoaDestino;
  onChange: (next: TarefaPessoaDestino) => void;
  // Quando true, desabilita interacoes (durante salvamento).
  disabled?: boolean;
}

// Mapeia o destino atual para a string de chip selecionado.
function destinoParaChip(destino: TarefaPessoaDestino): string {
  switch (destino.tipo) {
    case 'mim':
      return 'mim';
    case 'casal':
      return 'casal';
    case 'outra':
      return `outra:${destino.pessoa}`;
    case 'terceiro':
      return 'terceiro';
  }
}

export function SeletorPessoaDestino({
  value,
  onChange,
  disabled = false,
}: SeletorPessoaDestinoProps): ReactNode {
  const tipoCompanhia = useSettings((s) => s.pessoa.tipoCompanhia);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  // Parceiro = o outro autor. Default consistente com a UX de duo.
  const pessoaParceiro: PessoaAutor =
    pessoaAtiva === 'pessoa_a' ? 'pessoa_b' : 'pessoa_a';
  const nomeParceiro = useNomeDe(pessoaParceiro);

  // Estado interno para input de "terceiro". Inicializa do value se ja
  // for terceiro; do contrario, vazio.
  const [nomeTerceiro, setNomeTerceiro] = useState<string>(
    value.tipo === 'terceiro' ? value.nome : ''
  );

  const opcoes = useMemo<ChipOption[]>(() => {
    const out: ChipOption[] = [
      { value: 'mim', label: 'Para mim', accent: 'purple' },
    ];
    if (tipoCompanhia === 'duo') {
      out.push({
        value: `outra:${pessoaParceiro}`,
        label: `Para ${nomeParceiro}`,
        accent: 'pink',
      });
      out.push({ value: 'casal', label: 'Para o casal', accent: 'cyan' });
    }
    out.push({ value: 'terceiro', label: 'Para outro', accent: 'orange' });
    return out;
  }, [tipoCompanhia, pessoaParceiro, nomeParceiro]);

  const chipSelecionado = destinoParaChip(value);

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
        return;
      }
      if (next === 'terceiro') {
        // Preserva nome ja digitado (se houver) para nao zerar o input.
        const nomeAtual = nomeTerceiro.trim();
        onChange({
          tipo: 'terceiro',
          nome: nomeAtual.length > 0 ? nomeAtual : 'Outro',
        });
      }
    },
    [onChange, nomeTerceiro]
  );

  const handleNomeTerceiroChange = useCallback(
    (texto: string) => {
      setNomeTerceiro(texto);
      const limpo = texto.trim();
      if (limpo.length > 0 && limpo.length <= 60) {
        onChange({ tipo: 'terceiro', nome: limpo });
      }
    },
    [onChange]
  );

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
        value={chipSelecionado}
        onChange={handleChipChange}
        options={opcoes}
        disabled={disabled}
      />
      {value.tipo === 'terceiro' ? (
        <View
          style={{
            backgroundColor: colors.bgAlt,
            borderRadius: radius.input,
            borderWidth: 1,
            borderColor: colors.bgElev,
            paddingHorizontal: spacing.base,
            paddingVertical: 10,
            marginTop: spacing.xs,
          }}
        >
          <TextInput
            value={nomeTerceiro}
            onChangeText={handleNomeTerceiroChange}
            placeholder="Nome de quem"
            placeholderTextColor={colors.mutedDecor}
            maxLength={60}
            editable={!disabled}
            style={{
              color: colors.fg,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 14,
              lineHeight: 22,
              minHeight: 44,
            }}
            accessibilityLabel="nome do terceiro destino da tarefa"
          />
        </View>
      ) : null}
    </View>
  );
}
