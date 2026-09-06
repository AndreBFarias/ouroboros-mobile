// Exclusao de arquivo .md do Vault. Primitiva canonica: todo caminho
// de remocao passa por deleteVaultFile, e nenhum modulo chama
// StorageAccessFramework.deleteAsync direto.
//
// AUDIT-INFRA-VAULT-MOCK-DELETE (2026-09-05): antes desta sprint o
// mock web/dev do Gauntlet cobria leitura (reader.ts) e escrita
// (writer.ts), mas nao exclusao -- os onze modulos que apagam arquivo
// chamavam o SAF direto. Em web o SAF nao existe no DOM, a chamada
// lancava UnavailabilityError, o catch local do caller engolia, e o
// arquivo permanecia no mapa do mock para sempre. Consequencia: no
// Gauntlet nenhuma remocao era observavel, e casos E2E escritos para
// provar "o item sumiu" estavam estruturalmente impedidos.
//
// DECISAO (item 4 da spec, que mandava avaliar writer.ts vs modulo
// proprio): deleteVaultFile nasce AQUI, nao em writer.ts. Motivo
// medido no repo, nao preferencia: 26 suites mockam
// '@/lib/vault/writer' com apenas { writeVaultFile }, e os modulos que
// adotam esta primitiva sao cobertos justamente por essas suites. Em
// writer.ts, deleteVaultFile chegaria undefined nelas e quebraria na
// chamada. E o mesmo argumento que leituraLote.ts:10-16 registra para
// readVaultFiles morar fora de reader.ts. Num modulo proprio nenhuma
// suite mocka este arquivo: deleteVaultFile delega ao
// StorageAccessFramework que elas ja mockam, entao os asserts
// existentes sobre deleteAsync seguem valendo verbatim.
//
// Semantica preservada dos call sites: lanca o que o SAF lancar. Quem
// tolera ausencia ja tem try/catch proprio -- nao e esta sprint que
// muda isso.
//
// NAO cobre binarios (jpg, m4a, mp4, pdf): o mock guarda
// Map<string, string> de conteudo textual e midia no Gauntlet tem
// mocks proprios (adicionarFotoMock e afins).
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { useVaultMock } from '@/lib/dev/vaultMockStore';

export async function deleteVaultFile(uri: string): Promise<void> {
  if (Platform.OS === 'web' && __DEV__) {
    // Branch web/dev: remove do mock store. Em mobile-release esse
    // branch e dead-code (Platform.OS !== 'web'). Idempotente: apagar
    // uri ausente nao lanca -- o retorno booleano de apagarArquivo e
    // descartado de proposito para nao criar assimetria com o SAF, que
    // tambem nao informa se havia arquivo.
    useVaultMock.getState().apagarArquivo(uri);
    return;
  }
  await StorageAccessFramework.deleteAsync(uri);
}

// Move um .md do Vault para a lixeira local: le o conteudo original,
// regrava no destino e apaga a origem. Quatro modulos (exercicios,
// marcos, tarefas, treinos) repetiam este bloco verbatim, com o mesmo
// try/catch e a mesma mensagem de erro.
//
// Existe porque `deleteVaultFile` sozinho nao bastou. Nesses quatro o
// delete e a TERCEIRA linha de um try que comeca em
// `StorageAccessFramework.readAsStringAsync` -- sem branch de mock. Em
// web a leitura lancava antes, o catch convertia em "falha ao mover
// para lixeira", e a exclusao nunca acontecia. Ou seja, a assimetria
// que a sprint veio corrigir seguia de pe nesses call sites, uma linha
// acima do ponto corrigido: 7 dos 11 ficavam observaveis no Gauntlet,
// nao 11.
//
// Semantica preservada: lanca `falha ao mover para lixeira: <motivo>`,
// exatamente como os quatro blocos que substitui. Em web/dev as tres
// etapas acontecem no mock, entao a remocao passa a ser observavel.
export async function moverArquivoParaLixeira(
  origemUri: string,
  lixeiraPath: string
): Promise<void> {
  try {
    if (Platform.OS === 'web' && __DEV__) {
      const conteudo = useVaultMock.getState().getArquivo(origemUri);
      if (conteudo === undefined) {
        // Simetria com o SAF, que lanca ao ler arquivo ausente.
        throw new Error(`arquivo ausente no Vault mock: ${origemUri}`);
      }
      useVaultMock.getState().setArquivo(lixeiraPath, conteudo);
      useVaultMock.getState().apagarArquivo(origemUri);
      return;
    }
    const raw = await StorageAccessFramework.readAsStringAsync(origemUri);
    await FileSystem.writeAsStringAsync(lixeiraPath, raw);
    await StorageAccessFramework.deleteAsync(origemUri);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`falha ao mover para lixeira: ${msg}`);
  }
}
