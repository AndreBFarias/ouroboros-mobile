// Q9 (Onda Q): detalhe generico read-only de um item da Galeria.
// Recebe params { tipo, slug, data, uri } via expo-router (push do
// /galeria/index). Le o .md via readVaultFile com schema permissivo
// (passthrough) — galeria ja toleta varios shapes; aqui apenas
// exibimos.
//
// Layout: Header com titulo curto + ScrollView com
//  - bloco "frontmatter" como lista key/value monoespacada
//  - bloco "corpo" com o texto pos --- (quando presente)
//
// No futuro, redirect para rotas dedicadas (ex: /conquistas/[id])
// pode ser adicionado quando essas existirem. Em v1.0 nenhuma das
// rotas /conquistas|/eventos|/marcos por id existe no codebase
// (verificado em Q9 spec), entao todo tipo cai no detalhe inline.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { z } from 'zod';
import { Header, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { readVaultFile } from '@/lib/vault/reader';

// Schema permissivo: aceita qualquer frontmatter, expoe meta como
// Record<string, unknown>. Detalhe so renderiza pares chave/valor —
// nao precisa validar shape.
const GenericoSchema = z.object({}).passthrough();

interface ParsedDetalhe {
  meta: Record<string, unknown>;
  body: string;
}

const ROTULO_TIPO: Record<string, string> = {
  humor: 'Humor',
  diario: 'Diário',
  evento: 'Evento',
  marco: 'Marco',
  foto: 'Foto',
  audio: 'Áudio',
  video: 'Vídeo',
  frase: 'Frase',
  tarefa: 'Tarefa',
  alarme: 'Alarme',
  contador: 'Contador',
  nota: 'Nota',
  ciclo: 'Ciclo',
  exercicio: 'Exercício',
  scanner: 'Documento',
};

function formatarValor(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export default function GaleriaDetalhe() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    slug?: string;
    tipo?: string;
    data?: string;
    uri?: string;
  }>();

  const [carregado, setCarregado] = useState<ParsedDetalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const uri = params.uri;
    if (typeof uri !== 'string' || uri.length === 0) {
      setErro('URI ausente nos parametros.');
      setCarregando(false);
      return;
    }
    let cancelado = false;
    (async () => {
      try {
        const result = await readVaultFile(uri, GenericoSchema);
        if (cancelado) return;
        if (!result) {
          setErro('Arquivo nao encontrado.');
        } else {
          setCarregado({
            meta: result.meta as Record<string, unknown>,
            body: result.body ?? '',
          });
        }
      } catch (e) {
        if (cancelado) return;
        setErro((e as Error).message);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [params.uri]);

  const tipo = params.tipo ?? '';
  const tituloTipo = ROTULO_TIPO[tipo] ?? 'Registro';

  return (
    <Screen>
      <Header title={tituloTipo} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: spacing.md,
          paddingBottom: spacing.xxl,
          gap: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        {carregando ? (
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 13,
            }}
          >
            Carregando...
          </Text>
        ) : erro ? (
          <Text
            style={{
              color: colors.red,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 13,
            }}
          >
            {erro}
          </Text>
        ) : carregado ? (
          <>
            <BlocoMetadados meta={carregado.meta} />
            {carregado.body.trim().length > 0 ? (
              <BlocoCorpo body={carregado.body} />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function BlocoMetadados({ meta }: { meta: Record<string, unknown> }) {
  const entradas = Object.entries(meta).filter(([, v]) => v !== undefined);
  return (
    <View
      style={{
        backgroundColor: colors.bgElev,
        borderRadius: 12,
        padding: spacing.md,
        gap: spacing.xs,
      }}
    >
      {entradas.map(([k, v]) => (
        <View
          key={k}
          className="flex-row"
          style={{ gap: spacing.sm, alignItems: 'flex-start' }}
        >
          <Text
            style={{
              color: colors.orange,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 11,
              width: 100,
            }}
          >
            {k}
          </Text>
          <Text
            style={{
              flex: 1,
              color: colors.fg,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              lineHeight: 18,
            }}
            selectable
          >
            {formatarValor(v)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function BlocoCorpo({ body }: { body: string }) {
  return (
    <View
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: 12,
        padding: spacing.md,
      }}
    >
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 13,
          lineHeight: 20,
        }}
        selectable
      >
        {body}
      </Text>
    </View>
  );
}
