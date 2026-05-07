// Sub-tela /settings/permissoes (sprint J1). Lista status atual das
// permissoes pedidas no onboarding (camera, microfone, notificacoes,
// localizacao). Para cada permissao mostra:
//   - Titulo + descricao curta da finalidade.
//   - Status (concedida / negada / nao-pedida) com cor canonica.
//   - Botao "Abrir configurações do sistema" quando o status for
//     diferente de concedida (Linking.openSettings()).
//
// Reativo: ao retornar das configuracoes do sistema, o usuario pode
// dar pull-to-refresh ou simplesmente tocar "Atualizar status" para
// re-sincronizar com o sistema (chama get*Status e atualiza
// useOnboarding.permissoes).
//
// Comentarios sem acento. Strings UI em PT-BR sentence case com
// acentuacao. accessibilityLabel sem acento.
import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Header, Screen } from '@/components/ui';
import { SecaoLista } from '@/components/settings/SecaoLista';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import {
  getCameraStatus,
  getLocalizacaoStatus,
  getMicrofoneStatus,
  getNotificacoesStatus,
  type StatusPermissao,
} from '@/lib/permissoes/requestOnboarding';
import { useOnboarding } from '@/lib/stores/onboarding';

interface ItemPermissao {
  chave: 'camera' | 'microfone' | 'notificacoes' | 'localizacao';
  titulo: string;
  descricao: string;
  status: StatusPermissao;
}

const TITULOS: Record<ItemPermissao['chave'], string> = {
  camera: 'Câmera',
  microfone: 'Microfone',
  notificacoes: 'Notificações',
  localizacao: 'Localização',
};

const DESCRICOES: Record<ItemPermissao['chave'], string> = {
  camera: 'Para tirar fotos e escanear documentos.',
  microfone: 'Para gravar áudios no diário.',
  notificacoes: 'Para alarmes e lembretes.',
  localizacao: 'Para detectar bairro nos eventos.',
};

function rotuloStatus(s: StatusPermissao): string {
  if (s === 'concedida') return 'Concedida';
  if (s === 'negada') return 'Negada';
  return 'Não pedida';
}

function corStatus(s: StatusPermissao): string {
  if (s === 'concedida') return colors.green;
  if (s === 'negada') return colors.red;
  return colors.muted;
}

export default function PermissoesTela() {
  const router = useRouter();
  const setPermissao = useOnboarding((s) => s.setPermissao);

  const [statusCamera, setStatusCamera] = useState<StatusPermissao>('nao-pedida');
  const [statusMicrofone, setStatusMicrofone] =
    useState<StatusPermissao>('nao-pedida');
  const [statusNotificacoes, setStatusNotificacoes] =
    useState<StatusPermissao>('nao-pedida');
  const [statusLocalizacao, setStatusLocalizacao] =
    useState<StatusPermissao>('nao-pedida');

  const sincronizar = useCallback(async () => {
    const [c, m, n, l] = await Promise.all([
      getCameraStatus(),
      getMicrofoneStatus(),
      getNotificacoesStatus(),
      getLocalizacaoStatus(),
    ]);
    setStatusCamera(c);
    setStatusMicrofone(m);
    setStatusNotificacoes(n);
    setStatusLocalizacao(l);
    // Reflete em useOnboarding.permissoes para que outros componentes
    // do app vejam o status atualizado (ex: gates de feature).
    setPermissao('camera', c === 'concedida');
    setPermissao('microfone', m === 'concedida');
    setPermissao('notificacoes', n === 'concedida');
    setPermissao('localizacao', l === 'concedida');
  }, [setPermissao]);

  useEffect(() => {
    void sincronizar();
  }, [sincronizar]);

  const itens: ItemPermissao[] = [
    {
      chave: 'camera',
      titulo: TITULOS.camera,
      descricao: DESCRICOES.camera,
      status: statusCamera,
    },
    {
      chave: 'microfone',
      titulo: TITULOS.microfone,
      descricao: DESCRICOES.microfone,
      status: statusMicrofone,
    },
    {
      chave: 'notificacoes',
      titulo: TITULOS.notificacoes,
      descricao: DESCRICOES.notificacoes,
      status: statusNotificacoes,
    },
    {
      chave: 'localizacao',
      titulo: TITULOS.localizacao,
      descricao: DESCRICOES.localizacao,
      status: statusLocalizacao,
    },
  ];

  return (
    <Screen>
      <Header title="Permissões" onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.sm,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SecaoLista
          titulo="Permissões do sistema"
          accessibilityLabel="secao permissoes sistema"
        >
          {itens.map((item) => (
            <CartaoPermissao
              key={item.chave}
              item={item}
              onAbrirSistema={() => {
                void Linking.openSettings();
              }}
            />
          ))}
          <Button
            label="Atualizar status"
            variant="ghost"
            onPress={() => {
              void sincronizar();
            }}
            accessibilityLabel="atualizar status permissoes"
          />
        </SecaoLista>
      </ScrollView>
    </Screen>
  );
}

interface CartaoPermissaoProps {
  item: ItemPermissao;
  onAbrirSistema: () => void;
}

function CartaoPermissao({ item, onAbrirSistema }: CartaoPermissaoProps) {
  return (
    <View
      accessibilityLabel={`linha permissao ${item.chave}`}
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: radius.card,
        padding: spacing.base,
        gap: spacing.sm,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
        }}
      >
        <Text
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: typography.body.size,
            lineHeight:
              typography.body.size * typography.body.lineHeight,
          }}
        >
          {item.titulo}
        </Text>
        <Text
          accessibilityLabel={`status permissao ${item.chave}`}
          style={{
            color: corStatus(item.status),
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: typography.caption.size,
          }}
        >
          {rotuloStatus(item.status)}
        </Text>
      </View>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: typography.caption.size,
          lineHeight:
            typography.caption.size * typography.caption.lineHeight,
        }}
      >
        {item.descricao}
      </Text>
      {item.status !== 'concedida' ? (
        <Button
          label="Abrir configurações do sistema"
          variant="ghost"
          onPress={onAbrirSistema}
          accessibilityLabel={`abrir configuracoes sistema ${item.chave}`}
        />
      ) : null}
    </View>
  );
}
