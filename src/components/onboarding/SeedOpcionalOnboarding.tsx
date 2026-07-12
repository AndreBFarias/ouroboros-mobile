// Passo opcional de seed no onboarding (R-HOME-4e). Ultimo antes do
// "Tudo pronto": oferece plantar o primeiro card real da Tela Hoje sem
// forcar. Duas afordancias -- mini humor (slider 1-5, reuso direto) ou
// mini tarefa (titulo simples) -- e um "Pular" bem visivel que conclui
// sem gravar nada.
//
// Grava via as APIs canonicas existentes (saveHumor / criarTarefa) no
// vaultRoot ja definido no Frame 2 (Pasta), com autor = pessoaAtiva
// (= pessoa_a no onboarding). NAO chama marcarConcluido: apenas grava
// (opcional) e chama onConcluir() para avancar ao Frame 5, que mantem
// o marcarConcluido + replace('/') canonicos.
//
// Decisao R-HOME-4-VIVA §12 (dono): Frame 4 (penultimo), mantem "Tudo
// pronto" como ultimo; "Pular" visivel; mini-humor usa slider 1-5 direto
// (sem inventar mapa palavra->valor).
//
// Copy sujeita a ajuste do dono. Tom ADR-010 + Regra de Tom: zero
// gamificacao, zero exclamacao, convite neutro.
//
// Comentarios sem acento (convencao shell/CI). Strings de UI com
// acentuacao PT-BR completa; accessibilityLabel sem acento (screen
// reader).
import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  Button,
  Input,
  Slider,
  Textarea,
  useToast,
} from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { hexToRgba } from '@/lib/a11y/contraste';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { formatDateYmd } from '@/lib/vault';
import { HumorSchema, type HumorMeta } from '@/lib/schemas/humor';
import {
  TarefaSchema,
  slugifyTitulo,
  sufixoRandom,
  type Tarefa,
} from '@/lib/schemas/tarefa';
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import { saveHumor } from '@/lib/humor/saveHumor';
import { criarTarefa } from '@/lib/vault/tarefas';
import { comTimeout } from '@/lib/util/comTimeout';

// Slider de humor comeca no meio (na media). Espelha SLIDER_DEFAULT da
// Tela 15 (humor-rapido) para consistencia perceptiva.
const HUMOR_DEFAULT = 3;

// ---- Montadores puros (unit-testaveis sem render de RN) -------------

// Monta um HumorMeta a partir do slider unico do seed. Os demais
// sliders da Tela 15 (energia/ansiedade/foco) nao sao coletados aqui
// para manter o passo leve: entram com o default neutro 3. A frase e
// opcional; so entra no payload quando preenchida (mesma convencao do
// humor-rapido, evita poluir o YAML).
export function montarHumorSeed(
  autor: PessoaAutor,
  humorVal: number,
  frase: string
): HumorMeta {
  const fraseTrim = frase.trim();
  return {
    tipo: 'humor',
    data: formatDateYmd(new Date()),
    autor,
    humor: humorVal,
    energia: 3,
    ansiedade: 3,
    foco: 3,
    tags: [],
    ...(fraseTrim.length > 0 ? { frase: fraseTrim } : {}),
  };
}

// Monta { meta, slug } de uma tarefa simples. Espelha novaTarefa de
// app/todo.tsx (categoria 'outro', destino { tipo: 'mim' }, sem alarme).
// Data local UTC-3 pelo mesmo calculo do todo (fuso America/Sao_Paulo).
// Slug via slugifyTitulo + sufixo random para deduplicar arquivo.
export function montarTarefaSeed(
  autor: PessoaAutor,
  titulo: string
): { meta: Tarefa; slug: string } {
  const agora = new Date();
  const TZ = -180;
  const local = new Date(agora.getTime() + TZ * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  const data = `${y}-${m}-${d}`;
  const slug = `${slugifyTitulo(titulo)}-${sufixoRandom()}`;
  const meta: Tarefa = {
    tipo: 'tarefa',
    data,
    autor,
    titulo,
    feito: false,
    feito_em: null,
    categoria: 'outro',
    pessoa_destino: { tipo: 'mim' },
    alarme: null,
    silenciar_sugestao_ate: null,
  };
  return { meta, slug };
}

// ---- Helpers de layout (replica minima dos helpers privados do
// app/onboarding.tsx: Heading / Sub / MicroOrange) -------------------

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

interface CardAfordanciaProps {
  titulo: string;
  descricao: string;
  accessibilityLabel: string;
  onPress: () => void;
}

// Espelha o estilo de CardEscolha do onboarding: fundo bgAlt, outline
// 1px bgElev, titulo + descricao curta. Area de toque generosa.
function CardAfordancia({
  titulo,
  descricao,
  accessibilityLabel,
  onPress,
}: CardAfordanciaProps) {
  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View
        style={{
          backgroundColor: colors.bgAlt,
          borderRadius: radius.card,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.bgElev,
          minHeight: 72,
          gap: spacing.sm,
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 16,
            lineHeight: 24,
          }}
        >
          {titulo}
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          {descricao}
        </Text>
      </View>
    </Pressable>
  );
}

// "Pular" bem visivel: barra cheia com outline, area de toque >=64dp,
// hitSlop generoso. Sempre alcancavel em 1 toque a partir do passo
// (Regra §5: nao forcar).
function BotaoPular({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      hitSlop={16}
      accessibilityRole="button"
      accessibilityLabel="pular seed onboarding"
      style={{
        minHeight: 64,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.bgElev,
        backgroundColor: hexToRgba(colors.bgElev, 0.4),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 15,
        }}
      >
        Pular
      </Text>
    </Pressable>
  );
}

type ModoSeed = 'escolha' | 'humor' | 'tarefa';

interface SeedOpcionalOnboardingProps {
  // Avanca para o Frame 5 ("Tudo pronto"). Chamado ao pular OU apos
  // gravar com sucesso. Nunca chama marcarConcluido diretamente.
  onConcluir: () => void;
}

export function SeedOpcionalOnboarding({
  onConcluir,
}: SeedOpcionalOnboardingProps) {
  const toast = useToast();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);

  const [modo, setModo] = useState<ModoSeed>('escolha');
  const [humorVal, setHumorVal] = useState<number>(HUMOR_DEFAULT);
  const [frase, setFrase] = useState<string>('');
  const [titulo, setTitulo] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);

  const handleRegistrarHumor = async () => {
    if (salvando) return;
    // Defensivo (§10): fluxo linear sempre passa pelo Frame 2 que seta
    // vaultRoot; se por algum motivo faltar, nao trava o onboarding.
    if (!vaultRoot) {
      toast.show('Não foi possível salvar agora.', 'error');
      onConcluir();
      return;
    }
    setSalvando(true);
    const meta = montarHumorSeed(pessoaAtiva, humorVal, frase);
    const parsed = HumorSchema.safeParse(meta);
    if (!parsed.success) {
      toast.show('Algo ficou inconsistente. Tente de novo.', 'error');
      setSalvando(false);
      return;
    }
    try {
      await comTimeout(saveHumor(parsed.data, vaultRoot));
      await haptics.humor();
      toast.show('Humor registrado.', 'success');
      onConcluir();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.show(`Não foi possível salvar: ${msg}`, 'error');
      setSalvando(false);
    }
  };

  const handleAdicionarTarefa = async () => {
    if (salvando) return;
    const tituloTrim = titulo.trim();
    if (tituloTrim.length === 0) {
      toast.show('Escreva o que você quer fazer.', 'error');
      return;
    }
    if (!vaultRoot) {
      toast.show('Não foi possível salvar agora.', 'error');
      onConcluir();
      return;
    }
    setSalvando(true);
    const { meta, slug } = montarTarefaSeed(pessoaAtiva, tituloTrim);
    const parsed = TarefaSchema.safeParse(meta);
    if (!parsed.success) {
      toast.show('Algo ficou inconsistente. Tente de novo.', 'error');
      setSalvando(false);
      return;
    }
    try {
      await comTimeout(criarTarefa(vaultRoot, parsed.data, slug));
      await haptics.light();
      toast.show('Tarefa adicionada.', 'success');
      onConcluir();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.show(`Não foi possível salvar: ${msg}`, 'error');
      setSalvando(false);
    }
  };

  if (modo === 'humor') {
    return (
      <View style={{ gap: spacing.lg }}>
        <MicroOrange>Como você está</MicroOrange>
        <Heading>Registre seu humor de hoje.</Heading>
        <View style={{ gap: spacing.md }}>
          <Slider
            label="Humor"
            min={1}
            max={5}
            step={1}
            value={humorVal}
            onChange={setHumorVal}
            accessibilityLabel="slider humor onboarding"
          />
          <Textarea
            label="Uma frase sobre hoje"
            placeholder="Opcional"
            value={frase}
            onChangeText={setFrase}
            accessibilityLabel="campo frase onboarding"
          />
        </View>
        <View style={{ gap: spacing.md }}>
          <Button
            variant="success"
            label={salvando ? 'Registrando…' : 'Registrar'}
            onPress={handleRegistrarHumor}
            disabled={salvando}
            accessibilityLabel="registrar humor onboarding"
          />
          <Button
            variant="ghost"
            label="Voltar"
            onPress={() => setModo('escolha')}
            disabled={salvando}
            accessibilityLabel="voltar para escolha do seed"
          />
        </View>
      </View>
    );
  }

  if (modo === 'tarefa') {
    return (
      <View style={{ gap: spacing.lg }}>
        <MicroOrange>Algo pra fazer</MicroOrange>
        <Heading>Adicione uma tarefa para hoje.</Heading>
        <Input
          label="O que você quer fazer?"
          placeholder="Ex.: Comprar pão"
          value={titulo}
          onChangeText={setTitulo}
          autoCapitalize="sentences"
          accessibilityLabel="campo titulo tarefa onboarding"
        />
        <View style={{ gap: spacing.md }}>
          <Button
            label={salvando ? 'Adicionando…' : 'Adicionar'}
            onPress={handleAdicionarTarefa}
            disabled={salvando}
            accessibilityLabel="adicionar tarefa onboarding"
          />
          <Button
            variant="ghost"
            label="Voltar"
            onPress={() => setModo('escolha')}
            disabled={salvando}
            accessibilityLabel="voltar para escolha do seed"
          />
        </View>
      </View>
    );
  }

  // modo === 'escolha'
  return (
    <View style={{ gap: spacing.lg }}>
      <MicroOrange>Opcional</MicroOrange>
      <Heading>Quer registrar algo agora?</Heading>
      <Sub>É opcional. Você pode fazer isso depois, quando quiser.</Sub>

      <CardAfordancia
        titulo="Registrar como estou"
        descricao="Um toque para marcar seu humor de hoje."
        accessibilityLabel="registrar como estou"
        onPress={() => setModo('humor')}
      />
      <CardAfordancia
        titulo="Adicionar algo pra fazer"
        descricao="Uma tarefa simples para começar."
        accessibilityLabel="adicionar algo pra fazer"
        onPress={() => setModo('tarefa')}
      />

      <View style={{ height: spacing.sm }} />
      <BotaoPular onPress={onConcluir} />
    </View>
  );
}
