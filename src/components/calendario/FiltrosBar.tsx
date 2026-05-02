// Barra de filtros do calendário (M11.5). Cinco filtros (adendo A4):
//   1. pessoa     — ChipGroup single ('A' / 'B' / 'Ambos').
//   2. mês        — ChipGroup row ('Tudo', 'Este mês', 'Mês passado').
//   3. tipo mídia — ChipGroup row ('Tudo', 'Foto', 'YouTube',
//                  'Spotify', 'Áudio').
//   4. intensidade — Dois sliders (mín e máx) 1-5. ChipGroup single
//                    seria menos preciso para um range; sliders
//                    seguem o mesmo padrão visual usado no resto do
//                    app (energia, ansiedade etc).
//   5. bairro     — Input livre com debounce 300ms.
//
// Strings de UI em sentence case PT-BR com acentuação completa.
// Comentários em PT-BR com acentuação correta.
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Chip, ChipGroup, Input, Slider } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { PessoaId } from '@/lib/schemas/pessoa';
import type {
  FiltroIntensidade,
  FiltroMes,
  FiltroTipoMidia,
  FiltrosConquistas,
} from '@/lib/conquistas/filtros';

interface FiltrosBarProps {
  filtros: FiltrosConquistas;
  onPessoa: (p: PessoaId) => void;
  onMes: (m: FiltroMes) => void;
  onTipoMidia: (t: FiltroTipoMidia) => void;
  onIntensidade: (i: FiltroIntensidade) => void;
  onBairro: (q: string) => void;
}

const OPCOES_MES: { id: FiltroMes; label: string }[] = [
  { id: 'tudo', label: 'Tudo' },
  { id: 'este_mes', label: 'Este mês' },
  { id: 'mes_passado', label: 'Mês passado' },
];

const OPCOES_TIPO_MIDIA: { id: FiltroTipoMidia; label: string }[] = [
  { id: 'tudo', label: 'Tudo' },
  { id: 'foto', label: 'Foto' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'spotify', label: 'Spotify' },
  { id: 'audio', label: 'Áudio' },
];

const PESSOAS_OPTIONS = [
  { value: 'pessoa_a', label: 'A', accent: 'purple' as const },
  { value: 'pessoa_b', label: 'B', accent: 'pink' as const },
  { value: 'ambos', label: 'Ambos', accent: 'cyan' as const },
];

// Compara objeto FiltroMes via shape (string | { ano, mes }).
function mesIgual(a: FiltroMes, b: FiltroMes): boolean {
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  return a.ano === b.ano && a.mes === b.mes;
}

export function FiltrosBar({
  filtros,
  onPessoa,
  onMes,
  onTipoMidia,
  onIntensidade,
  onBairro,
}: FiltrosBarProps) {
  // Estado local do input de bairro com debounce 300ms — evita
  // re-filtrar a lista a cada caractere digitado.
  const [bairroLocal, setBairroLocal] = useState(filtros.bairro);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setBairroLocal(filtros.bairro);
  }, [filtros.bairro]);

  const handleBairro = (texto: string) => {
    setBairroLocal(texto);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onBairro(texto);
    }, 300);
  };

  return (
    <View style={{ gap: 12 }}>
      <Rotulo>Pessoa</Rotulo>
      <ChipGroup
        mode="single"
        options={PESSOAS_OPTIONS}
        value={filtros.pessoa}
        onChange={(next) => {
          if (next === null) {
            onPessoa('ambos');
            return;
          }
          onPessoa(next as PessoaId);
        }}
      />

      <Rotulo>Filtrar por mês</Rotulo>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {OPCOES_MES.map((o) => (
          <Chip
            key={String(o.id)}
            label={o.label}
            selected={mesIgual(filtros.mes, o.id)}
            onPress={() => onMes(o.id)}
            accent="cyan"
          />
        ))}
      </ScrollView>

      <Rotulo>Filtrar por mídia</Rotulo>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {OPCOES_TIPO_MIDIA.map((o) => (
          <Chip
            key={o.id}
            label={o.label}
            selected={filtros.tipoMidia === o.id}
            onPress={() => onTipoMidia(o.id)}
            accent="orange"
          />
        ))}
      </ScrollView>

      <Rotulo>
        {`Intensidade (${filtros.intensidade.min}-${filtros.intensidade.max})`}
      </Rotulo>
      <View style={{ gap: 4 }}>
        <Slider
          value={filtros.intensidade.min}
          min={1}
          max={5}
          step={1}
          onChange={(v) =>
            onIntensidade({
              min: v,
              max: Math.max(v, filtros.intensidade.max),
            })
          }
          label="Mín"
          accessibilityLabel="filtro intensidade minima"
        />
        <Slider
          value={filtros.intensidade.max}
          min={1}
          max={5}
          step={1}
          onChange={(v) =>
            onIntensidade({
              min: Math.min(v, filtros.intensidade.min),
              max: v,
            })
          }
          label="Máx"
          accessibilityLabel="filtro intensidade maxima"
        />
      </View>

      <Rotulo>Bairro</Rotulo>
      <Input
        value={bairroLocal}
        onChangeText={handleBairro}
        placeholder="Buscar por bairro"
        accessibilityLabel="filtro bairro"
      />
    </View>
  );
}

function Rotulo({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: colors.muted,
        fontSize: 12,
        lineHeight: 16,
      }}
    >
      {children}
    </Text>
  );
}
