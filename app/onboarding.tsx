// Onboarding inicial em 5 frames. Substitui o modal de permissao da
// M02. Coleta nome do usuario primario, companhia (sozinho/duo +
// nome do parceiro), pasta do Vault via SAF e metodo de sync. Ao
// concluir, marca useOnboarding.done=true e redireciona para a
// Tela 01 (hoje).
//
// Decisao M03: Sentence case + acentuacao PT-BR completa nas strings
// de UI. accessibilityLabel sem acento. Comentarios sem acento
// (convencao shell).
import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import { Check, Folder } from 'lucide-react-native';
import {
  Button,
  Card,
  ChipGroup,
  Input,
  Screen,
  useToast,
} from '@/components/ui';
import { springs } from '@/lib/motion';
import { colors, spacing } from '@/theme/tokens';
import { usePessoa } from '@/lib/stores/pessoa';
import { useVault } from '@/lib/stores/vault';
import {
  useOnboarding,
  type SyncMethod,
  type TipoCompanhia,
} from '@/lib/stores/onboarding';
import { requestVaultPermission } from '@/lib/vault';

type FrameId = 0 | 1 | 2 | 3 | 4;

export default function Onboarding() {
  const router = useRouter();
  const toast = useToast();
  const setNome = usePessoa((s) => s.setNome);
  const nomeA = usePessoa((s) => s.nomes.pessoa_a);
  const nomeB = usePessoa((s) => s.nomes.pessoa_b);
  const vaultRoot = useVault((s) => s.vaultRoot);
  const setVaultRoot = useVault((s) => s.setVaultRoot);
  const tipoCompanhia = useOnboarding((s) => s.tipoCompanhia);
  const setTipoCompanhia = useOnboarding((s) => s.setTipoCompanhia);
  const syncMethod = useOnboarding((s) => s.syncMethod);
  const setSync = useOnboarding((s) => s.setSync);
  const marcarConcluido = useOnboarding((s) => s.marcarConcluido);

  const [frame, setFrame] = useState<FrameId>(0);
  const [nomeInput, setNomeInput] = useState('');
  const [duo, setDuo] = useState<boolean | null>(null);
  const [nomeBInput, setNomeBInput] = useState('');
  const [tipoSelecionado, setTipoSelecionado] = useState(false);
  const [pedindoPasta, setPedindoPasta] = useState(false);
  const [syncSelecionado, setSyncSelecionado] = useState(false);

  const avancar = () =>
    setFrame((f) => (f >= 4 ? 4 : ((f + 1) as FrameId)));

  const concluir = () => {
    marcarConcluido();
    router.replace('/');
  };

  const handleFrame0 = () => {
    const nome = nomeInput.trim();
    if (nome.length < 1) {
      toast.show('Por favor, digite um nome.', 'error');
      return;
    }
    setNome('pessoa_a', nome);
    avancar();
  };

  const handleFrame1 = () => {
    if (duo === null) {
      toast.show('Escolha uma das opcoes.', 'error');
      return;
    }
    if (duo) {
      if (!tipoSelecionado) {
        toast.show('Voces sao casal ou amigos?', 'error');
        return;
      }
      const nome = nomeBInput.trim();
      if (nome.length < 1) {
        toast.show('Por favor, digite o nome da segunda pessoa.', 'error');
        return;
      }
      setNome('pessoa_b', nome);
    } else {
      setTipoCompanhia('sozinho');
    }
    avancar();
  };

  const handleEscolherPasta = async () => {
    setPedindoPasta(true);
    try {
      const uri = await requestVaultPermission();
      if (uri) setVaultRoot(uri);
    } finally {
      setPedindoPasta(false);
    }
  };

  const handleFrame2 = () => {
    if (!vaultRoot) {
      toast.show('Escolha uma pasta para o Vault.', 'error');
      return;
    }
    avancar();
  };

  const handleFrame3 = () => {
    if (!syncSelecionado) {
      toast.show('Escolha como voce sincroniza.', 'error');
      return;
    }
    avancar();
  };

  return (
    <Screen>
      <View style={{ flex: 1, paddingTop: spacing.xl }}>
        <Indicador frameAtivo={frame} />
        <View style={{ flex: 1, justifyContent: 'flex-start', paddingTop: spacing.xl }}>
          <AnimatePresence exitBeforeEnter>
            {frame === 0 && (
              <FrameAnim key="f0">
                <Frame0
                  nome={nomeInput}
                  onChange={setNomeInput}
                  onContinue={handleFrame0}
                />
              </FrameAnim>
            )}
            {frame === 1 && (
              <FrameAnim key="f1">
                <Frame1
                  duo={duo}
                  setDuo={setDuo}
                  tipoCompanhia={tipoCompanhia}
                  setTipo={(t) => {
                    setTipoCompanhia(t);
                    setTipoSelecionado(true);
                  }}
                  nomeB={nomeBInput}
                  setNomeB={setNomeBInput}
                  onContinue={handleFrame1}
                />
              </FrameAnim>
            )}
            {frame === 2 && (
              <FrameAnim key="f2">
                <Frame2
                  vaultRoot={vaultRoot}
                  pedindo={pedindoPasta}
                  onEscolher={handleEscolherPasta}
                  onContinue={handleFrame2}
                />
              </FrameAnim>
            )}
            {frame === 3 && (
              <FrameAnim key="f3">
                <Frame3
                  sync={syncMethod}
                  setSync={(s) => {
                    setSync(s);
                    setSyncSelecionado(true);
                  }}
                  onContinue={handleFrame3}
                />
              </FrameAnim>
            )}
            {frame === 4 && (
              <FrameAnim key="f4">
                <Frame4
                  nomeA={nomeA}
                  nomeB={duo ? nomeB : null}
                  onConcluir={concluir}
                />
              </FrameAnim>
            )}
          </AnimatePresence>
        </View>
      </View>
    </Screen>
  );
}

function Indicador({ frameAtivo }: { frameAtivo: FrameId }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 6,
        alignSelf: 'center',
      }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            width: 32,
            height: 4,
            borderRadius: 2,
            backgroundColor: i <= frameAtivo ? colors.purple : colors.bgElev,
          }}
        />
      ))}
    </View>
  );
}

function FrameAnim({ children }: { children: ReactNode }) {
  return (
    <MotiView
      from={{ translateX: 80, opacity: 0 }}
      animate={{ translateX: 0, opacity: 1 }}
      exit={{ translateX: -80, opacity: 0 }}
      transition={springs.default}
      style={{ flex: 1 }}
    >
      {children}
    </MotiView>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: colors.fg,
        fontFamily: 'JetBrainsMono_500Medium',
        fontSize: 22,
        lineHeight: 30,
        marginBottom: spacing.md,
      }}
    >
      {children}
    </Text>
  );
}

function Sub({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: colors.muted,
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 13,
        lineHeight: 22,
        marginBottom: spacing.xl,
      }}
    >
      {children}
    </Text>
  );
}

function MicroOrange({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: colors.orange,
        fontFamily: 'JetBrainsMono_500Medium',
        fontSize: 12,
        lineHeight: 18,
        letterSpacing: 0.4,
        marginBottom: spacing.sm,
      }}
    >
      {children}
    </Text>
  );
}

interface Frame0Props {
  nome: string;
  onChange: (next: string) => void;
  onContinue: () => void;
}

function Frame0({ nome, onChange, onContinue }: Frame0Props) {
  return (
    <View style={{ gap: spacing.lg }}>
      <MicroOrange>Antes de começar</MicroOrange>
      <Heading>Como você se chama?</Heading>
      <Sub>
        Esse nome aparece nos seus registros e no cabeçalho da tela
        inicial. Você pode trocar depois nos ajustes.
      </Sub>
      <Input
        value={nome}
        onChangeText={onChange}
        placeholder="Seu nome"
        accessibilityLabel="campo nome"
      />
      <View style={{ height: spacing.md }} />
      <Button label="Continuar" onPress={onContinue} />
    </View>
  );
}

interface Frame1Props {
  duo: boolean | null;
  setDuo: (v: boolean) => void;
  tipoCompanhia: TipoCompanhia;
  setTipo: (t: TipoCompanhia) => void;
  nomeB: string;
  setNomeB: (next: string) => void;
  onContinue: () => void;
}

function Frame1({
  duo,
  setDuo,
  tipoCompanhia,
  setTipo,
  nomeB,
  setNomeB,
  onContinue,
}: Frame1Props) {
  return (
    <View style={{ gap: spacing.lg }}>
      <MicroOrange>Companhia</MicroOrange>
      <Heading>Mais alguém usa este Vault com você?</Heading>
      <Sub>
        Você pode usar sozinho. Se for compartilhar, tudo o que vocês
        registrarem aparece para os dois.
      </Sub>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <CardEscolha
            ativo={duo === false}
            label="Sozinho"
            onPress={() => setDuo(false)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <CardEscolha
            ativo={duo === true}
            label="Com mais alguém"
            onPress={() => setDuo(true)}
          />
        </View>
      </View>

      {duo === true ? (
        <MotiView
          from={{ opacity: 0, translateY: -8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={springs.default}
          style={{ gap: spacing.md }}
        >
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 13,
              marginTop: spacing.md,
            }}
          >
            Vocês são…
          </Text>
          <ChipGroup
            mode="single"
            value={
              tipoCompanhia === 'sozinho' ? null : tipoCompanhia
            }
            onChange={(next) => {
              if (next === 'casal' || next === 'amigos') setTipo(next);
            }}
            options={[
              { value: 'casal', label: 'Casal', accent: 'purple' },
              { value: 'amigos', label: 'Amigos', accent: 'cyan' },
            ]}
          />
          <Input
            value={nomeB}
            onChangeText={setNomeB}
            placeholder="Como ela ou ele se chama?"
            accessibilityLabel="campo nome segunda pessoa"
          />
        </MotiView>
      ) : null}

      <View style={{ height: spacing.md }} />
      <Button label="Continuar" onPress={onContinue} />
    </View>
  );
}

interface CardEscolhaProps {
  ativo: boolean;
  label: string;
  onPress: () => void;
}

function CardEscolha({ ativo, label, onPress }: CardEscolhaProps) {
  return (
    <Card variant={ativo ? 'active' : 'default'} onPress={onPress} accessibilityLabel={`escolher ${label.toLowerCase()}`}>
      <View style={{ minHeight: 80, justifyContent: 'center', alignItems: 'center' }}>
        <Text
          style={{
            color: ativo ? colors.purple : colors.fg,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 14,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      </View>
    </Card>
  );
}

interface Frame2Props {
  vaultRoot: string | null;
  pedindo: boolean;
  onEscolher: () => void;
  onContinue: () => void;
}

function Frame2({ vaultRoot, pedindo, onEscolher, onContinue }: Frame2Props) {
  return (
    <View style={{ gap: spacing.lg }}>
      <MicroOrange>Vault</MicroOrange>
      <Heading>Onde fica seu Vault?</Heading>
      <Sub>
        Aponte uma pasta no seu celular onde os arquivos .md vão
        ficar. Se você usa Obsidian ou Syncthing, escolha a mesma
        pasta usada lá. Se não usa, qualquer pasta local serve.
      </Sub>
      <Card variant={vaultRoot ? 'active' : 'default'}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Folder size={24} color={vaultRoot ? colors.cyan : colors.mutedDecor} strokeWidth={1.8} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: vaultRoot ? colors.fg : colors.mutedDecor,
                fontFamily: vaultRoot
                  ? 'JetBrainsMono_500Medium'
                  : 'JetBrainsMono_400Regular',
                fontSize: 13,
                lineHeight: 20,
              }}
              numberOfLines={2}
            >
              {vaultRoot
                ? decodeURIComponent(vaultRoot).replace(/^.*?:\/+/, '')
                : 'Nenhuma pasta selecionada'}
            </Text>
          </View>
        </View>
      </Card>
      <Button
        label={vaultRoot ? 'Trocar pasta' : 'Escolher pasta'}
        variant={vaultRoot ? 'ghost' : 'primary'}
        onPress={onEscolher}
        disabled={pedindo}
      />
      {vaultRoot ? (
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          As subpastas necessárias serão criadas automaticamente quando
          você fizer o primeiro registro.
        </Text>
      ) : null}
      <View style={{ height: spacing.md }} />
      <Button label="Continuar" onPress={onContinue} disabled={!vaultRoot} />
    </View>
  );
}

interface Frame3Props {
  sync: SyncMethod;
  setSync: (s: SyncMethod) => void;
  onContinue: () => void;
}

function Frame3({ sync, setSync, onContinue }: Frame3Props) {
  return (
    <View style={{ gap: spacing.lg }}>
      <MicroOrange>Sincronização</MicroOrange>
      <Heading>Como você sincroniza entre dispositivos?</Heading>
      <Sub>
        O Ouroboros não gerencia sincronização. Ele só lê e escreve
        arquivos na pasta. Se você usa um serviço de sync, basta
        apontar para a mesma pasta nos outros dispositivos.
      </Sub>
      <View style={{ gap: spacing.xl }}>
        <CardSync
          ativo={sync === 'syncthing'}
          titulo="Syncthing"
          descricao="Sincronização P2P entre dispositivos. Recomendado se você já tem o Syncthing rodando."
          onPress={() => setSync('syncthing')}
        />
        <CardSync
          ativo={sync === 'obsidian_sync'}
          titulo="Obsidian Sync"
          descricao="Serviço pago do Obsidian. Sincroniza pelo servidor da Obsidian Inc."
          onPress={() => setSync('obsidian_sync')}
        />
        <CardSync
          ativo={sync === 'nenhum'}
          titulo="Não uso ainda"
          descricao="Sem problema. Você pode escolher depois nos ajustes."
          onPress={() => setSync('nenhum')}
        />
      </View>
      <View style={{ height: spacing.md }} />
      <Button label="Continuar" onPress={onContinue} />
    </View>
  );
}

interface CardSyncProps {
  ativo: boolean;
  titulo: string;
  descricao: string;
  onPress: () => void;
}

function CardSync({ ativo, titulo, descricao, onPress }: CardSyncProps) {
  return (
    <Card variant={ativo ? 'active' : 'default'} onPress={onPress} accessibilityLabel={`escolher ${titulo.toLowerCase()}`}>
      <View style={{ gap: spacing.xs }}>
        <Text
          style={{
            color: ativo ? colors.purple : colors.fg,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 14,
          }}
        >
          {titulo}
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          {descricao}
        </Text>
      </View>
    </Card>
  );
}

interface Frame4Props {
  nomeA: string;
  nomeB: string | null;
  onConcluir: () => void;
}

function Frame4({ nomeA, nomeB, onConcluir }: Frame4Props) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg }}>
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: colors.bgElev,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Check size={48} color={colors.green} strokeWidth={2.4} />
      </View>
      <Heading>Tudo pronto, {nomeA}.</Heading>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 14,
          lineHeight: 22,
          textAlign: 'center',
        }}
      >
        {nomeB
          ? `Você e ${nomeB} estão configurados. Toque + para começar.`
          : 'Toque + para começar.'}
      </Text>
      <View style={{ height: spacing.lg }} />
      <View style={{ alignSelf: 'stretch' }}>
        <Button label="Começar" onPress={onConcluir} />
      </View>
    </View>
  );
}
