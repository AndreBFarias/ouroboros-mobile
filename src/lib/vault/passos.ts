// Writer canonico de passos diarios no Vault. Cada chamada de
// escreverPassos persiste markdown/passos-YYYY-MM-DD.md com o total
// agregado da data, fonte_hc=true e timestamp da sync.
// R-INT-3-HC-AUTOPULL-PASSOS (2026-05-22).
//
// Diferente do writer de medidas (que pode receber peso/cintura/
// gordura), o de passos so' tem um numero: total. Por isso a
// assinatura e mais simples — caller passa data (string YYYY-MM-DD),
// total (int >=0) e autor (pessoa_a / pessoa_b).
//
// Idempotencia: chamar 2x sobre a mesma data regrava o arquivo. Como
// o agregado por dia e estavel apos o dia ter encerrado, o conteudo
// vai bater entre execucoes. O puxador upstream so chama esta funcao
// para dias com endTime < startOfTodayLocal, garantindo que o
// agregado nao mude depois.
//
// Sync HC NAO acontece aqui (este writer e somente para o Vault).
// Steps writes para HC nao fazem sentido nesta direcao (HC e' a
// fonte, nao o destino). Diferente de medidas (peso/gordura) que
// fazem write opt-in via escreverPesoEmHC / escreverBodyFatEmHC.
//
// Comentarios sem acento (convencao shell/CI).
import { passosPath } from '@/lib/vault/paths';
import { writeVaultFile } from '@/lib/vault/writer';
import { PassosSchema, type Passos } from '@/lib/schemas/passos';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Persiste um registro de passos diarios no Vault.
// `data` em YYYY-MM-DD (caller agrega por dia local).
// `total` int >=0 (caller soma todos os StepsRecord do dia).
// `autor` pessoa_a / pessoa_b (caller le de useSettings.pessoa.ativa).
// `sincronizadoEm` ISO 8601 (caller passa Date.now ISO; default
// new Date().toISOString() se omitido — util pra cenarios sem
// controle fino de relogio).
//
// Retorna { uri, rel } pra rastreamento (testes e logs).
export async function escreverPassos(
  vaultRoot: string,
  data: string,
  total: number,
  autor: PessoaAutor,
  sincronizadoEm?: string
): Promise<{ uri: string; rel: string }> {
  const meta: Passos = {
    tipo: 'passos',
    data,
    autor,
    total,
    fonte_hc: true,
    sincronizado_em: sincronizadoEm ?? new Date().toISOString(),
  };
  const parsed = PassosSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`passos invalido: ${parsed.error.message}`);
  }
  // Constroi Date no meio do dia UTC para evitar shift de timezone
  // (mesma estrategia que escreverMedida usa). YYYY-MM-DDT12:00:00Z
  // resolve para o mesmo dia em BRT (UTC-3) e UTC+12, faixa segura
  // pra todos os fusos habitados.
  const dataDate = new Date(`${parsed.data.data}T12:00:00Z`);
  const rel = passosPath(dataDate);
  const uri = joinUri(vaultRoot, rel);
  await writeVaultFile<Passos>(uri, parsed.data, '');
  return { uri, rel };
}
