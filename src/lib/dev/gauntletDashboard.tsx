// M-GAUNTLET-DEAD-CODE-V2: dashboard interativo extraido de
// app/_dev/gauntlet.tsx. Vive em src/lib/dev/ porque expo-router faz
// require.context dos arquivos em app/, o que arrastaria gauntlet.ts
// (com __gauntlet, instalarGauntlet, useGaleriaMock, adicionarFotoMock)
// para o bundle Android release. Aqui em src/lib/dev/ o modulo so e
// alcancado via require lazy guardado por __DEV__ no wrapper de rota.
//
// Em web + __DEV__, expoe botoes para seed/reset/abrirMenu/fecharMenu,
// lista de rotas para navegacao manual via toque, e painel JSON com
// estado atual auto-refresh a cada 500ms. Tudo do dashboard usa
// diretamente window.__gauntlet (instalado em _layout.tsx) -- assim o
// orquestrador pode reproduzir exatamente o que o humano clica.
//
// Comentarios sem acento. UI strings PT-BR sentence case.
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { gauntlet, GAUNTLET_ATIVO } from '@/lib/dev/gauntlet';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const ROTAS_VER = [
  { rota: '/', label: 'Hoje' },
  { rota: '/memoria', label: 'Memorias' },
  { rota: '/humor', label: 'Humor' },
  { rota: '/calendario', label: 'Calendario' },
  { rota: '/financas', label: 'Financas' },
];

const ROTAS_REGISTRAR = [
  { rota: '/humor-rapido', label: 'Humor rapido' },
  { rota: '/diario-emocional', label: 'Diario emocional' },
  { rota: '/eventos', label: 'Eventos' },
  { rota: '/scanner', label: 'Scanner' },
];

const ROTAS_OPCIONAIS = [
  { rota: '/todo', label: 'Tarefas' },
  { rota: '/alarmes', label: 'Alarmes' },
  { rota: '/contadores', label: 'Contadores' },
  { rota: '/ciclo', label: 'Ciclo' },
  { rota: '/exercicios', label: 'Exercicios' },
  { rota: '/medidas', label: 'Medidas' },
  { rota: '/settings', label: 'Configuracoes' },
];

const ROTAS_DEV = [
  { rota: '/_dev/showcase', label: 'Showcase 24 telas' },
];

export default function GauntletDashboard() {
  const router = useRouter();
  const [estadoAtual, setEstadoAtual] = useState(() =>
    GAUNTLET_ATIVO ? gauntlet.estado() : null
  );

  useEffect(() => {
    if (!GAUNTLET_ATIVO) return;
    const id = setInterval(() => {
      setEstadoAtual(gauntlet.estado());
    }, 500);
    return () => clearInterval(id);
  }, []);

  if (!GAUNTLET_ATIVO || !estadoAtual) {
    return (
      <View style={{ flex: 1, padding: spacing.lg }}>
        <Text style={{ color: colors.fg }}>Modo gauntlet inativo.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgPage }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
    >
      <Text
        style={{
          color: colors.orange,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: typography.heading2.size,
          marginBottom: spacing.sm,
        }}
      >
        Gauntlet
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: typography.body.size,
          marginBottom: spacing.base,
        }}
      >
        Interface dev de teste. Use os botões abaixo ou
        window.__gauntlet via console.
      </Text>

      <Secao titulo="Acoes">
        <FileiraBotoes>
          <BotaoAcao
            label="Seed"
            cor={colors.green}
            onPress={() => gauntlet.seed()}
          />
          <BotaoAcao
            label="Reset"
            cor={colors.red}
            onPress={() => gauntlet.reset()}
          />
        </FileiraBotoes>
        <FileiraBotoes>
          <BotaoAcao
            label="Seed casal"
            cor={colors.green}
            onPress={() =>
              gauntlet.seed({ nomeA: 'Alice', nomeB: 'Bob' })
            }
          />
          <BotaoAcao
            label="Abrir menu"
            cor={colors.purple}
            onPress={() => gauntlet.abrirMenu()}
          />
          <BotaoAcao
            label="Fechar menu"
            cor={colors.purple}
            onPress={() => gauntlet.fecharMenu()}
          />
        </FileiraBotoes>
      </Secao>

      <Secao titulo="Estado atual">
        <View
          style={{
            backgroundColor: colors.bg,
            padding: spacing.md,
            borderRadius: radius.card,
          }}
        >
          <Text
            style={{
              color: colors.cyan,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: typography.caption.size,
            }}
          >
            {JSON.stringify(estadoAtual, null, 2)}
          </Text>
        </View>
      </Secao>

      <Secao titulo="Ver">
        {ROTAS_VER.map((r) => (
          <LinhaRota key={r.rota} rota={r.rota} label={r.label} router={router} />
        ))}
      </Secao>

      <Secao titulo="Registrar (sheets opacas)">
        {ROTAS_REGISTRAR.map((r) => (
          <LinhaRota key={r.rota} rota={r.rota} label={r.label} router={router} />
        ))}
      </Secao>

      <Secao titulo="Opcionais e settings">
        {ROTAS_OPCIONAIS.map((r) => (
          <LinhaRota key={r.rota} rota={r.rota} label={r.label} router={router} />
        ))}
      </Secao>

      <Secao titulo="Dev">
        {ROTAS_DEV.map((r) => (
          <LinhaRota key={r.rota} rota={r.rota} label={r.label} router={router} />
        ))}
      </Secao>
    </ScrollView>
  );
}

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        style={{
          color: colors.orange,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: typography.caption.size,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginTop: spacing.md,
        }}
      >
        {titulo}
      </Text>
      {children}
    </View>
  );
}

function FileiraBotoes({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
      {children}
    </View>
  );
}

function BotaoAcao({
  label,
  cor,
  onPress,
}: {
  label: string;
  cor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`gauntlet ${label.toLowerCase()}`}
      onPress={onPress}
      style={{
        backgroundColor: cor,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.card,
        minHeight: 40,
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: colors.bgPage,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: typography.caption.size,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function LinhaRota({
  rota,
  label,
  router,
}: {
  rota: string;
  label: string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`abrir ${label.toLowerCase()}`}
      onPress={() => router.push(rota as Parameters<typeof router.push>[0])}
      style={{
        backgroundColor: colors.bg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.card,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: typography.body.size,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: colors.mutedDecor,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: typography.caption.size,
        }}
      >
        {rota}
      </Text>
    </Pressable>
  );
}
