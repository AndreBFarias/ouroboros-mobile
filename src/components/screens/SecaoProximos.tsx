// SecaoProximos (M40, estendida em R-HOME-2). Mostra mescla cronologica
// dos proximos eventos no horizonte de 4h:
//  - Eventos de agenda Google (.md persistidos no Vault apos sync OAuth).
//  - Alarmes pessoais com proximo disparo na janela.
//  - Tarefas com alarme vinculado ainda hoje.
//
// Cada item carrega um micro-icone a esquerda do horario, indicando a
// origem: Calendar para evento, Bell para alarme, Check para tarefa.
// Cor da borda esquerda e do icone seguem o tipo (purple/cyan/green).
//
// Sem badge de prioridade nem highlight de urgencia (ADR-0005). Apenas
// listagem cronologica. Limite hard de 3 itens controlado pelo helper
// mesclarAgendaAlarmes (R-HOME-1 estabeleceu o contrato visual).
//
// Devices sem OAuth conectado: graceful fallback - listarEventosAgenda
// devolve [] e a secao mostra apenas alarmes/tarefas. Sem mensagem de
// erro de auth aqui (a Tela /agenda cuida disso).
//
// Comentarios sem acento (convencao shell/CI).
import type { ComponentType } from 'react';
import { Text, View } from 'react-native';
import { Card, EmptyState } from '@/components/ui';
import { Bell, Calendar, Check } from '@/lib/icons';
import { colors, spacing } from '@/theme/tokens';
import { useProximos } from '@/lib/hooks/useProximos';
import type { ItemProximo } from '@/lib/hooks/useProximos';

const ROTULO_TIPO: Record<ItemProximo['tipo'], string> = {
  alarme: 'Alarme',
  tarefa: 'Tarefa',
  evento: 'Evento',
};

// Icone por tipo de fonte. Calendar para evento agenda Google,
// Bell para alarme pessoal, Check para tarefa com alarme.
// Tipagem do componente de icone do lucide via ComponentType<{ size, color, strokeWidth }>.
type IconeComp = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

const ICONE_POR_TIPO: Record<ItemProximo['tipo'], IconeComp> = {
  evento: Calendar,
  alarme: Bell,
  tarefa: Check,
};

// Cor da borda esquerda e do icone por tipo. Eventos seguem purple
// (cor primaria do app, igual a Agenda /agenda na nav lateral),
// alarmes seguem cyan (consistente com pre-R-HOME-2), tarefas seguem
// green (cor da semantic positiva do design system).
const COR_POR_TIPO: Record<ItemProximo['tipo'], string> = {
  evento: colors.purple,
  alarme: colors.cyan,
  tarefa: colors.green,
};

interface ItemProps {
  item: ItemProximo;
}

function Item({ item }: ItemProps) {
  const cor = COR_POR_TIPO[item.tipo];
  const Icone = ICONE_POR_TIPO[item.tipo];
  const tituloEstilo = {
    color: colors.fg,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 14,
    lineHeight: 22,
    ...(item.feita
      ? { textDecorationLine: 'line-through' as const, color: colors.muted }
      : {}),
  };

  return (
    <View
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: cor,
        padding: spacing.base,
        flexDirection: 'row',
        gap: spacing.base,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          minWidth: 70,
        }}
      >
        <Icone size={14} color={cor} strokeWidth={2.25} />
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 13,
          }}
        >
          {item.hora}
        </Text>
      </View>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
          }}
        >
          {ROTULO_TIPO[item.tipo]}
        </Text>
        <Text style={tituloEstilo} numberOfLines={2}>
          {item.titulo}
        </Text>
      </View>
    </View>
  );
}

export function SecaoProximos() {
  const { itens, loading, error } = useProximos();

  return (
    <View style={{ gap: spacing.md }}>
      <Text
        style={{
          color: colors.orange,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 16,
        }}
      >
        Próximos
      </Text>
      {loading ? (
        <Card>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
            }}
          >
            Carregando...
          </Text>
        </Card>
      ) : error ? null : itens.length === 0 ? (
        <Card>
          <EmptyState frase="Nada nas próximas horas." />
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {itens.map((item) => (
            <Item key={`${item.tipo}-${item.id}`} item={item} />
          ))}
        </View>
      )}
    </View>
  );
}
