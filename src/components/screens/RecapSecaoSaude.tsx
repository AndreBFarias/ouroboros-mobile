// Secao Saude do Recap (R-INT-3-HC-RECAP-CARD, 2026-05-25). Consolida
// os dados que o autopull HC abastece (passos, treinos, sono, medidas)
// num card unico. Cada linha presente e clicavel e navega para a rota
// canonica do dado (destinoSaude).
//
// Render condicional: a secao so aparece se ao menos uma metrica tiver
// dado no periodo. Sem dado HC algum, o componente retorna null e nao
// ocupa espaco (diferente de RecapSecaoNumeros, que delega o ocultar
// ao container; aqui a propria secao decide para manter o RecapScreen
// enxuto e a logica de janela isolada no agregador).
//
// ADR-0005: sem emoji, sem comparativo negativo. Delta de peso aparece
// com sinal neutro (+/-) sem juizo de valor. Copy sobria.
//
// Strings PT-BR sentence case com acentuacao completa.
// Comentarios sem acento (convencao shell/CI).
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { type SaudeRecap } from '@/lib/recap/saude';
import { destinoSaude, type SaudeChave } from '@/lib/recap/destinos';

interface Props {
  // R-INT-3-HC-RECAP-CARD-FOLLOWUP: o agregado de saude e calculado
  // uma unica vez no RecapScreen (que ja precisa do resultado para o
  // predicado de recap vazio) e injetado como prop. Antes a secao
  // fazia o proprio fetch via useEffect, causando duplo calculo.
  // null = sem dado de saude no periodo (ou ainda carregando); a secao
  // se oculta.
  saude: SaudeRecap | null;
}

// Formata inteiro com ponto de milhar PT-BR (57300 -> "57.300"). Sem
// Intl para nao depender de polyfill em Hermes; implementacao manual.
function milhar(n: number): string {
  const sinal = n < 0 ? '-' : '';
  const abs = Math.abs(Math.round(n)).toString();
  const partes: string[] = [];
  for (let i = abs.length; i > 0; i -= 3) {
    partes.unshift(abs.slice(Math.max(0, i - 3), i));
  }
  return `${sinal}${partes.join('.')}`;
}

// Formata decimal com virgula PT-BR e 1 casa (7.2 -> "7,2").
function decimal1(n: number): string {
  const arred = Math.round(n * 10) / 10;
  return arred.toFixed(1).replace('.', ',');
}

// Formata delta de peso com sinal explicito (+0,4 / -0,4). Zero vira
// "0,0" sem sinal (sem variacao no periodo).
function deltaPeso(n: number): string {
  if (n === 0) return '0,0 kg';
  const sinal = n > 0 ? '+' : '-';
  return `${sinal}${decimal1(Math.abs(n))} kg`;
}

interface Linha {
  chave: SaudeChave;
  texto: string;
  a11y: string;
}

// Monta as linhas a partir do agregado. Cada metrica null e omitida.
function montarLinhas(saude: SaudeRecap): Linha[] {
  const linhas: Linha[] = [];

  if (saude.passos) {
    const { total, mediaDia } = saude.passos;
    linhas.push({
      chave: 'passos',
      texto: `${milhar(total)} passos (${milhar(mediaDia)}/dia)`,
      a11y: `${total} passos no periodo`,
    });
  }

  if (saude.treinos) {
    const { total, duracaoMin } = saude.treinos;
    const horas = decimal1(duracaoMin / 60);
    const rotulo = total === 1 ? 'treino' : 'treinos';
    linhas.push({
      chave: 'treinos',
      texto: `${total} ${rotulo} (${horas}h total)`,
      a11y: `${total} treinos no periodo`,
    });
  }

  if (saude.sono) {
    const { mediaHoras, noites } = saude.sono;
    linhas.push({
      chave: 'sono',
      texto: `${decimal1(mediaHoras)}h de sono em média`,
      a11y: `${noites} noites de sono no periodo`,
    });
  }

  if (saude.medidaUltima) {
    const { peso, deltaPeso: delta, gordura } = saude.medidaUltima;
    const partes: string[] = [];
    if (typeof peso === 'number') {
      partes.push(`${decimal1(peso)} kg`);
      if (typeof delta === 'number') {
        partes.push(`(${deltaPeso(delta)})`);
      }
    }
    if (typeof gordura === 'number') {
      partes.push(`${decimal1(gordura)}% de gordura`);
    }
    if (partes.length > 0) {
      linhas.push({
        chave: 'medidas',
        texto: partes.join(' '),
        a11y: 'ultima medida corporal no periodo',
      });
    }
  }

  return linhas;
}

export function RecapSecaoSaude({ saude }: Props) {
  const router = useRouter();

  if (!saude) return null;
  const linhas = montarLinhas(saude);
  // Render condicional: sem nenhuma metrica com dado, secao oculta.
  if (linhas.length === 0) return null;

  const abrir = (chave: SaudeChave) => {
    const destino = destinoSaude(chave);
    if (!destino) return;
    void haptics.light();
    router.push({
      pathname: destino.pathname as never,
      ...(destino.params ? { params: destino.params } : {}),
    });
  };

  return (
    <View style={{ gap: 12 }} accessibilityLabel="secao saude">
      <Text
        style={{
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 18,
          color: colors.fg,
        }}
      >
        Saúde essa semana
      </Text>
      <Card>
        <View style={{ gap: 14, paddingVertical: 4 }}>
          {linhas.map((linha) => (
            <Pressable
              key={linha.chave}
              onPress={() => abrir(linha.chave)}
              accessibilityRole="button"
              accessibilityLabel={linha.a11y}
              hitSlop={8}
            >
              <Text
                style={{
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 15,
                  color: colors.fg,
                  lineHeight: 24,
                }}
              >
                {linha.texto}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>
    </View>
  );
}
