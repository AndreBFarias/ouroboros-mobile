// Tela 23 — Settings. Lista vertical de 7 secoes:
//   1. Som e vibracao (4 toggles)
//   2. Lembretes (3 linhas com toggle + time picker)
//   3. Pessoa (radio + Vault compartilhado + sub-rotas)
//   4. Sync (CardStatus + Forcar sync + selector metodo + qualidade scanner)
//   5. Features opcionais (6 toggles: ciclo, alarme, todo, contador,
//      calendario, widget)
//   6. Privacidade (biometria + ocultar transcricoes + export + limpar cache)
//   7. Sobre (versao, GitHub, licenca)
//
// Toda a UI e reativa ao useSettings (zustand). Persistencia via
// SecureStore (web cai em localStorage). Toggles default off:
// ativacao explicita pelo usuario; ao ligar uma feature, a tab/menu
// correspondente aparece imediatamente em <BottomTabs> (que ja le
// useSettings.featureToggles).
import { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Sharing from 'expo-sharing';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  Button,
  Header,
  Screen,
  Toggle,
  useToast,
} from '@/components/ui';
import { SecaoLista } from '@/components/settings/SecaoLista';
import { CardStatus } from '@/components/settings/CardStatus';
import { LinkSubTela } from '@/components/settings/LinkSubTela';
import { useSettings } from '@/lib/stores/settings';
import { usePessoa } from '@/lib/stores/pessoa';
import { useVault } from '@/lib/stores/vault';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import {
  agendarLembrete,
  cancelarLembrete,
  type LembreteChave,
} from '@/lib/services/notificacoesLembretes';
import {
  verificarSyncStatus,
  descreverDelta,
  type SyncStatus,
} from '@/lib/services/syncStatus';
import { exportarVaultZip } from '@/lib/services/exportarVault';
import { limparCache } from '@/lib/services/limparCache';
import {
  APP_GITHUB_LABEL,
  APP_LICENSE,
  APP_REPO_URL,
} from '@/config/app.config';
import type {
  ScannerQualidade,
  SyncMethod,
} from '@/lib/stores/settings';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

// HH:MM helper. Pad zero, 24h.
function formatHora(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function parseHoraParaDate(hora: string): Date {
  const [h, m] = hora.split(':');
  const d = new Date();
  d.setHours(parseInt(h, 10) || 9, parseInt(m, 10) || 0, 0, 0);
  return d;
}

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
        <SecaoLembretes />
        <SecaoPessoa />
        <SecaoSync />
        <SecaoFeatures />
        <SecaoPrivacidade />
        <SecaoSobre />
      </ScrollView>
    </Screen>
  );
}

// === Secao 1: Som e vibracao ===

function SecaoSomVibracao() {
  const somVibracao = useSettings((s) => s.somVibracao);
  const setSomVibracao = useSettings((s) => s.setSomVibracao);

  return (
    <SecaoLista titulo="Som e vibração" accessibilityLabel="secao som vibracao">
      <ToggleRow
        label="Vibrar ao registrar humor"
        valor={somVibracao.humor}
        onChange={(v) => setSomVibracao('humor', v)}
        a11y="toggle vibrar humor"
      />
      <ToggleRow
        label="Vibrar em vitória"
        valor={somVibracao.vitoria}
        onChange={(v) => setSomVibracao('vitoria', v)}
        a11y="toggle vibrar vitoria"
      />
      <ToggleRow
        label="Vibrar em trigger"
        valor={somVibracao.trigger}
        onChange={(v) => setSomVibracao('trigger', v)}
        a11y="toggle vibrar trigger"
      />
      <ToggleRow
        label="Vibrar ao abrir o FAB"
        valor={somVibracao.fab}
        onChange={(v) => setSomVibracao('fab', v)}
        a11y="toggle vibrar fab"
      />
    </SecaoLista>
  );
}

// === Secao 2: Lembretes ===

function SecaoLembretes() {
  const lembretes = useSettings((s) => s.lembretes);
  const setLembrete = useSettings((s) => s.setLembrete);
  const toast = useToast();

  const togglar = async (chave: LembreteChave, valor: boolean) => {
    const horario = lembretes[chave].horario;
    setLembrete(chave, { ativo: valor });
    if (valor) {
      const ok = await agendarLembrete(chave, horario);
      if (!ok) {
        // Permissao recusada ou web: desfaz.
        setLembrete(chave, { ativo: false });
        toast.show('Permissão de notificação recusada.', 'warn');
      }
    } else {
      await cancelarLembrete(chave);
    }
  };

  const trocarHora = async (chave: LembreteChave, hora: string) => {
    setLembrete(chave, { horario: hora });
    if (lembretes[chave].ativo) {
      // Re-agenda com horario novo (cancelarLembrete e idempotente).
      const ok = await agendarLembrete(chave, hora);
      if (!ok) toast.show('Falha ao reagendar.', 'warn');
    }
  };

  return (
    <SecaoLista titulo="Lembretes" accessibilityLabel="secao lembretes">
      <LembreteRow
        label="Medicação"
        chave="medicacao"
        ativo={lembretes.medicacao.ativo}
        horario={lembretes.medicacao.horario}
        onToggle={(v) => void togglar('medicacao', v)}
        onChangeHora={(h) => void trocarHora('medicacao', h)}
      />
      <LembreteRow
        label="Treino"
        chave="treino"
        ativo={lembretes.treino.ativo}
        horario={lembretes.treino.horario}
        onToggle={(v) => void togglar('treino', v)}
        onChangeHora={(h) => void trocarHora('treino', h)}
      />
      <LembreteRow
        label="Humor diário"
        chave="humor"
        ativo={lembretes.humor.ativo}
        horario={lembretes.humor.horario}
        onToggle={(v) => void togglar('humor', v)}
        onChangeHora={(h) => void trocarHora('humor', h)}
      />
    </SecaoLista>
  );
}

interface LembreteRowProps {
  label: string;
  chave: LembreteChave;
  ativo: boolean;
  horario: string;
  onToggle: (next: boolean) => void;
  onChangeHora: (hora: string) => void;
}

function LembreteRow({
  label,
  chave,
  ativo,
  horario,
  onToggle,
  onChangeHora,
}: LembreteRowProps) {
  const [pickerAberto, setPickerAberto] = useState(false);

  const abrir = () => {
    if (!ativo) return;
    setPickerAberto(true);
  };

  const handle = (event: DateTimePickerEvent, selecionado?: Date) => {
    if (Platform.OS === 'android') setPickerAberto(false);
    if (event.type === 'dismissed') return;
    if (selecionado) onChangeHora(formatHora(selecionado));
  };

  return (
    <View
      accessibilityLabel={`linha lembrete ${chave}`}
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
        }}
      >
        <Text
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.body.size,
            flex: 1,
          }}
        >
          {label}
        </Text>
        <Toggle
          value={ativo}
          onChange={onToggle}
          accessibilityLabel={`toggle lembrete ${chave}`}
        />
      </View>
      {ativo ? (
        <MotiView
          from={{ opacity: 0, translateY: -4 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={springs.subtle}
        >
          <Pressable
            onPress={abrir}
            accessibilityRole="button"
            accessibilityLabel={`escolher hora lembrete ${chave}`}
          >
            <Text
              style={{
                color: colors.cyan,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: typography.body.size,
                paddingVertical: spacing.xs,
              }}
            >
              {horario}
            </Text>
          </Pressable>
        </MotiView>
      ) : null}
      {pickerAberto ? (
        <DateTimePicker
          value={parseHoraParaDate(horario)}
          mode="time"
          is24Hour
          onChange={handle}
        />
      ) : null}
    </View>
  );
}

// === Secao 3: Pessoa ===

function SecaoPessoa() {
  const router = useRouter();
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

// === Secao 4: Sync ===

function SecaoSync() {
  const sync = useSettings((s) => s.sync);
  const setSync = useSettings((s) => s.setSync);
  const vaultRoot = useVault((s) => s.vaultRoot);
  const toast = useToast();
  const [status, setStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    void verificarSyncStatus(vaultRoot).then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, [vaultRoot]);

  const cor = status?.cor ?? 'desconhecido';
  const titulo =
    cor === 'verde'
      ? 'Sincronizado'
      : cor === 'amarelo'
        ? 'Atrasado'
        : cor === 'vermelho'
          ? status?.conflito
            ? 'Conflito detectado'
            : 'Desatualizado'
          : 'Aguardando primeira leitura.';
  const subtitulo = useMemo(() => {
    const path = vaultRoot
      ? 'Vault: ~/Protocolo-Ouroboros/'
      : 'Vault: não configurado';
    const delta = status ? descreverDelta(status.ultimaModificacao) : '';
    return delta ? `${path} · ${delta}` : path;
  }, [status, vaultRoot]);

  const forcar = () => {
    haptics.light();
    toast.show('Sync gerenciado pelo aplicativo externo.', 'info');
  };

  return (
    <SecaoLista titulo="Sync" accessibilityLabel="secao sync">
      <CardStatus
        cor={cor}
        titulo={titulo}
        subtitulo={subtitulo}
        accessibilityLabel={`status sync ${cor}`}
      />

      <Button
        label="Forçar sync"
        variant="ghost"
        onPress={forcar}
      />

      <SelectorMetodo
        valor={sync.metodo}
        onChange={(v) => setSync('metodo', v)}
      />

      <SelectorQualidade
        valor={sync.qualidadeScanner}
        onChange={(v) => setSync('qualidadeScanner', v)}
      />
    </SecaoLista>
  );
}

interface SelectorMetodoProps {
  valor: SyncMethod;
  onChange: (next: SyncMethod) => void;
}

function SelectorMetodo({ valor, onChange }: SelectorMetodoProps) {
  const opcoes: { v: SyncMethod; label: string }[] = [
    { v: 'syncthing', label: 'Syncthing' },
    { v: 'obsidian-sync', label: 'Obsidian Sync' },
    { v: 'nao-uso', label: 'Não uso' },
  ];
  return (
    <View
      accessibilityLabel="selector metodo sync"
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
        Método de sync
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        {opcoes.map((o) => (
          <Pressable
            key={o.v}
            onPress={() => {
              haptics.selection();
              onChange(o.v);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: valor === o.v }}
            accessibilityLabel={`metodo ${o.v}`}
            style={{
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              backgroundColor:
                valor === o.v ? colors.purple : colors.bgPage,
              borderRadius: radius.chip,
              minHeight: 36,
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: valor === o.v ? colors.bg : colors.fg,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: typography.caption.size,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

interface SelectorQualidadeProps {
  valor: ScannerQualidade;
  onChange: (next: ScannerQualidade) => void;
}

function SelectorQualidade({ valor, onChange }: SelectorQualidadeProps) {
  const opcoes: { v: ScannerQualidade; label: string }[] = [
    { v: '8mp', label: '8MP' },
    { v: '12mp', label: '12MP' },
    { v: 'maxima', label: 'Máxima' },
  ];
  return (
    <View
      accessibilityLabel="selector qualidade scanner"
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
        Qualidade do scanner
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {opcoes.map((o) => (
          <Pressable
            key={o.v}
            onPress={() => {
              haptics.selection();
              onChange(o.v);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: valor === o.v }}
            accessibilityLabel={`qualidade ${o.v}`}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              backgroundColor:
                valor === o.v ? colors.purple : colors.bgPage,
              borderRadius: radius.chip,
              minHeight: 36,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: valor === o.v ? colors.bg : colors.fg,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: typography.caption.size,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// === Secao 5: Features opcionais ===

function SecaoFeatures() {
  const featureToggles = useSettings((s) => s.featureToggles);
  const setFeatureToggle = useSettings((s) => s.setFeatureToggle);

  return (
    <SecaoLista
      titulo="Features opcionais"
      accessibilityLabel="secao features opcionais"
    >
      <ToggleRow
        label="Acompanhamento do ciclo menstrual"
        valor={featureToggles.cicloMenstrual}
        onChange={(v) => setFeatureToggle('cicloMenstrual', v)}
        a11y="toggle ciclo menstrual"
      />
      <ToggleRow
        label="Alarme pessoal"
        valor={featureToggles.alarmePessoal}
        onChange={(v) => setFeatureToggle('alarmePessoal', v)}
        a11y="toggle alarme pessoal"
      />
      <ToggleRow
        label="To-do leve"
        valor={featureToggles.todoLeve}
        onChange={(v) => setFeatureToggle('todoLeve', v)}
        a11y="toggle todo leve"
      />
      <ToggleRow
        label="Contador de dias sem"
        valor={featureToggles.contadorDiasSem}
        onChange={(v) => setFeatureToggle('contadorDiasSem', v)}
        a11y="toggle contador dias sem"
      />
      <ToggleRow
        label="Calendário de conquistas"
        valor={featureToggles.calendarioConquistas}
        onChange={(v) => setFeatureToggle('calendarioConquistas', v)}
        a11y="toggle calendario conquistas"
      />
      <ToggleRow
        label="Widget na tela inicial"
        subtitulo="Ativação do widget chega na M20."
        valor={featureToggles.widgetHomescreen}
        onChange={(v) => setFeatureToggle('widgetHomescreen', v)}
        a11y="toggle widget homescreen"
      />
    </SecaoLista>
  );
}

// === Secao 6: Privacidade ===

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
        label="Exportar todos meus dados"
        variant="primary"
        onPress={exportar}
      />
      <Button
        label="Limpar cache local"
        variant="ghost"
        onPress={limpar}
      />
    </SecaoLista>
  );
}

// === Secao 7: Sobre ===

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
}

function ToggleRow({ label, valor, onChange, subtitulo, a11y }: ToggleRowProps) {
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
        onChange={onChange}
        accessibilityLabel={labelToggle}
      />
    </View>
  );
}
