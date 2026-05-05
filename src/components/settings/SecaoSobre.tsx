// Bloco "Sobre" reusavel. Mostra versao, build, hash do commit (curto),
// link para o repositorio e licenca. Usado tanto no rodape de
// app/settings/index.tsx quanto na tela dedicada app/settings/sobre.tsx.
//
// Versao vem de Constants.expoConfig.version (app.json). Build vem de
// Constants.expoConfig.android.versionCode. Commit hash vem de
// Constants.expoConfig.extra.commitHash quando preenchido pelo
// pipeline de build (env EXPO_PUBLIC_GIT_HASH); fallback "dev" em
// desenvolvimento local. Tudo lido em sentence case PT-BR.
import { Linking, Pressable, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { SecaoLista } from '@/components/settings/SecaoLista';
import {
  APP_GITHUB_LABEL,
  APP_LICENSE,
  APP_REPO_URL,
} from '@/config/app.config';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing, typography } from '@/theme/tokens';

interface ExtraConfig {
  commitHash?: string;
}

function lerVersao(): string {
  const v = Constants.expoConfig?.version as string | undefined;
  return v && v.length > 0 ? v : '0.0.0';
}

function lerBuild(): string {
  const b = Constants.expoConfig?.android?.versionCode;
  if (typeof b === 'number') return String(b);
  return '0';
}

function lerHashCommit(): string {
  const extra = (Constants.expoConfig?.extra as ExtraConfig | undefined) ?? {};
  const hash = extra.commitHash;
  if (typeof hash !== 'string' || hash.length === 0) return 'dev';
  return hash.slice(0, 7);
}

interface SecaoSobreProps {
  // Quando true, omite o titulo da SecaoLista (caller ja tem header
  // proprio). Default false.
  semTituloDeSecao?: boolean;
}

export function SecaoSobre({ semTituloDeSecao = false }: SecaoSobreProps = {}) {
  const versao = lerVersao();
  const build = lerBuild();
  const hash = lerHashCommit();

  const conteudo = (
    <>
      <LinhaInfo titulo="Versão" valor={versao} />
      <LinhaInfo titulo="Build" valor={build} />
      <LinhaInfo titulo="Commit" valor={hash} />
      {APP_REPO_URL.length > 0 ? (
        <Pressable
          onPress={() => {
            haptics.light();
            void Linking.openURL(APP_REPO_URL);
          }}
          accessibilityRole="link"
          accessibilityLabel="abrir repositorio no github"
          style={{
            backgroundColor: colors.bgAlt,
            borderRadius: radius.card,
            padding: spacing.base,
            minHeight: 56,
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: colors.purple,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: typography.body.size,
            }}
          >
            {APP_GITHUB_LABEL}
          </Text>
        </Pressable>
      ) : null}
      <LinhaInfo titulo="Licença" valor={APP_LICENSE} />
    </>
  );

  if (semTituloDeSecao) {
    return (
      <View
        accessibilityLabel="bloco sobre"
        style={{ gap: spacing.sm }}
      >
        {conteudo}
      </View>
    );
  }

  return (
    <SecaoLista titulo="Sobre" accessibilityLabel="secao sobre">
      {conteudo}
    </SecaoLista>
  );
}

interface LinhaInfoProps {
  titulo: string;
  valor: string;
}

function LinhaInfo({ titulo, valor }: LinhaInfoProps) {
  return (
    <View
      accessibilityLabel={`linha info ${titulo.toLowerCase()}`}
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: radius.card,
        padding: spacing.base,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 56,
      }}
    >
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: typography.body.size,
        }}
      >
        {titulo}
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: typography.body.size,
        }}
      >
        {valor}
      </Text>
    </View>
  );
}
