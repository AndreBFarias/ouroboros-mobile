// Tela de listagem de Alarmes (M16). Render:
//   - Header "Alarmes".
//   - Empty state "Crie seu primeiro alarme." quando lista vazia.
//   - Cards de alarme com toggle inline.
//   - Botao primario rodape "Novo alarme".
//
// Carrega do Vault via listarAlarmes; recarrega ao focar (useFocusEffect)
// para refletir saves e exclusoes recentes.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bell } from '@/lib/icons';
import {
  Button,
  EmptyState,
  Header,
  Screen,
  useToast,
} from '@/components/ui';
import { CardAlarme } from '@/components/alarmes/CardAlarme';
import { spacing } from '@/theme/tokens';
import { useVault } from '@/lib/stores/vault';
import {
  escreverAlarme,
  listarAlarmes,
} from '@/lib/vault/alarmes';
import {
  agendarAlarme,
  cancelarAlarme,
} from '@/lib/services/alarmesNotificacoes';
import type { Alarme } from '@/lib/schemas/alarme';

export default function AlarmesIndex() {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const toast = useToast();

  const [alarmes, setAlarmes] = useState<Alarme[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setAlarmes([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const lista = await listarAlarmes(vaultRoot);
      setAlarmes(lista);
    } finally {
      setCarregando(false);
    }
  }, [vaultRoot]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  const handleToggle = useCallback(
    async (alarme: Alarme, next: boolean) => {
      if (!vaultRoot) return;
      try {
        let notificationIds = alarme.notification_ids;
        if (next) {
          // Tentando ligar: agenda primeiro; se estourou cap, mantem off.
          const res = await agendarAlarme({ ...alarme, ativo: true });
          if (res.estourou) {
            toast.show(
              'Limite de 64 alarmes atingido. Desative algum antes de criar.',
              'error'
            );
            return;
          }
          notificationIds = res.ids;
        } else {
          await cancelarAlarme(alarme.slug);
          notificationIds = [];
        }

        const atualizado: Alarme = {
          ...alarme,
          ativo: next,
          notification_ids: notificationIds,
          // Cancelar também zera snooze pendente.
          snooze_id: next ? alarme.snooze_id : null,
        };
        await escreverAlarme(vaultRoot, atualizado);
        setAlarmes((cur) =>
          cur.map((a) => (a.slug === alarme.slug ? atualizado : a))
        );
      } catch {
        toast.show('Não foi possível alterar o alarme.', 'error');
      }
    },
    [vaultRoot, toast]
  );

  const handleNovo = useCallback(() => {
    router.push('/alarmes/novo');
  }, [router]);

  const handleEditar = useCallback(
    (slug: string) => {
      router.push({
        pathname: '/alarmes/[slug]',
        params: { slug },
      });
    },
    [router]
  );

  const semDados = !carregando && alarmes.length === 0;

  return (
    <Screen>
      <Header title="Alarmes" />

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
          <EmptyState frase="Crie seu primeiro alarme." Icon={Bell} />
        ) : (
          alarmes.map((alarme) => (
            <CardAlarme
              key={alarme.slug}
              alarme={alarme}
              onToggle={(next) => void handleToggle(alarme, next)}
              onPressEditar={() => handleEditar(alarme.slug)}
            />
          ))
        )}
      </ScrollView>

      <View style={{ paddingBottom: spacing.base }}>
        <Button
          label="Novo alarme"
          onPress={handleNovo}
          variant="primary"
          disabled={!vaultRoot}
        />
      </View>
    </Screen>
  );
}
