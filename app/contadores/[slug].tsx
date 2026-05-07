// Tela de detalhe do Contador (M18). Conteudo:
//   - Header "<titulo>" laranja, com chevron de voltar.
//   - Sumario: número gigante + label dia/dias + recorde muted.
//   - Botoes: Editar titulo (abre Modal de input), Resetei
//     (abre ModalConfirmaReset), Excluir (destructive, com modal de
//     confirmacao).
//   - Timeline vertical de resets em ordem cronologica decrescente
//     (mais recente no topo). Linha --bg-elev, dots --muted-decor
//     8dp, data formatada e duracao da sequência ao lado.
//
// Sem celebracao visual (ADR-0005). Sem cor especial em sequências
// longas. Sem icones de trofeu, chama, badge.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  Header,
  Input,
  Screen,
  useToast,
} from '@/components/ui';
import { ModalConfirmaReset } from '@/components/contadores/ModalConfirmaReset';
import { colors, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import {
  escreverContador,
  excluirContador,
  lerContador,
  registrarReset,
} from '@/lib/vault/contadores';
import { diasEntre } from '@/lib/util/diasEntre';
import { mensagemApoio, marcoAtingido } from '@/lib/contadores/mensagens';
import type { Contador } from '@/lib/schemas/contador';
import { comTimeout } from '@/lib/util/comTimeout';

// Formata ISO datetime para "DD/MM/YYYY HH:MM" (UTC-3 implicito; o
// ISO já vem com offset).
function formatResetData(iso: string): string {
  // Cria Date e usa métodos locais para extrair (browser/RN aplicam
  // timezone do device automaticamente).
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} ${hh}:${mm}`;
}

// Computa a duracao da sequência que terminou neste reset, em dias.
// Usa o reset anterior (ou criado_em do contador) como início.
function calcDuracaoSequencia(
  resets: string[],
  indiceReset: number,
  criadoEm: string
): number {
  const fim = resets[indiceReset];
  const inicio = indiceReset > 0 ? resets[indiceReset - 1] : criadoEm;
  return Math.max(0, diasEntre(new Date(inicio), new Date(fim)));
}

export default function ContadorDetalhe() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string }>();
  const slugParam = typeof params.slug === 'string' ? params.slug : null;
  const vaultRoot = useVault((s) => s.vaultRoot);
  const toast = useToast();

  const [contador, setContador] = useState<Contador | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [modalReset, setModalReset] = useState<boolean>(false);
  const [enviandoReset, setEnviandoReset] = useState<boolean>(false);
  const [modalEditar, setModalEditar] = useState<boolean>(false);
  const [novoTitulo, setNovoTitulo] = useState<string>('');
  const [salvandoEdicao, setSalvandoEdicao] = useState<boolean>(false);
  const [modalExcluir, setModalExcluir] = useState<boolean>(false);
  const [excluindo, setExcluindo] = useState<boolean>(false);

  const carregar = useCallback(async () => {
    if (!vaultRoot || !slugParam) {
      setContador(null);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const lido = await lerContador(vaultRoot, slugParam);
      setContador(lido);
    } finally {
      setCarregando(false);
    }
  }, [vaultRoot, slugParam]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const dias = useMemo(() => {
    if (!contador) return 0;
    return Math.max(0, diasEntre(contador.inicio, new Date()));
  }, [contador]);

  const resetsOrdenados = useMemo(() => {
    if (!contador) return [];
    // Lista do mais recente para o mais antigo, preservando indice
    // original para calculo de duracao.
    return contador.resets
      .map((iso, idx) => ({ iso, idx }))
      .sort((a, b) => (a.iso < b.iso ? 1 : -1));
  }, [contador]);

  const handleAbrirReset = useCallback(() => {
    setModalReset(true);
  }, []);

  const handleConfirmarReset = useCallback(async () => {
    if (!vaultRoot || !contador || enviandoReset) return;
    setEnviandoReset(true);
    try {
      // I-CONTADOR: registrarReset sob comTimeout 10s default. Reset
      // preserva todos os timestamps anteriores em resets[] (decisão
      // durável dono 2026-05-03 BRIEF §1.8) e recorde so sobe via
      // Math.max - nunca diminui, nunca apaga historico.
      const atualizado = await comTimeout(
        registrarReset(vaultRoot, contador.slug)
      );
      void haptics.medium();
      toast.show('Contador resetado.', 'info');
      setContador(atualizado);
      setModalReset(false);
    } catch (e) {
      void haptics.error();
      const msg = e instanceof Error ? e.message : String(e);
      toast.show(`Não foi possível salvar: ${msg}`, 'error');
      // eslint-disable-next-line no-console
      console.error('reset contador fail', e);
    } finally {
      setEnviandoReset(false);
    }
  }, [vaultRoot, contador, enviandoReset, toast]);

  const handleAbrirEditar = useCallback(() => {
    if (!contador) return;
    setNovoTitulo(contador.titulo);
    setModalEditar(true);
  }, [contador]);

  const handleSalvarEdicao = useCallback(async () => {
    if (!vaultRoot || !contador || salvandoEdicao) return;
    const limpo = novoTitulo.trim();
    if (limpo.length === 0) {
      toast.show('Título inválido.', 'error');
      return;
    }
    setSalvandoEdicao(true);
    try {
      const atualizado: Contador = { ...contador, titulo: limpo };
      // I-CONTADOR: edicao de titulo sob comTimeout 10s default.
      await comTimeout(escreverContador(vaultRoot, atualizado));
      void haptics.light();
      toast.show('Título atualizado.', 'success');
      setContador(atualizado);
      setModalEditar(false);
    } catch (e) {
      void haptics.error();
      const msg = e instanceof Error ? e.message : String(e);
      toast.show(`Não foi possível salvar: ${msg}`, 'error');
      // eslint-disable-next-line no-console
      console.error('edicao contador fail', e);
    } finally {
      setSalvandoEdicao(false);
    }
  }, [vaultRoot, contador, novoTitulo, salvandoEdicao, toast]);

  const handleAbrirExcluir = useCallback(() => {
    setModalExcluir(true);
  }, []);

  const handleConfirmarExcluir = useCallback(async () => {
    if (!vaultRoot || !contador || excluindo) return;
    setExcluindo(true);
    try {
      await excluirContador(vaultRoot, contador.slug);
      void haptics.light();
      toast.show('Contador removido.', 'success');
      router.back();
    } catch {
      void haptics.error();
      toast.show('Não foi possível remover.', 'error');
    } finally {
      setExcluindo(false);
    }
  }, [vaultRoot, contador, excluindo, toast, router]);

  if (carregando) {
    return (
      <Screen>
        <Header title="Contador" onBack={() => router.back()} />
        <View style={{ flex: 1 }} />
      </Screen>
    );
  }

  if (!contador) {
    return (
      <Screen>
        <Header title="Contador" onBack={() => router.back()} />
        <View style={{ flex: 1, paddingTop: spacing.huge }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 14,
              lineHeight: 22,
              textAlign: 'center',
            }}
          >
            Contador não encontrado.
          </Text>
        </View>
      </Screen>
    );
  }

  const labelDias = dias === 1 ? 'dia' : 'dias';

  return (
    <Screen>
      <Header title={contador.titulo} onBack={() => router.back()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Sumario */}
        <View style={{ gap: spacing.sm }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              gap: spacing.sm,
            }}
          >
            <Text
              style={{
                color: colors.cyan,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 56,
                lineHeight: 64,
              }}
              accessibilityLabel={`numero de dias ${dias}`}
            >
              {dias}
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 16,
                lineHeight: 24,
              }}
            >
              {labelDias}
            </Text>
          </View>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 13,
              lineHeight: 20,
            }}
          >
            {`Recorde: ${contador.recorde} ${contador.recorde === 1 ? 'dia' : 'dias'}`}
          </Text>
          {/* M32: mensagem de apoio sobria + indicador discreto de marco.
              ADR-0005 zero gamificacao -- texto em muted, sem cor de festa. */}
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 13,
              lineHeight: 20,
              marginTop: spacing.sm,
            }}
            accessibilityLabel="mensagem de apoio"
          >
            {mensagemApoio(dias)}
          </Text>
          {marcoAtingido(dias) !== null ? (
            <Text
              style={{
                color: colors.mutedDecor,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 11,
                lineHeight: 16,
                letterSpacing: 1,
                marginTop: spacing.xs,
              }}
              accessibilityLabel={`marco de ${marcoAtingido(dias)} dias`}
            >
              {`marco de ${marcoAtingido(dias)} dias`}
            </Text>
          ) : null}
        </View>

        {/* Ações */}
        <View style={{ gap: spacing.sm }}>
          <Button
            label="Resetei"
            onPress={handleAbrirReset}
            variant="destructive"
          />
          <Button
            label="Editar título"
            onPress={handleAbrirEditar}
            variant="ghost"
          />
        </View>

        {/* Timeline de resets */}
        <View style={{ gap: spacing.sm }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Histórico
          </Text>

          {resetsOrdenados.length === 0 ? (
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              Nenhum reset ainda.
            </Text>
          ) : (
            <View accessibilityLabel="timeline de resets">
              {resetsOrdenados.map((entrada, posicao) => {
                const duracao = calcDuracaoSequencia(
                  contador.resets,
                  entrada.idx,
                  contador.criado_em
                );
                const ultimo = posicao === resetsOrdenados.length - 1;
                return (
                  <View
                    key={entrada.iso}
                    style={{ flexDirection: 'row', gap: spacing.base }}
                  >
                    {/* Coluna esquerda: dot e linha */}
                    <View
                      style={{
                        width: 16,
                        alignItems: 'center',
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: colors.mutedDecor,
                          marginTop: 6,
                        }}
                      />
                      {!ultimo ? (
                        <View
                          style={{
                            flex: 1,
                            width: 1,
                            backgroundColor: colors.bgElev,
                            marginTop: 4,
                          }}
                        />
                      ) : null}
                    </View>

                    {/* Coluna direita: data e duracao */}
                    <View
                      style={{
                        flex: 1,
                        paddingBottom: ultimo ? 0 : spacing.base,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.fg,
                          fontFamily: 'JetBrainsMono_500Medium',
                          fontSize: 14,
                          lineHeight: 22,
                        }}
                      >
                        {formatResetData(entrada.iso)}
                      </Text>
                      <Text
                        style={{
                          color: colors.muted,
                          fontFamily: 'JetBrainsMono_400Regular',
                          fontSize: 12,
                          lineHeight: 18,
                        }}
                      >
                        {`Sequência de ${duracao} ${duracao === 1 ? 'dia' : 'dias'}`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Excluir contador (destructive ghost no fim) */}
        <View style={{ marginTop: spacing.base }}>
          <Button
            label="Excluir contador"
            onPress={handleAbrirExcluir}
            variant="destructive"
          />
        </View>
      </ScrollView>

      <ModalConfirmaReset
        visible={modalReset}
        onConfirmar={() => void handleConfirmarReset()}
        onCancelar={() => setModalReset(false)}
        enviando={enviandoReset}
      />

      {/* Modal editar titulo */}
      <Modal
        visible={modalEditar}
        transparent
        animationType="fade"
        onRequestClose={() => setModalEditar(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20, 21, 26, 0.85)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: colors.bg,
              borderRadius: radius.modal,
              padding: spacing.lg,
              gap: spacing.base,
              width: '100%',
              maxWidth: 360,
            }}
            accessibilityLabel="modal editar titulo contador"
          >
            <Text
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 16,
                lineHeight: 24,
              }}
            >
              Editar título
            </Text>
            <Input
              value={novoTitulo}
              onChangeText={setNovoTitulo}
              placeholder="Novo título"
              accessibilityLabel="novo titulo do contador"
            />
            <View style={{ gap: spacing.sm }}>
              <Button
                label="Salvar"
                onPress={() => void handleSalvarEdicao()}
                variant="primary"
                disabled={salvandoEdicao || novoTitulo.trim().length === 0}
              />
              <Button
                label="Cancelar"
                onPress={() => setModalEditar(false)}
                variant="ghost"
                disabled={salvandoEdicao}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal confirmar exclusao */}
      <Modal
        visible={modalExcluir}
        transparent
        animationType="fade"
        onRequestClose={() => setModalExcluir(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20, 21, 26, 0.85)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: colors.bg,
              borderRadius: radius.modal,
              padding: spacing.lg,
              gap: spacing.base,
              width: '100%',
              maxWidth: 360,
            }}
            accessibilityLabel="modal confirmar exclusao contador"
          >
            <Text
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 16,
                lineHeight: 24,
              }}
            >
              Excluir contador?
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              O arquivo do contador será removido. Esta ação não pode
              ser desfeita.
            </Text>
            <View style={{ gap: spacing.sm }}>
              <Button
                label="Confirmar exclusão"
                onPress={() => void handleConfirmarExcluir()}
                variant="destructive"
                disabled={excluindo}
              />
              <Button
                label="Cancelar"
                onPress={() => setModalExcluir(false)}
                variant="ghost"
                disabled={excluindo}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
