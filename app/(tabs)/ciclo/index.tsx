// Tela 20.5 - Acompanhamento de Ciclo (M14.5). Visualizacao opt-in
// que so aparece quando o toggle featureToggles.cicloMenstrual em
// useSettings esta ligado. Renderiza:
//   - Header "Acompanhamento do ciclo".
//   - Linha micro muted: "Registro voluntario. Pula dias sem culpa."
//   - CalendarioFases 28-35 dias adaptativo.
//   - Botao primario "Registrar hoje" no rodape.
//
// Empty state quando não ha registros: frase canonica
// "Pode registrar o início do primeiro ciclo quando quiser." e
// botao "Registrar hoje" continua visivel para que o usuario
// possa criar o primeiro registro.
//
// Carrega registros do Vault via listarRegistrosCiclo filtrando por
// pessoaAtiva (privacidade visual entre as duas pessoas, M14.5 spec).
// Recarrega ao focar (useFocusEffect) para refletir saves recentes.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Button,
  EmptyState,
  Header,
  Screen,
} from '@/components/ui';
import { CalendarioFases } from '@/components/ciclo/CalendarioFases';
import { colors, spacing } from '@/theme/tokens';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import {
  listarRegistrosCiclo,
  duracaoCicloDetectada,
  ultimaDataInicio,
} from '@/lib/vault/ciclo';
import type { CicloMenstrualMeta } from '@/lib/schemas/ciclo_menstrual';

export default function CicloIndex() {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);

  const [registros, setRegistros] = useState<CicloMenstrualMeta[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setRegistros([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const out = await listarRegistrosCiclo(vaultRoot, pessoaAtiva, {
        periodo: 'tudo',
      });
      setRegistros(out);
    } finally {
      setCarregando(false);
    }
  }, [vaultRoot, pessoaAtiva]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  const dataInicio = useMemo(
    () => ultimaDataInicio(registros),
    [registros]
  );
  const duracao = useMemo(
    () => duracaoCicloDetectada(registros),
    [registros]
  );

  const semDados = !carregando && registros.length === 0;

  const handleRegistrarHoje = useCallback(() => {
    router.push('/(tabs)/ciclo/registrar');
  }, [router]);

  const handleSelectDay = useCallback(
    (data: string) => {
      router.push({
        pathname: '/(tabs)/ciclo/registrar',
        params: { data },
      });
    },
    [router]
  );

  return (
    <Screen>
      <Header title="Acompanhamento do ciclo" />

      <View style={{ marginTop: spacing.xs, marginBottom: spacing.base }}>
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          Registro voluntário. Pula dias sem culpa.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.sm,
          paddingBottom: spacing.huge,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {semDados || !dataInicio ? (
          <EmptyState
            frase={
              dataInicio
                ? 'Registre quando quiser.'
                : 'Pode registrar o início do primeiro ciclo quando quiser.'
            }
          />
        ) : (
          <View style={{ alignItems: 'center', gap: spacing.base }}>
            <CalendarioFases
              registros={registros}
              dataInicioUltimoCiclo={dataInicio}
              duracao={duracao}
              onSelectDay={handleSelectDay}
            />
          </View>
        )}
      </ScrollView>

      <View style={{ paddingBottom: spacing.base }}>
        <Button
          label="Registrar hoje"
          onPress={handleRegistrarHoje}
          variant="primary"
        />
      </View>
    </Screen>
  );
}
