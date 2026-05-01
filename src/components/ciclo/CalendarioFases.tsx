// Calendario adaptativo 28-35 dias com celulas coloridas por fase.
// Layout grid 7 colunas; número de linhas = 4 (28 dias) ou 5 (35 dias)
// conforme duracao detectada do ultimo ciclo registrado.
//
// Cada celula tem fundo da cor da fase em 30% opacity e outline 1px
// na cor da fase. Toque chama onSelectDay(data) para abrir o sheet
// de registro. Dia sem registro (fase inferida apenas) renderiza com
// fundo neutro bg-alt e outline muted-decor para não parecer
// "alarmante" (regra do tom sobrio: pular dias sem culpa).
//
// Cores canonicas por fase (M14.5 spec, paleta Dracula):
//   folicular  -> cyan
//   ovulatoria -> yellow
//   lutea      -> purple
//   menstrual  -> red
//
// Número do dia (1..28/35) renderiza no centro da celula em monoespaco
// pequeno; cor fg quando ha registro, muted quando inferido apenas.
//
// Comentarios sem acento.
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors } from '@/theme/tokens';
import {
  inferirFase,
} from '@/lib/vault/ciclo';
import type {
  CicloMenstrualMeta,
  FaseCiclo,
} from '@/lib/schemas/ciclo_menstrual';

const CELL_SIZE = 32;
const CELL_GAP = 6;

// Hex literal so aqui (componente terminal). Dois formatos: solid (cor
// pura para outline) e fill (cor com 30% alpha para fundo).
const FASE_COR: Record<FaseCiclo, string> = {
  folicular: colors.cyan,
  ovulatoria: colors.yellow,
  lutea: colors.purple,
  menstrual: colors.red,
};

// Adiciona alpha 4D (~30%) ao hex de 6 digitos.
function fillFromSolid(hex: string): string {
  return `${hex}4D`;
}

export interface CalendarioFasesProps {
  // Lista de registros existentes (para pintar cor real).
  registros: CicloMenstrualMeta[];
  // Data de início do ultimo ciclo (para inferir fases dos dias sem
  // registro). Pode ser null antes do primeiro registro.
  dataInicioUltimoCiclo: string | null;
  // Duracao detectada do ciclo (28 ou 35). Calendario adapta linhas.
  duracao: number;
  onSelectDay: (data: string) => void;
}

// Adiciona N dias a uma data YYYY-MM-DD e devolve outra YYYY-MM-DD.
// Operacao em UTC para evitar drift de timezone.
function adicionarDias(data: string, n: number): string {
  const base = new Date(`${data}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + n);
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, '0');
  const d = String(base.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function CalendarioFases({
  registros,
  dataInicioUltimoCiclo,
  duracao,
  onSelectDay,
}: CalendarioFasesProps) {
  // Limita duracao em 28 ou 35 (calendario adaptativo). Spec diz: 28
  // padrao; vira 35 se ciclo registrado dura > 28.
  const linhas = duracao > 28 ? 5 : 4;
  const totalDias = linhas * 7;

  // Mapa data -> registro para olhar O(1) na hora de pintar.
  const registroPorData = useMemo(() => {
    const map = new Map<string, CicloMenstrualMeta>();
    for (const r of registros) map.set(r.data, r);
    return map;
  }, [registros]);

  // Gera as celulas a partir do dataInicioUltimoCiclo. Quando null,
  // empty state e renderizado pelo caller; aqui ainda assim geramos
  // celulas inertes para manter shape testavel.
  const celulas = useMemo(() => {
    if (!dataInicioUltimoCiclo) {
      // Sem início conhecido, geramos 28 celulas placeholder com
      // fase 'menstrual' (fallback do inferirFase) sem registro real.
      return Array.from({ length: totalDias }).map((_, i) => ({
        index: i,
        data: '',
        fase: 'menstrual' as FaseCiclo,
        temRegistro: false,
      }));
    }
    return Array.from({ length: totalDias }).map((_, i) => {
      const data = adicionarDias(dataInicioUltimoCiclo, i);
      const registro = registroPorData.get(data);
      const fase = registro?.fase ?? inferirFase(data, dataInicioUltimoCiclo);
      return {
        index: i,
        data,
        fase,
        temRegistro: Boolean(registro),
      };
    });
  }, [dataInicioUltimoCiclo, totalDias, registroPorData]);

  return (
    <View
      accessibilityLabel="calendario de fases"
      style={{ gap: CELL_GAP }}
    >
      {Array.from({ length: linhas }).map((_, linhaIdx) => (
        <View
          key={`linha-${linhaIdx}`}
          style={{ flexDirection: 'row', gap: CELL_GAP }}
        >
          {celulas
            .slice(linhaIdx * 7, linhaIdx * 7 + 7)
            .map((c) => {
              const corSolid = FASE_COR[c.fase];
              const corFill = fillFromSolid(corSolid);
              const fundo = c.temRegistro ? corFill : colors.bgAlt;
              const borda = c.temRegistro ? corSolid : colors.bgElev;
              const numero = c.index + 1;

              return (
                <Pressable
                  key={`celula-${c.index}`}
                  onPress={() => {
                    if (!c.data) return;
                    haptics.selection();
                    onSelectDay(c.data);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`dia ${numero} fase ${c.fase}`}
                >
                  <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={springs.subtle}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      borderRadius: 6,
                      borderWidth: 1,
                      backgroundColor: fundo,
                      borderColor: borda,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: c.temRegistro ? colors.fg : colors.muted,
                        fontFamily: 'JetBrainsMono_400Regular',
                        fontSize: 11,
                      }}
                    >
                      {numero}
                    </Text>
                  </MotiView>
                </Pressable>
              );
            })}
        </View>
      ))}
    </View>
  );
}
