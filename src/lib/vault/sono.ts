// Writer canonico de sessao de sono no Vault. Cada chamada de
// escreverSono persiste markdown/sono-YYYY-MM-DD-hc-<id>.md com os
// horarios de inicio/fim, duracao e origem HC.
// R-INT-3-HC-AUTOPULL-SLEEP (2026-05-25).
//
// Diferente do writer de passos (agregado por dia, regrava on-call), o
// de sono escreve UMA sessao por arquivo, chaveada por fonte_hc_id. O
// puxador upstream filtra sessoes ja persistidas antes de chamar este
// writer, garantindo idempotencia (o arquivo nunca e reescrito se ja
// existe com o mesmo hc id).
//
// Sync HC NAO acontece aqui (este writer e somente para o Vault). HC e
// a fonte do sono, nao o destino — wearables escrevem SleepSession, o
// app so le.
//
// Comentarios sem acento (convencao shell/CI).
import { sonoPath } from '@/lib/vault/paths';
import { writeVaultFile } from '@/lib/vault/writer';
import { SonoSchema, type Sono } from '@/lib/schemas/sono';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Dados de uma sessao de sono que o caller (puxador) monta a partir do
// SleepSessionRecord. `data` em YYYY-MM-DD ja calculado (dia do
// despertar no fuso local).
export interface DadosSono {
  data: string;
  autor: PessoaAutor;
  inicio: string;
  fim: string;
  duracao_min: number;
  fonte_hc_id?: string;
  fonte_hc_origin?: string;
}

// Persiste uma sessao de sono no Vault. O path embute data + hc id
// (sono-YYYY-MM-DD-hc-<id>.md). Caller deve checar idempotencia antes
// (pular sessao ja existente) — este writer regrava se chamado de novo.
//
// Retorna { uri, rel } pra rastreamento (testes e logs).
export async function escreverSono(
  vaultRoot: string,
  dados: DadosSono
): Promise<{ uri: string; rel: string }> {
  const meta: Sono = {
    tipo: 'sono',
    data: dados.data,
    autor: dados.autor,
    inicio: dados.inicio,
    fim: dados.fim,
    duracao_min: dados.duracao_min,
    ...(dados.fonte_hc_id !== undefined
      ? { fonte_hc_id: dados.fonte_hc_id }
      : {}),
    ...(dados.fonte_hc_origin !== undefined
      ? { fonte_hc_origin: dados.fonte_hc_origin }
      : {}),
  };
  const parsed = SonoSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`sono invalido: ${parsed.error.message}`);
  }
  // Constroi Date no meio do dia UTC para evitar shift de timezone no
  // path (mesma estrategia que escreverPassos/escreverMedida).
  // YYYY-MM-DDT12:00:00Z resolve para o mesmo dia em BRT (UTC-3).
  const dataDate = new Date(`${parsed.data.data}T12:00:00Z`);
  // hc id pode vir vazio (entrada manual futura); usa fallback estavel
  // derivado de inicio para nao colidir.
  const idParaPath =
    typeof parsed.data.fonte_hc_id === 'string' &&
    parsed.data.fonte_hc_id.length > 0
      ? parsed.data.fonte_hc_id
      : `manual-${parsed.data.inicio}`;
  const rel = sonoPath(dataDate, idParaPath);
  const uri = joinUri(vaultRoot, rel);
  await writeVaultFile<Sono>(uri, parsed.data, '');
  return { uri, rel };
}
