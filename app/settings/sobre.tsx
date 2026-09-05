// Tela "Sobre" detalhada acessivel via Settings -> Sobre. Reusa o
// componente <SecaoSobre> (versao/build/hash/repo/licenca) e adiciona
// o mini-changelog amigavel lido de RELEASE_NOTES (TS estruturado, nao
// import bruto do CHANGELOG.md). Texto em sentence case PT-BR
// completa. Sem analytics, sem opt-out (ADR-0007).
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Header, Screen } from '@/components/ui';
import { SecaoSobre } from '@/components/settings/SecaoSobre';
import { SecaoLista } from '@/components/settings/SecaoLista';
import { RELEASE_NOTES } from '@/lib/release/changelog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomContentPadding } from '@/components/chrome/safeBottom';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function SobreTela() {
  const router = useRouter();
  // R-HOME-4f: reserva a zona do FABMenu global para o rodape do
  // changelog nao ficar atras do FAB.
  const insets = useSafeAreaInsets();
  const paddingBottomFab = useSafeBottomContentPadding(insets.bottom);
  return (
    <Screen>
      <Header title="Sobre" onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.sm,
          paddingBottom: paddingBottomFab,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* AUDIT-P2-9: semTituloDeSecao evita repetir "Sobre" logo
            abaixo do Header homonimo. A View reproduz o marginTop
            que a SecaoLista dava, para o bloco nao colar no Header. */}
        <View style={{ marginTop: spacing.xl }}>
          <SecaoSobre semTituloDeSecao />
        </View>
        <SecaoMiniChangelog />
        <SecaoCreditos />
      </ScrollView>
    </Screen>
  );
}

function SecaoMiniChangelog() {
  return (
    <SecaoLista titulo="O que mudou" accessibilityLabel="secao o que mudou">
      {RELEASE_NOTES.map((nota) => (
        <BlocoVersao key={nota.versao} nota={nota} />
      ))}
    </SecaoLista>
  );
}

interface BlocoVersaoProps {
  nota: {
    versao: string;
    data: string;
    mudancas: readonly string[];
  };
}

function BlocoVersao({ nota }: BlocoVersaoProps) {
  return (
    <View
      accessibilityLabel={`versao ${nota.versao}`}
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: radius.card,
        padding: spacing.base,
        gap: spacing.xs,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: spacing.sm,
        }}
      >
        <Text
          style={{
            color: colors.purple,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: typography.body.size,
          }}
        >
          v{nota.versao}
        </Text>
        <Text
          style={{
            color: colors.mutedDecor,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.caption.size,
          }}
        >
          {nota.data}
        </Text>
      </View>
      <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
        {nota.mudancas.map((m, idx) => (
          <View
            key={idx}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: spacing.sm,
            }}
          >
            <Text
              style={{
                color: colors.mutedDecor,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: typography.body.size,
                lineHeight: typography.body.size * typography.body.lineHeight,
              }}
            >
              •
            </Text>
            <Text
              style={{
                flex: 1,
                color: colors.fg,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: typography.body.size,
                lineHeight: typography.body.size * typography.body.lineHeight,
              }}
            >
              {m}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SecaoCreditos() {
  return (
    <SecaoLista titulo="Créditos" accessibilityLabel="secao creditos">
      <View
        accessibilityLabel="texto creditos"
        style={{
          backgroundColor: colors.bgAlt,
          borderRadius: radius.card,
          padding: spacing.base,
        }}
      >
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.body.size,
            lineHeight: typography.body.size * typography.body.lineHeight,
          }}
        >
          Projeto comunitário de código aberto. Construído com Expo, React
          Native e ferramentas livres. Distribuído sem telemetria, sem coleta de
          dados e sem dependência de serviços remotos.
        </Text>
      </View>
      <SecaoCreditosMusicas />
    </SecaoLista>
  );
}

// R-RECAP-9 (2026-07-11): atribuicao obrigatoria da licenca CC BY 4.0
// das trilhas do Recap (Kevin MacLeod). A CC BY exige credito visivel;
// esta secao satisfaz a obrigacao no proprio app. Inventario completo
// em assets/sounds/recap-musicas/CREDITS.md.
function SecaoCreditosMusicas() {
  const urlLicenca = 'https://creativecommons.org/licenses/by/4.0/';
  return (
    <View
      accessibilityLabel="creditos musicas recap"
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: radius.card,
        padding: spacing.base,
        marginTop: spacing.sm,
        gap: spacing.xs,
      }}
    >
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: typography.body.size,
          lineHeight: typography.body.size * typography.body.lineHeight,
        }}
      >
        Músicas do Recap
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: typography.body.size,
          lineHeight: typography.body.size * typography.body.lineHeight,
        }}
      >
        Kevin MacLeod (incompetech.com). Licenciadas sob Creative Commons
        Attribution 4.0 (CC BY 4.0).
      </Text>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="abrir licenca creative commons by 4.0"
        onPress={() => Linking.openURL(urlLicenca)}
        hitSlop={8}
      >
        <Text
          style={{
            color: colors.purple,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.caption.size,
            lineHeight: typography.caption.size * typography.body.lineHeight,
          }}
        >
          creativecommons.org/licenses/by/4.0
        </Text>
      </Pressable>
    </View>
  );
}
