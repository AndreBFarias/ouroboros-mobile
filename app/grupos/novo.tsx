// Q19.b -- Tela de criacao de Grupo de Treino. Reusa FormGrupo +
// orquestra slug unico + persiste via escreverGrupo. Pos-salvar:
// router.replace pra /grupos/<slug> -- mesmo padrao de /rotinas/novo.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { Header, Screen, useToast } from '@/components/ui';
import { FormGrupo, type FormGrupoSubmit } from '@/components/treino/FormGrupo';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { escreverGrupo, listarGrupos } from '@/lib/vault/grupo_treino';
import { slugifyTitulo, sufixoRandom } from '@/lib/schemas/tarefa';
import {
  GrupoTreinoSchema,
  type GrupoTreino,
} from '@/lib/schemas/grupo_treino';
import { formatDateYmd } from '@/lib/vault/paths';
import { comTimeout } from '@/lib/util/comTimeout';

async function resolverSlugUnico(
  vaultRoot: string,
  autor: 'pessoa_a' | 'pessoa_b',
  base: string
): Promise<string | null> {
  const existentes = await listarGrupos(vaultRoot, autor);
  const usados = new Set(existentes.map((g) => g.slug));
  if (!usados.has(base)) return base;
  for (let i = 0; i < 50; i++) {
    const candidato = `${base}-${sufixoRandom()}`;
    if (!usados.has(candidato)) return candidato;
  }
  return null;
}

export default function GruposNovo() {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const toast = useToast();
  const [salvando, setSalvando] = useState<boolean>(false);

  const handleSubmit = useCallback(
    async (dados: FormGrupoSubmit) => {
      if (!vaultRoot || salvando) return;
      setSalvando(true);
      try {
        const base = slugifyTitulo(dados.nome);
        if (base.length === 0 || base === 'tarefa') {
          toast.show('Nome inválido para slug.', 'error');
          return;
        }
        const slug = await comTimeout(
          resolverSlugUnico(vaultRoot, pessoaAtiva, base)
        );
        if (!slug) {
          toast.show('Não foi possível salvar: slug em uso.', 'error');
          return;
        }

        const proposto: GrupoTreino = {
          tipo: 'grupo_treino',
          slug,
          nome: dados.nome,
          descricao: dados.descricao,
          rotina_slugs: dados.rotina_slugs,
          data_criacao: formatDateYmd(new Date()),
          autor: pessoaAtiva,
        };

        const parsed = GrupoTreinoSchema.safeParse(proposto);
        if (!parsed.success) {
          toast.show('Dados inválidos.', 'error');
          return;
        }

        await comTimeout(escreverGrupo(vaultRoot, parsed.data));
        void haptics.light();
        toast.show('Grupo criado.', 'success');
        router.replace({
          pathname: '/grupos/[slug]',
          params: { slug },
        });
      } catch (e) {
        void haptics.error();
        const msg = e instanceof Error ? e.message : String(e);
        toast.show(`Não foi possível salvar: ${msg}`, 'error');
      } finally {
        setSalvando(false);
      }
    },
    [vaultRoot, pessoaAtiva, salvando, toast, router]
  );

  return (
    <Screen>
      <Header title="Novo grupo" onBack={() => router.back()} />
      <FormGrupo
        onSubmit={handleSubmit}
        onCancelar={() => router.back()}
        rotuloSalvar="Salvar"
        salvando={salvando}
      />
    </Screen>
  );
}
