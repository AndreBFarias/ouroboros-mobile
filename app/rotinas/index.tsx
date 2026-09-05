// Lista de Rotinas de Treino (Q11.a). Renderiza:
//   - Header "Rotinas" + chevron de voltar.
//   - Cada item: card com nome (fg medium), descricao (muted) e N
//     exercicios (mutedDecor pequeno). Tap navega para /rotinas/<slug>.
//   - Empty state explicativo quando nenhuma rotina cadastrada.
//   - FAB + abre /rotinas/novo.
//
// Carrega via useFocusEffect + listarRotinas, filtrando por autor (cada
// pessoa ve apenas as proprias rotinas, padrao de privacidade do Vault).
//
// AUDIT-P2-8 (R-SF-3): cada card ganha o BotaoMarcar de marcacao rapida
// no lado direito. Tres decisoes que precisam ficar registradas:
//
//   1. O botao e IRMAO do Pressable de navegacao, nao filho dele. Em
//      react-native o filho ja venceria o pai pelo responder system,
//      mas em react-native-web (o Gauntlet roda ali) o Pressable vira
//      DOM e o clique BORBULHA: nested pressable dispararia tambem a
//      navegacao. Card virou row: Pressable flex:1 com o texto +
//      BotaoMarcar solto a direita. Como efeito colateral bom, o rodape
//      do card continua com dois filhos em space-between, entao a data
//      segue encostada na direita.
//   2. O gap entre a coluna de texto e o botao e spacing.base (16), que
//      e exatamente o hitSlop do BotaoMarcar: a area de toque efetiva
//      encosta na coluna de texto sem invadi-la.
//   3. O estado `marcado` vem de UMA leitura por rotina por foco, dentro
//      do carregar() que ja roda no useFocusEffect - nunca por render.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Dumbbell } from '@/lib/icons';
import { EmptyState, FAB, Header, Screen } from '@/components/ui';
import { BotaoMarcar } from '@/components/rotinas/BotaoMarcar';
import { colors, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { listarRotinas } from '@/lib/vault/rotina';
import {
  lerMarcacaoDia,
  registrarMarcacao,
  silenciarLembreteHoje,
} from '@/lib/vault/rotina_marcacao';
import type { RotinaMeta } from '@/lib/schemas/rotina';

export default function RotinasIndex() {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);

  const [rotinas, setRotinas] = useState<RotinaMeta[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  // slug -> ja marcada pelo menos 1x hoje.
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  // Latch de reentrancia por slug. registrarMarcacao e read-modify-write
  // sem lock: dois taps em voo leem o mesmo arquivo e o segundo write
  // sobrescreve o primeiro (lost update). Ref em vez de state porque a
  // checagem precisa ser sincrona no handler do tap.
  const marcandoRef = useRef<Set<string>>(new Set());

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setRotinas([]);
      setMarcados({});
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const lista = await listarRotinas(vaultRoot, pessoaAtiva);
      setRotinas(lista);
      // AUDIT-P2-8: uma leitura por rotina por foco. lerMarcacaoDia
      // LANCA quando o .md do dia esta com schema quebrado; o catch por
      // rotina impede que um arquivo corrompido derrube a lista toda.
      const hoje = new Date();
      const mapa: Record<string, boolean> = {};
      for (const rotina of lista) {
        try {
          const meta = await lerMarcacaoDia(vaultRoot, rotina.slug, hoje);
          mapa[rotina.slug] =
            meta !== null &&
            meta.autor === pessoaAtiva &&
            meta.marcacoes.length > 0;
        } catch {
          mapa[rotina.slug] = false;
        }
      }
      setMarcados(mapa);
    } finally {
      setCarregando(false);
    }
  }, [vaultRoot, pessoaAtiva]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  const handleNovo = useCallback(() => {
    haptics.light();
    router.push('/rotinas/novo');
  }, [router]);

  const handleAbrir = useCallback(
    (slug: string) => {
      router.push({ pathname: '/rotinas/[slug]', params: { slug } });
    },
    [router]
  );

  // AUDIT-P2-8: tap de marcacao rapida. Otimista no visual, reconcilia
  // com o retorno e reverte no erro. Nao bloqueia re-marcacao no mesmo
  // dia (medicacao 2x ao dia e caso valido, BotaoMarcar.tsx:10-13); o
  // latch abaixo so serializa taps SIMULTANEOS.
  const handleMarcar = useCallback(
    async (slug: string) => {
      if (!vaultRoot) return;
      if (marcandoRef.current.has(slug)) return;
      marcandoRef.current.add(slug);
      const anterior = marcados[slug] ?? false;
      setMarcados((atual) => ({ ...atual, [slug]: true }));
      try {
        const agora = new Date();
        const meta = await registrarMarcacao(vaultRoot, {
          rotinaSlug: slug,
          autor: pessoaAtiva,
          agora,
        });
        // "Lembrete silenciado se marcado antes" (R-SF-3). Grava o
        // campo silenciar_lembrete_ate no proprio arquivo do dia.
        await silenciarLembreteHoje(vaultRoot, { rotinaSlug: slug, agora });
        setMarcados((atual) => ({
          ...atual,
          [slug]: meta.marcacoes.length > 0,
        }));
      } catch {
        void haptics.error();
        setMarcados((atual) => ({ ...atual, [slug]: anterior }));
      } finally {
        marcandoRef.current.delete(slug);
      }
    },
    [vaultRoot, pessoaAtiva, marcados]
  );

  const semDados = !carregando && rotinas.length === 0;

  return (
    <Screen>
      <Header title="Rotinas" onBack={() => router.back()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.base,
        }}
        showsVerticalScrollIndicator={false}
      >
        {semDados ? (
          // R-ROT-2: amplia o exemplo alem de exercicio. Rotina agora
          // serve para medicacao, habito e leitura tambem.
          <EmptyState
            frase="Crie sua primeira rotina — Tomar remédio, Tomar água, Caminhar 30min, Ler 10min, Meditar..."
            Icon={Dumbbell}
          />
        ) : (
          rotinas.map((rotina) => (
            <View
              key={rotina.slug}
              style={{
                backgroundColor: colors.bgAlt,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.bgElev,
                padding: spacing.base,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.base,
              }}
            >
              <Pressable
                onPress={() => handleAbrir(rotina.slug)}
                accessibilityRole="button"
                accessibilityLabel={`abrir rotina ${rotina.nome}`}
                style={{ flex: 1, gap: spacing.xs }}
              >
                <Text
                  style={{
                    color: colors.fg,
                    fontFamily: 'JetBrainsMono_500Medium',
                    fontSize: 14,
                    lineHeight: 22,
                  }}
                  numberOfLines={1}
                >
                  {rotina.nome}
                </Text>
                {rotina.descricao && rotina.descricao.trim().length > 0 ? (
                  <Text
                    style={{
                      color: colors.muted,
                      fontFamily: 'JetBrainsMono_400Regular',
                      fontSize: 12,
                      lineHeight: 18,
                    }}
                    numberOfLines={2}
                  >
                    {rotina.descricao}
                  </Text>
                ) : null}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: spacing.xs,
                  }}
                >
                  <Text
                    style={{
                      color: colors.mutedDecor,
                      fontFamily: 'JetBrainsMono_400Regular',
                      fontSize: 11,
                      lineHeight: 16,
                    }}
                  >
                    {`${rotina.exercicios.length} ${
                      rotina.exercicios.length === 1
                        ? 'exercício'
                        : 'exercícios'
                    }`}
                  </Text>
                  <Text
                    style={{
                      color: colors.mutedDecor,
                      fontFamily: 'JetBrainsMono_400Regular',
                      fontSize: 11,
                      lineHeight: 16,
                    }}
                  >
                    {rotina.data_criacao}
                  </Text>
                </View>
              </Pressable>
              <BotaoMarcar
                marcado={marcados[rotina.slug] ?? false}
                onPress={() => void handleMarcar(rotina.slug)}
                accessibilityLabel={`marcar rotina ${rotina.nome}`}
              />
            </View>
          ))
        )}
      </ScrollView>

      <FAB onPress={handleNovo} accessibilityLabel="nova rotina" />
    </Screen>
  );
}
