// Inferencia do autor padrao para registro de ciclo menstrual
// (sprint I-CICLO, M-SAVE-CICLO-VALIDA, 2026-05-07).
//
// Funcao pura, sem side effects. Recebe tipoCompanhia + sexoDeclarado
// das duas pessoas (do store useOnboarding pos J1) e devolve o autor
// pre-selecionado para o form Tela 20.5b (CicloRegistrar).
//
// Regras:
//   - sozinho: pessoa_a se sexo for feminino ou nao-binario; senao
//     null (homem solo nao registra ciclo, item escondido no menu).
//     'nao-binario' conta como elegivel para inferencia em solo
//     respeitando autonomia do usuario (decisao do spec secao 7).
//   - casal/amigos: se exatamente uma das pessoas for feminina,
//     infere essa pessoa. Se as duas forem femininas (mae e filha,
//     casal lesbico), retorna null - ambigua, caller mostra seletor
//     manual. Idem se nenhuma for feminina (caso esteja registrando
//     por outra razao via override manual).
//
// Quando retorna null, a UI deve mostrar seletor explicito; quando
// devolve um autor, a UI pre-seleciona mas permite trocar.
//
// 'nao-binario' nao infere automaticamente em casal/amigos: o caso
// e' ambiguo demais sem mais sinal explicito do usuario (poderia ser
// trans masculino que registra, poderia ser pessoa nao-bin que nao
// menstrua); melhor pedir confirmacao.
//
// Comentarios sem acento (convencao shell/CI).
import type { SexoDeclarado, TipoCompanhia } from '@/lib/stores/onboarding';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

export function autorPadrao(
  tipoCompanhia: TipoCompanhia,
  sexoA: SexoDeclarado,
  sexoB: SexoDeclarado
): PessoaAutor | null {
  if (tipoCompanhia === 'sozinho') {
    if (sexoA === 'feminino' || sexoA === 'nao-binario') {
      return 'pessoa_a';
    }
    return null;
  }
  if (tipoCompanhia === 'casal' || tipoCompanhia === 'amigos') {
    const femA = sexoA === 'feminino';
    const femB = sexoB === 'feminino';
    if (femA && !femB) return 'pessoa_a';
    if (femB && !femA) return 'pessoa_b';
    // Ambas femininas OU nenhuma: pede selecao manual.
    return null;
  }
  return null;
}

// Heuristica de visibilidade do item "Ciclo" no menu lateral. Esconde
// quando ambos sao explicitamente masculinos. Em qualquer outro caso
// (pelo menos uma pessoa feminina, nao-binaria, prefere-nao-dizer ou
// null), o item permanece visivel - autonomia do usuario decide
// registrar mesmo sem inferencia automatica.
export function deveMostrarItemCiclo(
  sexoA: SexoDeclarado,
  sexoB: SexoDeclarado
): boolean {
  return !(sexoA === 'masculino' && sexoB === 'masculino');
}
