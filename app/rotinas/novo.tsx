// Tela de criacao de Rotina de Treino (Q11.a). Reusa FormRotina e
// orquestra: slugifica o nome, garante unicidade do slug com sufixo
// random quando colide, monta RotinaMeta e persiste via escreverRotina.
//
// Pos-Salvar: toast "Rotina criada." + router.replace para o detalhe
// (/rotinas/<slug>) -- permite edicao imediata como o spec pede.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { Header, Screen, useToast } from '@/components/ui';
import { FormRotina, type FormRotinaSubmit } from '@/components/treino/FormRotina';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import {
  escreverRotina,
  listarRotinas,
} from '@/lib/vault/rotina';
import { slugifyTitulo, sufixoRandom } from '@/lib/schemas/tarefa';
import { RotinaSchema, type RotinaMeta } from '@/lib/schemas/rotina';
import { formatDateYmd } from '@/lib/vault/paths';
import { comTimeout } from '@/lib/util/comTimeout';

// Garante slug unico contra rotinas existentes do mesmo autor.
// Adiciona sufixo random quando colide; loop limitado a 50 tentativas.
async function resolverSlugUnico(
  vaultRoot: string,
  autor: 'pessoa_a' | 'pessoa_b',
  base: string
): Promise<string | null> {
  const existentes = await listarRotinas(vaultRoot, autor);
  const usados = new Set(existentes.map((r) => r.slug));
  if (!usados.has(base)) return base;
  for (let i = 0; i < 50; i++) {
    const candidato = `${base}-${sufixoRandom()}`;
    if (!usados.has(candidato)) return candidato;
  }
  return null;
}

export default function RotinasNovo() {
  const router = useRouter();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const toast = useToast();
  const [salvando, setSalvando] = useState<boolean>(false);

  const handleSubmit = useCallback(
    async (dados: FormRotinaSubmit) => {
      if (!vaultRoot || salvando) return;
      setSalvando(true);
      try {
        const base = slugifyTitulo(dados.nome);
        if (base.length === 0 || base === 'tarefa') {
          // slugifyTitulo retorna 'tarefa' como fallback quando o titulo
          // so tinha simbolos -- inadequado para rotina. Reusamos o
          // helper porque ele cuida de acentos/case/comprimento, mas
          // bloqueamos esse fallback explicitamente.
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

        const proposto: RotinaMeta = {
          tipo: 'rotina_treino',
          slug,
          nome: dados.nome,
          descricao: dados.descricao,
          exercicios: dados.exercicios,
          data_criacao: formatDateYmd(new Date()),
          autor: pessoaAtiva,
        };

        const parsed = RotinaSchema.safeParse(proposto);
        if (!parsed.success) {
          toast.show('Dados inválidos.', 'error');
          return;
        }

        await comTimeout(escreverRotina(vaultRoot, parsed.data));
        void haptics.light();
        toast.show('Rotina criada.', 'success');
        router.replace({
          pathname: '/rotinas/[slug]',
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
      <Header title="Nova rotina" onBack={() => router.back()} />
      <FormRotina
        onSubmit={handleSubmit}
        onCancelar={() => router.back()}
        rotuloSalvar="Salvar"
        salvando={salvando}
      />
    </Screen>
  );
}
