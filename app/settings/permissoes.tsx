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
import { Linking, Platform, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as IntentLauncher from 'expo-intent-launcher';
import { Button, Header, Screen } from '@/components/ui';
import { SecaoLista } from '@/components/settings/SecaoLista';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import {
  getAlarmeExatoStatus,
  getCameraStatus,
  getLocalizacaoStatus,
  getMicrofoneStatus,
  getNotificacoesStatus,
  getStorageStatus,
  type StatusPermissao,
} from '@/lib/permissoes/requestOnboarding';
import { useOnboarding } from '@/lib/stores/onboarding';

type ChavePermissaoTela =
  | 'storage'
  | 'camera'
  | 'microfone'
  | 'notificacoes'
  | 'localizacao'
  | 'alarmeExato';

interface ItemPermissao {
  chave: ChavePermissaoTela;
  titulo: string;
  descricao: string;
  status: StatusPermissao;
  // V4.0.2: rota especifica do sistema. storage exige Intent
  // MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, alarmeExato exige
  // REQUEST_SCHEDULE_EXACT_ALARM. Outras usam Linking.openSettings().
  acaoSistema: 'app-settings' | 'all-files-access' | 'schedule-exact-alarm';
  obrigatoria: boolean;
}

const TITULOS: Record<ChavePermissaoTela, string> = {
  storage: 'Armazenamento',
  camera: 'Câmera',
  microfone: 'Microfone',
  notificacoes: 'Notificações',
  localizacao: 'Localização',
  alarmeExato: 'Alarmes precisos',
};

const DESCRICOES: Record<ChavePermissaoTela, string> = {
  storage:
    'Necessária. Para salvar registros na pasta do Vault em /sdcard.',
  camera: 'Para tirar fotos e escanear documentos.',
  microfone: 'Para gravar áudios no diário.',
  notificacoes: 'Para alarmes e lembretes.',
  localizacao: 'Para detectar bairro nos eventos.',
  alarmeExato:
    'Opcional. Sem ela, alarmes podem disparar em janela aproximada (Android 14+).',
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

const ANDROID_PACKAGE = 'com.ouroboros.mobile';

async function abrirAcaoSistema(
  acao: ItemPermissao['acaoSistema']
): Promise<void> {
  if (Platform.OS !== 'android') {
    void Linking.openSettings();
    return;
  }
  if (acao === 'all-files-access') {
    try {
      await IntentLauncher.startActivityAsync(
        'android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION',
        { data: `package:${ANDROID_PACKAGE}` }
      );
      return;
    } catch {
      // fallback
    }
  }
  if (acao === 'schedule-exact-alarm') {
    try {
      await IntentLauncher.startActivityAsync(
        'android.settings.REQUEST_SCHEDULE_EXACT_ALARM',
        { data: `package:${ANDROID_PACKAGE}` }
      );
      return;
    } catch {
      // fallback
    }
  }
  void Linking.openSettings();
}

export default function PermissoesTela() {
  const router = useRouter();
  const setPermissao = useOnboarding((s) => s.setPermissao);

  const [statusStorage, setStatusStorage] = useState<StatusPermissao>('nao-pedida');
  const [statusCamera, setStatusCamera] = useState<StatusPermissao>('nao-pedida');
  const [statusMicrofone, setStatusMicrofone] =
    useState<StatusPermissao>('nao-pedida');
  const [statusNotificacoes, setStatusNotificacoes] =
    useState<StatusPermissao>('nao-pedida');
  const [statusLocalizacao, setStatusLocalizacao] =
    useState<StatusPermissao>('nao-pedida');
  const [statusAlarmeExato, setStatusAlarmeExato] =
    useState<StatusPermissao>('nao-pedida');

  const sincronizar = useCallback(async () => {
    const [s, c, m, n, l, a] = await Promise.all([
      getStorageStatus(),
      getCameraStatus(),
      getMicrofoneStatus(),
      getNotificacoesStatus(),
      getLocalizacaoStatus(),
      getAlarmeExatoStatus(),
    ]);
    setStatusStorage(s);
    setStatusCamera(c);
    setStatusMicrofone(m);
    setStatusNotificacoes(n);
    setStatusLocalizacao(l);
    setStatusAlarmeExato(a);
    // Reflete em useOnboarding.permissoes para que outros componentes
    // do app vejam o status atualizado (ex: gates de feature).
    setPermissao('storage', s === 'concedida');
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
      chave: 'storage',
      titulo: TITULOS.storage,
      descricao: DESCRICOES.storage,
      status: statusStorage,
      acaoSistema: 'all-files-access',
      obrigatoria: true,
    },
    {
      chave: 'camera',
      titulo: TITULOS.camera,
      descricao: DESCRICOES.camera,
      status: statusCamera,
      acaoSistema: 'app-settings',
      obrigatoria: false,
    },
    {
      chave: 'microfone',
      titulo: TITULOS.microfone,
      descricao: DESCRICOES.microfone,
      status: statusMicrofone,
      acaoSistema: 'app-settings',
      obrigatoria: false,
    },
    {
      chave: 'notificacoes',
      titulo: TITULOS.notificacoes,
      descricao: DESCRICOES.notificacoes,
      status: statusNotificacoes,
      acaoSistema: 'app-settings',
      obrigatoria: false,
    },
    {
      chave: 'localizacao',
      titulo: TITULOS.localizacao,
      descricao: DESCRICOES.localizacao,
      status: statusLocalizacao,
      acaoSistema: 'app-settings',
      obrigatoria: false,
    },
    {
      chave: 'alarmeExato',
      titulo: TITULOS.alarmeExato,
      descricao: DESCRICOES.alarmeExato,
      status: statusAlarmeExato,
      acaoSistema: 'schedule-exact-alarm',
      obrigatoria: false,
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
                void abrirAcaoSistema(item.acaoSistema);
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
