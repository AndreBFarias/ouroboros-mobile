// Secao Agenda do Recap (R-INT-2-CALENDAR-RECAP-CARD, 2026-05-25).
// Espelha RecapSecaoSaude: componente PURO de apresentacao que recebe
// o agregado por prop (calculado uma vez no RecapScreen, junto do
// predicado de recap vazio) e renderiza um card "Agenda essa semana"
// com o total de eventos do Google Calendar no periodo + um resumo
// (dias com evento e proximo titulo). O card inteiro e clicavel e
// navega para /agenda.
//
// Render condicional: a secao so aparece se houver >= 1 evento no
// periodo. agenda === null => secao oculta (mesmo padrao da Saude).
//
// ADR-0005: sem emoji, sem exclamacao, sem comparativo negativo. Copy
// sobria, numeros em PT-BR.
//
// Strings PT-BR sentence case com acentuacao completa.
// Comentarios sem acento (convencao shell/CI).
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { type AgendaRecap } from '@/lib/recap/agenda';
import { destinoAgenda } from '@/lib/recap/destinos';

interface Props {
  // O agregado de agenda e calculado uma unica vez no RecapScreen (que
  // ja precisa do resultado para o predicado de recap vazio) e injetado
  // como prop. null = sem evento no periodo (ou ainda carregando); a
  // secao se oculta.
  agenda: AgendaRecap | null;
}

// Linha principal: contagem de eventos com plural correto.
function linhaTotal(total: number): string {
  const rotulo = total === 1 ? 'evento' : 'eventos';
  return `${total} ${rotulo}`;
}

// Resumo: dias com evento (plural) e, quando ha proximo evento futuro
// em relacao a "agora", o titulo do proximo. Sem proximo, mostra so os
// dias. Copy sobria; sem juizo de valor.
function linhaResumo(agenda: AgendaRecap): string | null {
  const partes: string[] = [];
  const { diasComEvento, proximoTitulo } = agenda;
  if (diasComEvento > 0) {
    const rotulo = diasComEvento === 1 ? 'dia' : 'dias';
    partes.push(`${diasComEvento} ${rotulo} com compromisso`);
  }
  if (proximoTitulo) {
    partes.push(`próximo: ${proximoTitulo}`);
  }
  if (partes.length === 0) return null;
  return partes.join(' · ');
}

export function RecapSecaoAgenda({ agenda }: Props) {
  const router = useRouter();

  if (!agenda) return null;
  // Defesa: agregador retorna null quando vazio, mas total 0 tambem
  // oculta (consistencia com o contrato de render condicional).
  if (agenda.totalEventos === 0) return null;

  const resumo = linhaResumo(agenda);

  const abrir = () => {
    const destino = destinoAgenda();
    void haptics.light();
    router.push({ pathname: destino.pathname as never });
  };

  return (
    <View style={{ gap: 12 }} accessibilityLabel="secao agenda">
      <Text
        style={{
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 18,
          color: colors.fg,
        }}
      >
        Agenda essa semana
      </Text>
      <Card>
        <Pressable
          onPress={abrir}
          accessibilityRole="button"
          accessibilityLabel={`${agenda.totalEventos} eventos na agenda do periodo`}
          hitSlop={8}
        >
          <View style={{ gap: 14, paddingVertical: 4 }}>
            <Text
              style={{
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 15,
                color: colors.fg,
                lineHeight: 24,
              }}
            >
              {linhaTotal(agenda.totalEventos)}
            </Text>
            {resumo ? (
              <Text
                style={{
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 13,
                  color: colors.muted,
                  lineHeight: 22,
                }}
              >
                {resumo}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Card>
    </View>
  );
}
