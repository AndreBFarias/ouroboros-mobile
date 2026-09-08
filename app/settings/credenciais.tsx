// Sub-tela /settings/credenciais (P4, 2026-09-08): a pessoa cadastra a
// PROPRIA credencial do Google e do Spotify. O valor vai para o
// SecureStore deste aparelho, fora do bundle e fora do git.
//
// SOBRE O TEXTO DESTA TELA
//
// O eixo de acessibilidade do projeto e' CONTROLE, nao conformidade: o
// defeito e' o aplicativo decidir sozinho algo que deveria ser escolha.
// Ate 2026-09-08 quem instalava o APK herdava a credencial do dono e
// batia na allowlist do consent screen do Google (ou no teto de 5
// contas do Development mode do Spotify) sem entender por que. Esta
// tela existe para transformar aquela recusa opaca numa escolha
// informada.
//
// Por isso o texto aqui NAO usa "erro", "falha" nem "nao configurado":
// nao ha defeito nenhum a relatar. Ha uma escolha que a pessoa ainda
// nao fez, e ela pode nunca fazer -- o nucleo do aplicativo inteiro
// funciona sem credencial nenhuma. Linguagem literal, sem ironia, sem
// metafora, sem exclamacao (ADR-0005).
//
// Comentarios sem acento (convencao shell/CI). Strings de UI em PT-BR
// sentence case com acentuacao completa. accessibilityLabel sem acento.
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Header, Input, Screen, useToast } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomContentPadding } from '@/components/chrome/safeBottom';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { APP_REPO_URL } from '@/config/app.config';
import {
  useCredenciais,
  pareceClientIdCompleto,
  type ServicoCredencial,
} from '@/lib/stores/credenciais';

interface BlocoServicoProps {
  servico: ServicoCredencial;
  titulo: string;
  // O que essa credencial destrava, em termos do que a pessoa ve no
  // menu -- nao em termos de API.
  cobertura: string;
  // Caminho do passo a passo que ja existe no repositorio.
  documento: string;
  rotuloCampo: string;
  exemplo: string;
  // Observacao especifica do provedor. Opcional.
  observacao?: string;
  corBorda: string;
}

function BlocoServico({
  servico,
  titulo,
  cobertura,
  documento,
  rotuloCampo,
  exemplo,
  observacao,
  corBorda,
}: BlocoServicoProps) {
  const toast = useToast();
  const salvo = useCredenciais((s) => s[servico]);
  const definir = useCredenciais((s) => s.definir);
  const remover = useCredenciais((s) => s.remover);
  // Rascunho local: comeca no valor salvo para a pessoa conferir e
  // corrigir o que ja cadastrou, em vez de ter que apagar e recolar.
  const [rascunho, setRascunho] = useState<string>(salvo ?? '');

  const salvar = useCallback(() => {
    const limpo = rascunho.trim();
    if (limpo.length === 0) {
      remover(servico);
      void haptics.light();
      toast.show('Campo vazio. A credencial saiu deste aparelho.', 'info');
      return;
    }
    definir(servico, limpo);
    void haptics.success();
    toast.show('Credencial salva neste aparelho.', 'success');
  }, [rascunho, definir, remover, servico, toast]);

  const limpar = useCallback(() => {
    remover(servico);
    setRascunho('');
    void haptics.light();
    toast.show('Credencial removida deste aparelho.', 'info');
  }, [remover, servico, toast]);

  // Conferencia de forma, nao de validade. Aparece so quando ha texto
  // digitado que nao tem a cara esperada; nunca bloqueia o salvar.
  const avisoForma =
    rascunho.trim().length > 0 && !pareceClientIdCompleto(servico, rascunho);

  return (
    <View
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: radius.card,
        borderLeftWidth: 3,
        borderLeftColor: corBorda,
        padding: spacing.base,
        gap: spacing.sm,
      }}
      accessibilityLabel={`bloco credencial ${servico}`}
    >
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: typography.heading2.size,
          lineHeight: typography.heading2.size * typography.heading2.lineHeight,
        }}
      >
        {titulo}
      </Text>

      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: typography.caption.size,
          lineHeight: typography.caption.size * typography.caption.lineHeight,
        }}
      >
        {cobertura}
      </Text>

      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: typography.caption.size,
          lineHeight: typography.caption.size * typography.caption.lineHeight,
        }}
      >
        O passo a passo está em {documento}, no repositório do projeto.
      </Text>

      <Text
        style={{
          color: salvo ? colors.green : colors.mutedDecor,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: typography.micro.size,
          lineHeight: typography.micro.size * typography.micro.lineHeight,
        }}
        accessibilityLabel={`estado credencial ${servico} ${
          salvo ? 'salva' : 'ausente'
        }`}
      >
        {salvo
          ? 'Guardado neste aparelho.'
          : 'Ainda sem código guardado neste aparelho.'}
      </Text>

      <Input
        value={rascunho}
        onChangeText={setRascunho}
        label={rotuloCampo}
        placeholder={exemplo}
        autoCapitalize="none"
        accessibilityLabel={`campo credencial ${servico}`}
      />

      {avisoForma ? (
        <Text
          style={{
            color: colors.yellow,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.micro.size,
            lineHeight: typography.micro.size * typography.micro.lineHeight,
          }}
          accessibilityLabel={`aviso forma credencial ${servico}`}
        >
          {servico === 'google'
            ? 'Esse código costuma terminar em .apps.googleusercontent.com. Vale conferir se ele veio inteiro. Você pode salvar assim mesmo.'
            : 'Esse código costuma ter 32 caracteres, entre números e letras de a a f. Vale conferir se ele veio inteiro. Você pode salvar assim mesmo.'}
        </Text>
      ) : null}

      {observacao ? (
        <Text
          style={{
            color: colors.mutedDecor,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.micro.size,
            lineHeight: typography.micro.size * typography.micro.lineHeight,
          }}
        >
          {observacao}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          paddingTop: spacing.xs,
        }}
      >
        <Button
          label="Guardar"
          onPress={salvar}
          accessibilityLabel={`guardar credencial ${servico}`}
        />
        {salvo ? (
          <Button
            label="Apagar"
            variant="ghost"
            onPress={limpar}
            accessibilityLabel={`apagar credencial ${servico}`}
          />
        ) : null}
      </View>
    </View>
  );
}

export default function CredenciaisTela() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const paddingBottomFab = useSafeBottomContentPadding(insets.bottom);

  return (
    <Screen>
      <Header title="Credenciais próprias" onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingBottom: paddingBottomFab,
          gap: spacing.base,
        }}
        showsVerticalScrollIndicator={false}
        accessibilityLabel="tela credenciais proprias"
      >
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.caption.size,
            lineHeight: typography.caption.size * typography.caption.lineHeight,
          }}
        >
          Quatro conexões deste aplicativo falam com servidores de outras
          empresas: a Agenda, o backup no Google Drive, o YouTube e o Spotify.
        </Text>

        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.caption.size,
            lineHeight: typography.caption.size * typography.caption.lineHeight,
          }}
        >
          Essas empresas pedem que cada aplicativo se identifique com um código
          próprio, e limitam quantas pessoas podem usar o mesmo código. Um
          código emprestado seria recusado por elas na primeira tentativa, sem
          dizer o motivo. Por isso essas quatro conexões começam desligadas
          aqui, e só ligam com um código seu.
        </Text>

        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.caption.size,
            lineHeight: typography.caption.size * typography.caption.lineHeight,
          }}
        >
          Criar o código é gratuito e leva alguns minutos. Enquanto você não
          quiser passar por isso, o restante do aplicativo continua inteiro:
          diário, humor, tarefas, contadores, marcos, treinos, Recap, mídia,
          leitura de texto em imagem feita no próprio aparelho, Conexão Saúde,
          compartilhamento de outros aplicativos e backup em ZIP. Nada disso
          depende de código nenhum.
        </Text>

        <BlocoServico
          servico="google"
          titulo="Google"
          cobertura="Um código só atende a Agenda, o backup no Drive e o YouTube, porque os três vivem no mesmo projeto do Google."
          documento="docs/OAUTH-SETUP.md"
          rotuloCampo="Código do cliente (client ID)"
          exemplo="000000000000-abc.apps.googleusercontent.com"
          corBorda={colors.cyan}
        />

        <BlocoServico
          servico="spotify"
          titulo="Spotify"
          cobertura="Cobre a sua biblioteca e o que está tocando agora. A prévia de faixa e o botão de abrir no Spotify funcionam sem código."
          documento="docs/SETUP-SPOTIFY.md"
          rotuloCampo="Código do cliente (client ID)"
          exemplo="32 caracteres, sem espaços"
          observacao="O painel do Spotify também mostra um campo chamado Client Secret. Ele não é usado aqui e não precisa ser copiado."
          corBorda={colors.green}
        />

        <Text
          style={{
            color: colors.mutedDecor,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.micro.size,
            lineHeight: typography.micro.size * typography.micro.lineHeight,
          }}
        >
          O que você guardar aqui fica neste aparelho, no armazenamento
          protegido do sistema. Não vai para o Vault, não entra em backup e sai
          junto se você desinstalar o aplicativo.
        </Text>

        {APP_REPO_URL.length > 0 ? (
          <Pressable
            onPress={() => {
              void haptics.light();
              void Linking.openURL(APP_REPO_URL);
            }}
            accessibilityRole="link"
            accessibilityLabel="abrir repositorio do projeto"
            hitSlop={8}
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
                lineHeight: typography.body.size * typography.body.lineHeight,
              }}
            >
              Abrir o repositório do projeto
            </Text>
            <Text
              style={{
                color: colors.mutedDecor,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: typography.micro.size,
                lineHeight: typography.micro.size * typography.micro.lineHeight,
                marginTop: 2,
              }}
            >
              Os dois passo a passo estão na pasta docs.
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
