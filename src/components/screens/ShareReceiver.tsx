// Componente da Tela 17 (M08): Share Intent Receiver. Recebe o
// arquivo via share sheet do Android, deixa o usuario classificar e
// salva no Vault inbox. Padrao de tela completa (não bottom sheet)
// porque a activity de share abre como modal transparente raiz.
//
// Estrutura visual:
//   1. Header simples: titulo "Tipo detectado" + chevron de voltar.
//   2. Preview do arquivo (PreviewArquivo).
//   3. ChipGroup categoria (8 subtipos, mode='single').
//   4. Path display em cyan mono caption (atualiza dinamico).
//   5. ChipGroup pessoa (default na pessoaAtiva).
//   6. Banner de conflito amarelo (3 ações) quando aplicavel.
//   7. Botoes Salvar (success/disabled) e Cancelar (ghost).
//
// Estados externos são geridos pelo container (app/share-receive.tsx).
// Esta tela so recebe props e dispara callbacks.
import { ScrollView, Text, View } from 'react-native';
import { ChevronLeft } from '@/lib/icons';
import { Pressable } from 'react-native';
import { Button, Chip, ChipGroup, type ChipOption } from '@/components/ui';
import { PreviewArquivo } from './PreviewArquivo';
import { colors, radius, spacing } from '@/theme/tokens';
import {
  INBOX_SUBTIPO_OPTIONS,
} from '@/lib/share/categorias';
import type { InboxArquivoSubtipo } from '@/lib/schemas/inbox_arquivo';
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import { nomeDe } from '@/lib/stores/pessoa';

// Ações disponiveis quando já existe arquivo no path canonico.
export type ConflitoAcao = 'renomear' | 'substituir' | 'cancelar';

export interface ShareReceiverProps {
  // Dados do arquivo recebido.
  uri: string;
  mimeType: string;
  nome: string;
  tamanhoBytes?: number;

  // Estado controlado.
  subtipo: InboxArquivoSubtipo;
  onChangeSubtipo: (s: InboxArquivoSubtipo) => void;

  pessoa: PessoaAutor;
  onChangePessoa: (p: PessoaAutor) => void;

  // Path canonico calculado pelo container (atualiza dinamico).
  // Display em cyan mono caption.
  pathDisplay: string;

  // Estados de salvamento.
  salvando: boolean;
  // null quando não ha conflito; objeto com path quando o canonico
  // já existe e o usuario precisa decidir.
  conflito: { pathExistente: string } | null;
  onResolverConflito: (acao: ConflitoAcao) => void;

  // Ações principais.
  onSalvar: () => void;
  onCancelar: () => void;

  // Opcional: nomes amigaveis das pessoas para os chips. Resolvidos
  // pelo container via nomeDe(pessoa). Se omitidos, fallback para o
  // slug.
  nomePessoaA?: string;
  nomePessoaB?: string;
}

// Helper interno para renderizar titulo de seção com estilo padrao.
function tituloSecao(texto: string) {
  return (
    <Text
      style={{
        color: colors.muted,
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 12,
        lineHeight: 16,
      }}
    >
      {texto}
    </Text>
  );
}

export function ShareReceiver(props: ShareReceiverProps) {
  const {
    uri,
    mimeType,
    nome,
    tamanhoBytes,
    subtipo,
    onChangeSubtipo,
    pessoa,
    onChangePessoa,
    pathDisplay,
    salvando,
    conflito,
    onResolverConflito,
    onSalvar,
    onCancelar,
    nomePessoaA,
    nomePessoaB,
  } = props;

  const opcoesPessoa: ChipOption[] = [
    {
      value: 'pessoa_a',
      label: nomePessoaA ?? nomeDe('pessoa_a'),
      accent: 'purple',
    },
    {
      value: 'pessoa_b',
      label: nomePessoaB ?? nomeDe('pessoa_b'),
      accent: 'pink',
    },
  ];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgPage,
      }}
      accessibilityLabel="tela share receiver"
    >
      {/* Header simples sem tabs nem hambruger; so chevron + titulo. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
          gap: spacing.sm,
        }}
      >
        <Pressable
          onPress={onCancelar}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="voltar"
          style={{ width: 32, height: 32, justifyContent: 'center' }}
        >
          <ChevronLeft size={28} color={colors.fg} strokeWidth={1.5} />
        </Pressable>
        <Text
          style={{
            color: colors.orange,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 16,
          }}
          accessibilityRole="header"
          accessibilityLabel="tipo detectado"
        >
          Tipo detectado
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xl,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <PreviewArquivo
          uri={uri}
          mimeType={mimeType}
          nome={nome}
          tamanhoBytes={tamanhoBytes}
        />

        <View style={{ gap: spacing.sm }}>
          {tituloSecao('Categoria')}
          <ChipGroup
            mode="single"
            value={subtipo}
            onChange={(next) => {
              if (next !== null) onChangeSubtipo(next as InboxArquivoSubtipo);
            }}
            options={[...INBOX_SUBTIPO_OPTIONS]}
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          {tituloSecao('Destino no inbox')}
          <Text
            accessibilityLabel="path destino"
            style={{
              color: colors.cyan,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            {pathDisplay}
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          {tituloSecao('Quem está salvando')}
          <ChipGroup
            mode="single"
            value={pessoa}
            onChange={(next) => {
              if (next !== null) onChangePessoa(next as PessoaAutor);
            }}
            options={opcoesPessoa}
          />
        </View>

        {conflito ? (
          <View
            accessibilityLabel="banner conflito"
            style={{
              backgroundColor: colors.bgAlt,
              borderLeftWidth: 3,
              borderLeftColor: colors.yellow,
              borderRadius: radius.card,
              padding: spacing.base,
              gap: spacing.sm,
            }}
          >
            <Text
              style={{
                color: colors.yellow,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 13,
                lineHeight: 18,
              }}
            >
              Já existe um arquivo com nome similar.
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 11,
                lineHeight: 16,
              }}
              numberOfLines={2}
            >
              {conflito.pathExistente}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              <Chip
                label="Renomear automaticamente"
                accent="yellow"
                selected={false}
                onPress={() => onResolverConflito('renomear')}
              />
              <Chip
                label="Substituir"
                accent="red"
                selected={false}
                onPress={() => onResolverConflito('substituir')}
              />
              <Chip
                label="Cancelar"
                accent="purple"
                selected={false}
                onPress={() => onResolverConflito('cancelar')}
              />
            </View>
          </View>
        ) : null}

        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
            lineHeight: 16,
            textAlign: 'center',
          }}
          accessibilityLabel="rodape privacidade"
        >
          Salvo localmente. Nada sai do aparelho.
        </Text>

        <View style={{ gap: spacing.sm }}>
          <Button
            variant="success"
            label={salvando ? 'Salvando...' : 'Salvar'}
            onPress={onSalvar}
            disabled={salvando}
          />
          <Button
            variant="ghost"
            label="Cancelar"
            onPress={onCancelar}
            disabled={salvando}
          />
        </View>
      </ScrollView>
    </View>
  );
}
