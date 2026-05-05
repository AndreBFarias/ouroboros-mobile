// Tela 23 — Settings v2 (sprint M29). Lista vertical de 5 secoes:
//   1. Som e vibracao (4 toggles: geral mestre + despertar + conquista
//      + botoes; quando geral off, demais ficam disabled visualmente).
//   2. Pessoa (radio + Vault compartilhado + sub-rotas + reinicializar
//      pasta do Vault).
//   3. Features opcionais (6 toggles: Tarefas, Alarmes, Contadores,
//      Ciclo, Calendario, Widget; defaults TRUE para o app nascer
//      cheio e o usuario desligar o que nao quer).
//   4. Privacidade (biometria + ocultar transcricoes + export + limpar
//      cache).
//   5. Sobre (versao, GitHub, licenca).
//
// Removidos vs v1:
//   - SecaoLembretes (M30 absorve em alarmes pre-cadastrados).
//   - SecaoSync (Syncthing-ready implicito).
//   - SelectorQualidade (sempre maxima).
//
// Toda a UI e reativa ao useSettings (zustand). Persistencia via
// SecureStore (web cai em localStorage).
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  Button,
  Header,
  Screen,
  Toggle,
  useToast,
} from '@/components/ui';
import { SecaoLista } from '@/components/settings/SecaoLista';
import { LinkSubTela } from '@/components/settings/LinkSubTela';
import { useSettings } from '@/lib/stores/settings';
import { usePessoa } from '@/lib/stores/pessoa';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { exportarVaultZip } from '@/lib/services/exportarVault';
import { restaurarVaultZip } from '@/lib/services/restaurarVault';
import { limparCache } from '@/lib/services/limparCache';
import { inicializarVaultCanonico } from '@/lib/vault/permissions';
import {
  APP_GITHUB_LABEL,
  APP_LICENSE,
  APP_REPO_URL,
} from '@/config/app.config';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

export default function SettingsTela() {
  const router = useRouter();
  return (
    <Screen>
      <Header title="Configurações" onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.sm,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SecaoSomVibracao />
        <SecaoPessoa />
        <SecaoFeatures />
        <SecaoPrivacidade />
        <SecaoSobre />
      </ScrollView>
    </Screen>
  );
}

// === Secao 1: Som e vibracao (sprint M29) ===

function SecaoSomVibracao() {
  const somVibracao = useSettings((s) => s.somVibracao);
  const setSomVibracao = useSettings((s) => s.setSomVibracao);
  const mestreOff = !somVibracao.geral;

  return (
    <SecaoLista titulo="Som e vibração" accessibilityLabel="secao som vibracao">
      <ToggleRow
        label="Vibração geral"
        subtitulo="Mestre. Ao desligar, silencia tudo."
        valor={somVibracao.geral}
        onChange={(v) => setSomVibracao('geral', v)}
        a11y="toggle vibrar geral"
      />
      <ToggleRow
        label="Vibrar em alarmes (despertar)"
        valor={somVibracao.despertar}
        onChange={(v) => setSomVibracao('despertar', v)}
        a11y="toggle vibrar despertar"
        disabled={mestreOff}
      />
      <ToggleRow
        label="Vibrar em conquistas"
        valor={somVibracao.conquista}
        onChange={(v) => setSomVibracao('conquista', v)}
        a11y="toggle vibrar conquista"
        disabled={mestreOff}
      />
      <ToggleRow
        label="Vibrar em botões e gestos"
        subtitulo="Humor, fab, registros rápidos."
        valor={somVibracao.botoes}
        onChange={(v) => setSomVibracao('botoes', v)}
        a11y="toggle vibrar botoes"
        disabled={mestreOff}
      />
    </SecaoLista>
  );
}

// === Secao 2: Pessoa ===

function SecaoPessoa() {
  const router = useRouter();
  const toast = useToast();
  const pessoa = useSettings((s) => s.pessoa);
  const setPessoa = useSettings((s) => s.setPessoa);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const setPessoaAtiva = usePessoa((s) => s.setPessoaAtiva);
  const nomes = usePessoa((s) => s.nomes);
  const ehSozinho = pessoa.tipoCompanhia === 'sozinho';

  const trocar = (next: PessoaAutor) => {
    setPessoaAtiva(next);
    setPessoa('ativa', next);
  };

  const reinicializarVault = async () => {
    haptics.medium();
    try {
      await inicializarVaultCanonico();
      toast.show('Pasta verificada.', 'success');
    } catch {
      toast.show('Falha ao verificar a pasta.', 'error');
    }
  };

  return (
    <SecaoLista titulo="Pessoa" accessibilityLabel="secao pessoa">
      {!ehSozinho ? (
        <View
          accessibilityLabel="radio pessoa ativa"
          style={{
            backgroundColor: colors.bgAlt,
            borderRadius: radius.card,
            padding: spacing.base,
            gap: spacing.sm,
          }}
        >
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: typography.caption.size,
            }}
          >
            Pessoa ativa
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <RadioPessoa
              label={nomes.pessoa_a}
              ativa={pessoaAtiva === 'pessoa_a'}
              onPress={() => trocar('pessoa_a')}
              cor={colors.purple}
            />
            <RadioPessoa
              label={nomes.pessoa_b}
              ativa={pessoaAtiva === 'pessoa_b'}
              onPress={() => trocar('pessoa_b')}
              cor={colors.pink}
            />
          </View>
        </View>
      ) : null}

      <ToggleRow
        label="Vault compartilhado"
        subtitulo="Ambos veem todos os registros."
        valor={pessoa.vaultCompartilhado}
        onChange={(v) => setPessoa('vaultCompartilhado', v)}
        a11y="toggle vault compartilhado"
      />

      <LinkSubTela
        titulo="Editar nomes e fotos"
        onPress={() => router.push('/settings/editar-pessoa')}
        accessibilityLabel="editar nomes e fotos"
      />

      <LinkSubTela
        titulo="Reinicializar pasta do Vault"
        subtitulo="Verifica e recria a pasta canônica do Mobile."
        onPress={() => void reinicializarVault()}
        accessibilityLabel="reinicializar pasta do vault"
      />

      {ehSozinho ? (
        <LinkSubTela
          titulo="Adicionar segunda pessoa"
          subtitulo="Configure pessoa B."
          onPress={() => router.push('/settings/adicionar-segunda-pessoa')}
          accessibilityLabel="adicionar segunda pessoa"
        />
      ) : null}
    </SecaoLista>
  );
}

interface RadioPessoaProps {
  label: string;
  ativa: boolean;
  onPress: () => void;
  cor: string;
}

function RadioPessoa({ label, ativa, onPress, cor }: RadioPessoaProps) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected: ativa }}
      accessibilityLabel={`pessoa ${label.toLowerCase()}`}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: ativa ? colors.bg : colors.bgPage,
        borderRadius: radius.input,
        borderWidth: 1.5,
        borderColor: ativa ? cor : colors.bgElev,
      }}
    >
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: cor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {ativa ? (
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: cor,
            }}
          />
        ) : null}
      </View>
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: typography.body.size,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// === Secao 3: Features opcionais (sprint M29) ===
// Reordenada: Tarefas / Alarmes / Contadores / Ciclo / Calendario /
// Widget. Defaults TRUE para o app nascer cheio.

function SecaoFeatures() {
  const featureToggles = useSettings((s) => s.featureToggles);
  const setFeatureToggle = useSettings((s) => s.setFeatureToggle);

  return (
    <SecaoLista
      titulo="Features opcionais"
      accessibilityLabel="secao features opcionais"
    >
      <ToggleRow
        label="To-do leve"
        valor={featureToggles.todoLeve}
        onChange={(v) => setFeatureToggle('todoLeve', v)}
        a11y="toggle todo leve"
      />
      <ToggleRow
        label="Alarme pessoal"
        valor={featureToggles.alarmePessoal}
        onChange={(v) => setFeatureToggle('alarmePessoal', v)}
        a11y="toggle alarme pessoal"
      />
      <ToggleRow
        label="Contador de dias sem"
        valor={featureToggles.contadorDiasSem}
        onChange={(v) => setFeatureToggle('contadorDiasSem', v)}
        a11y="toggle contador dias sem"
      />
      <ToggleRow
        label="Acompanhamento do ciclo menstrual"
        valor={featureToggles.cicloMenstrual}
        onChange={(v) => setFeatureToggle('cicloMenstrual', v)}
        a11y="toggle ciclo menstrual"
      />
      <ToggleRow
        label="Calendário de conquistas"
        valor={featureToggles.calendarioConquistas}
        onChange={(v) => setFeatureToggle('calendarioConquistas', v)}
        a11y="toggle calendario conquistas"
      />
      <ToggleRow
        label="Widget na tela inicial"
        subtitulo="Mostra humor do dia e atalhos rápidos na home."
        valor={featureToggles.widgetHomescreen}
        onChange={(v) => setFeatureToggle('widgetHomescreen', v)}
        a11y="toggle widget homescreen"
      />
      {featureToggles.widgetHomescreen ? (
        <ToggleRow
          label="Mostrar nome no widget"
          subtitulo="Por padrão, o widget mostra apenas a inicial."
          valor={featureToggles.widgetMostraNome}
          onChange={(v) => setFeatureToggle('widgetMostraNome', v)}
          a11y="toggle widget mostra nome"
        />
      ) : null}
    </SecaoLista>
  );
}

// === Secao 4: Privacidade ===

function SecaoPrivacidade() {
  const privacidade = useSettings((s) => s.privacidade);
  const setPrivacidade = useSettings((s) => s.setPrivacidade);
  const toast = useToast();

  const exportar = async () => {
    haptics.light();
    toast.show('Exportando…', 'info');
    const res = await exportarVaultZip();
    if (!res.uri) {
      toast.show(res.motivo ?? 'Falha ao exportar.', 'error');
      return;
    }
    try {
      const disponivel = await Sharing.isAvailableAsync();
      if (disponivel) {
        await Sharing.shareAsync(res.uri, {
          mimeType: 'application/zip',
          dialogTitle: 'Compartilhar export',
        });
      } else {
        toast.show('Compartilhamento indisponível.', 'warn');
      }
    } catch {
      toast.show('Compartilhamento cancelado.', 'info');
    }
  };

  const limpar = async () => {
    haptics.medium();
    const r = await limparCache();
    if (r.motivo) {
      toast.show(r.motivo, 'info');
      return;
    }
    toast.show(`Cache limpo. ${r.arquivosRemovidos} item(ns).`, 'success');
  };

  // Importa backup .zip via document picker. Restore default e
  // nao-destrutivo: cria pasta restaurado-<data>/ no Vault. Se o
  // usuario quiser sobrescrever, sprint futura abre confirmacao;
  // por ora a entrega A5 sempre faz append.
  const importar = async () => {
    haptics.light();
    let pickerRes: DocumentPicker.DocumentPickerResult;
    try {
      pickerRes = await DocumentPicker.getDocumentAsync({
        type: 'application/zip',
        copyToCacheDirectory: true,
        multiple: false,
      });
    } catch {
      toast.show('Falha ao abrir o seletor de arquivos.', 'error');
      return;
    }
    if (pickerRes.canceled) return;
    const arquivo = pickerRes.assets?.[0];
    if (!arquivo) {
      toast.show('Nenhum arquivo selecionado.', 'info');
      return;
    }
    toast.show('Restaurando…', 'info');
    const res = await restaurarVaultZip(arquivo.uri);
    // Falhas individuais (sha-divergente, arquivo-ausente, erro-escrita)
    // tem prioridade sobre o motivo global: quando o restore comeca e
    // alguns arquivos falham, queremos a contagem detalhada. Quando o
    // restore nem comeca (zip ilegivel, manifest ausente), falhas e
    // vazio e o motivo descreve.
    if (res.falhas.length > 0) {
      toast.show(
        `Restauração concluída com ${res.falhas.length} falha(s).`,
        'warn'
      );
      return;
    }
    if (!res.ok) {
      toast.show(res.motivo ?? 'Falha ao restaurar.', 'error');
      return;
    }
    toast.show('Restauração concluída.', 'success');
  };

  return (
    <SecaoLista titulo="Privacidade" accessibilityLabel="secao privacidade">
      <ToggleRow
        label="Biometria pra abrir"
        valor={privacidade.biometriaAbrir}
        onChange={(v) => setPrivacidade('biometriaAbrir', v)}
        a11y="toggle biometria abrir"
      />
      <ToggleRow
        label="Ocultar transcrições na lista"
        valor={privacidade.ocultarTranscricoes}
        onChange={(v) => setPrivacidade('ocultarTranscricoes', v)}
        a11y="toggle ocultar transcricoes"
      />

      <Button
        label="Exportar todos os meus dados"
        variant="primary"
        onPress={exportar}
      />
      <Button
        label="Importar backup"
        variant="ghost"
        onPress={importar}
      />
      <Button
        label="Limpar cache local"
        variant="ghost"
        onPress={limpar}
      />
    </SecaoLista>
  );
}

// === Secao 5: Sobre ===

function SecaoSobre() {
  const versao =
    (Constants.expoConfig?.version as string | undefined) ?? '0.0.0';
  return (
    <SecaoLista titulo="Sobre" accessibilityLabel="secao sobre">
      <LinhaInfo titulo="Versão" valor={versao} />
      <Pressable
        onPress={() => {
          haptics.light();
          void Linking.openURL(APP_REPO_URL);
        }}
        accessibilityRole="link"
        accessibilityLabel="abrir github"
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
      <LinhaInfo titulo="Licença" valor={APP_LICENSE} />
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

// === Helper: linha generica de toggle ===

interface ToggleRowProps {
  label: string;
  valor: boolean;
  onChange: (next: boolean) => void;
  subtitulo?: string;
  a11y?: string;
  // Sprint M29: ToggleRow disabled (mestre off em SomVibracao).
  // Quando disabled, o toggle e o container ficam com opacidade
  // reduzida e onChange e ignorado.
  disabled?: boolean;
}

function ToggleRow({
  label,
  valor,
  onChange,
  subtitulo,
  a11y,
  disabled,
}: ToggleRowProps) {
  // a11y do container e do toggle nao devem coincidir (testing-library
  // falha em getByLabelText quando duas Views compartilham o mesmo
  // label). Container ganha "linha <a11y>" e o Toggle herda o a11y
  // canonico (que os testes usam diretamente).
  const labelLinha = a11y ? `linha ${a11y}` : `linha ${label.toLowerCase()}`;
  const labelToggle = a11y ?? label.toLowerCase();
  return (
    <View
      accessibilityLabel={labelLinha}
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: radius.card,
        padding: spacing.base,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 56,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <Text
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.body.size,
            lineHeight: typography.body.size * typography.body.lineHeight,
          }}
        >
          {label}
        </Text>
        {subtitulo ? (
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: typography.caption.size,
              lineHeight:
                typography.caption.size * typography.caption.lineHeight,
              marginTop: 2,
            }}
          >
            {subtitulo}
          </Text>
        ) : null}
      </View>
      <Toggle
        value={valor}
        onChange={disabled ? () => undefined : onChange}
        accessibilityLabel={labelToggle}
      />
    </View>
  );
}
