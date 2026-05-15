// Sub-tela: dispositivos pareados (M38). Lista todos os deviceIds
// registrados no inbox/_devices.md com nome amigavel editavel,
// pessoa associada e ultima atividade. Dispositivos com
// substituido_por != null aparecem como "(inativo)" para o usuario
// entender que aquele id foi superado por novo.
//
// Carregamento: le devices index do Vault uma vez no mount; oferece
// pull-to-refresh implicito via botao "Atualizar".
//
// Edicao: tap em um dispositivo abre Input inline para renomear.
// Salvar chama renomearDispositivo() do helper e re-carrega o index.
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Header, Input, Screen, useToast } from '@/components/ui';
import { useVault } from '@/lib/stores/vault';
import { getDeviceId } from '@/lib/util/deviceId';
import {
  lerDevicesIndex,
  renomearDispositivo,
  type DispositivoRegistro,
} from '@/lib/vault/devicesIndex';
import { colors, radius, spacing, typography } from '@/theme/tokens';

interface ItemDispositivo {
  deviceId: string;
  registro: DispositivoRegistro;
  ehAtual: boolean;
}

export default function DispositivosTela() {
  const router = useRouter();
  const toast = useToast();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const [itens, setItens] = useState<ItemDispositivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeRascunho, setNomeRascunho] = useState('');

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const idx = await lerDevicesIndex(vaultRoot);
      const atual = await getDeviceId();
      // Ordena: ativos primeiro (substituido_por null), depois inativos.
      // Dentro de cada grupo, ultima_atividade desc.
      const lista: ItemDispositivo[] = Object.entries(idx.registro)
        .map(([deviceId, registro]) => ({
          deviceId,
          registro,
          ehAtual: deviceId === atual,
        }))
        .sort((a, b) => {
          const ai = a.registro.substituido_por === null ? 0 : 1;
          const bi = b.registro.substituido_por === null ? 0 : 1;
          if (ai !== bi) return ai - bi;
          return a.registro.ultima_atividade < b.registro.ultima_atividade
            ? 1
            : -1;
        });
      setItens(lista);
    } catch {
      toast.show('Não foi possível carregar a lista.', 'error');
    } finally {
      setCarregando(false);
    }
  }, [vaultRoot, toast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const iniciarEdicao = (item: ItemDispositivo) => {
    setEditandoId(item.deviceId);
    setNomeRascunho(item.registro.nome_amigavel);
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNomeRascunho('');
  };

  const salvarEdicao = async () => {
    if (!vaultRoot || !editandoId) return;
    const nome = nomeRascunho.trim();
    if (nome.length === 0) {
      toast.show('Nome não pode ficar vazio.', 'warn');
      return;
    }
    try {
      await renomearDispositivo(vaultRoot, editandoId, nome);
      toast.show('Nome atualizado.', 'success');
      setEditandoId(null);
      setNomeRascunho('');
      await carregar();
    } catch {
      toast.show('Não foi possível renomear.', 'error');
    }
  };

  return (
    <Screen>
      <Header title="Dispositivos pareados" onBack={() => router.back()} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingBottom: 120,
          gap: spacing.base,
        }}
        showsVerticalScrollIndicator={false}
        accessibilityLabel="lista dispositivos pareados"
      >
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.caption.size,
            lineHeight: typography.caption.size * typography.caption.lineHeight,
            paddingHorizontal: spacing.xs,
          }}
        >
          Cada instalação do app gera um identificador único usado pra evitar
          perda de dados quando dois ou mais aparelhos editam o mesmo registro
          ao mesmo tempo.
        </Text>

        {carregando ? (
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              textAlign: 'center',
              paddingVertical: spacing.lg,
            }}
          >
            Carregando…
          </Text>
        ) : itens.length === 0 ? (
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              textAlign: 'center',
              paddingVertical: spacing.lg,
            }}
          >
            Nenhum dispositivo registrado ainda.
          </Text>
        ) : (
          itens.map((item) => (
            <DispositivoCard
              key={item.deviceId}
              item={item}
              editando={editandoId === item.deviceId}
              nomeRascunho={nomeRascunho}
              onChangeNome={setNomeRascunho}
              onIniciarEdicao={() => iniciarEdicao(item)}
              onCancelar={cancelarEdicao}
              onSalvar={() => void salvarEdicao()}
            />
          ))
        )}

        <Button
          label="Atualizar"
          variant="ghost"
          onPress={() => void carregar()}
        />
      </ScrollView>
    </Screen>
  );
}

interface DispositivoCardProps {
  item: ItemDispositivo;
  editando: boolean;
  nomeRascunho: string;
  onChangeNome: (next: string) => void;
  onIniciarEdicao: () => void;
  onCancelar: () => void;
  onSalvar: () => void;
}

function DispositivoCard({
  item,
  editando,
  nomeRascunho,
  onChangeNome,
  onIniciarEdicao,
  onCancelar,
  onSalvar,
}: DispositivoCardProps) {
  const inativo = item.registro.substituido_por !== null;
  const corPessoa =
    item.registro.pessoa === 'pessoa_a' ? colors.purple : colors.pink;
  const ultima = formatarUltimaAtividade(item.registro.ultima_atividade);

  return (
    <View
      accessibilityLabel={`dispositivo ${item.deviceId}`}
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: radius.card,
        padding: spacing.base,
        gap: spacing.sm,
        opacity: inativo ? 0.55 : 1,
        borderLeftWidth: 3,
        borderLeftColor: corPessoa,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        {editando ? (
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Input
              value={nomeRascunho}
              onChangeText={onChangeNome}
              placeholder="Nome do dispositivo"
              accessibilityLabel="input nome dispositivo"
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button label="Cancelar" variant="ghost" onPress={onCancelar} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Salvar" variant="primary" onPress={onSalvar} />
              </View>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={onIniciarEdicao}
            disabled={inativo}
            accessibilityRole="button"
            accessibilityLabel={`renomear ${item.deviceId}`}
            style={{ flex: 1 }}
          >
            <Text
              style={{
                color: colors.fg,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: typography.body.size,
              }}
            >
              {item.registro.nome_amigavel}
              {item.ehAtual ? ' (este aparelho)' : ''}
              {inativo ? ' (inativo)' : ''}
            </Text>
          </Pressable>
        )}
      </View>
      {!editando ? (
        <View style={{ gap: 2 }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: typography.caption.size,
            }}
          >
            ID: {item.deviceId}
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: typography.caption.size,
            }}
          >
            Última atividade: {ultima}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// Formata ISO datetime para texto curto pt-BR. Exemplo:
//   '2026-05-04T18:30:00-03:00' -> '04/05/2026 18:30'.
// Defesa contra strings invalidas: devolve o input bruto.
function formatarUltimaAtividade(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}
