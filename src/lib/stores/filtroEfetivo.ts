// Selector centralizado do "filtro de pessoa efetivo". Combina o
// filtroPessoa do store usePessoa (que aceita 'ambos') com o flag
// pessoa.vaultCompartilhado de useSettings.
//
// Comportamento:
//   - vaultCompartilhado=true (default): respeita filtroPessoa
//     integralmente, incluindo 'ambos'. UX original.
//   - vaultCompartilhado=false: cada pessoa só vê seus próprios
//     registros. O selector força o retorno para a pessoa ativa,
//     ignorando 'ambos' mesmo se o store ainda guarde esse valor.
//
// Esta camada centraliza a privacidade no nível do dado: hooks de
// listagem (useHoje, useTreinos, useMarcos, useConquistas,
// useFotosAgregadas) e telas de visualização (MiniHumorScreen)
// consultam o efetivo em vez do bruto. Isolar aqui evita que cada
// consumer precise duplicar a lógica e elimina o risco de um
// caminho esquecer o gate.
import { useSettings } from '@/lib/stores/settings';
import { usePessoa } from '@/lib/stores/pessoa';
import type { PessoaId } from '@/lib/schemas/pessoa';

// Hook reativo para uso em componentes/hooks. Re-renderiza quando
// qualquer um dos três ingredientes muda.
export function useFiltroPessoaEfetivo(): PessoaId {
  const filtroBase = usePessoa((s) => s.filtroPessoa);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const vaultCompartilhado = useSettings(
    (s) => s.pessoa.vaultCompartilhado
  );
  if (!vaultCompartilhado) return pessoaAtiva;
  return filtroBase;
}

// Versão snapshot para uso fora de React (loaders, scripts, services).
// Lê getState() das duas stores na hora da chamada.
export function getFiltroPessoaEfetivo(): PessoaId {
  const { filtroPessoa, pessoaAtiva } = usePessoa.getState();
  const { pessoa } = useSettings.getState();
  if (!pessoa.vaultCompartilhado) return pessoaAtiva;
  return filtroPessoa;
}

// Indica se a UI deve oferecer opção 'ambos'/'sobreposto' nos chips.
// FiltrosBar e MiniHumorScreen consomem para esconder a opção quando
// o usuário optou por privacidade.
export function useVaultCompartilhado(): boolean {
  return useSettings((s) => s.pessoa.vaultCompartilhado);
}
