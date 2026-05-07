// M38 -- index de dispositivos pareados (Syncthing 4 nos).
//
// Arquivo canonico: 'markdown/_devices.md' no Vault (ADR-0023, sprint
// H2: layout-por-tipo). Caller concatena com vaultRoot via vaultUriJoin
// (trim agressivo de trailing whitespace + %20 contra URIs SAF
// corruptas). Formato:
//
//   ---
//   tipo: devices_index
//   registro:
//     ouro-abc123:
//       nome_amigavel: dispositivo-1
//       pessoa: pessoa_a
//       primeira_atividade: 2026-05-04T09:00:00-03:00
//       ultima_atividade: 2026-05-04T18:30:00-03:00
//       substituido_por: null
//     ouro-def456:
//       nome_amigavel: dispositivo-2
//       pessoa: pessoa_b
//       primeira_atividade: 2026-05-02T07:15:00-03:00
//       ultima_atividade: 2026-05-04T20:00:00-03:00
//       substituido_por: null
//   ---
//
// Conflict resolution natural via Syncthing: cada subkey de 'registro'
// e last-write-wins por timestamp, e o conteudo do _devices.md em si
// pode receber suffixo '-<deviceId>' como qualquer outro arquivo se
// houver edicao simultanea no mesmo segundo. Convergencia eventual.
//
// Resilience contra SecureStore zerado (uninstall+reinstall sem backup):
//  atualizarDeviceIndex detecta entrada antiga com mesma 'pessoa' e
//  deviceId diferente do atual, marca antigo com 'substituido_por:
//  <novoId>' (UI de Settings mostra como inativo).
//
// Comentarios sem acento.
import { z } from 'zod';
import { vaultUriJoin, devicesIndexPath } from '@/lib/vault/paths';
import { readVaultFile } from '@/lib/vault/reader';
import { writeVaultFile } from '@/lib/vault/writer';
import { getDeviceId } from '@/lib/util/deviceId';
import { usePessoa } from '@/lib/stores/pessoa';
import { useVault } from '@/lib/stores/vault';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

// Schema de cada registro de dispositivo dentro do index. PessoaAutor
// e 'pessoa_a' | 'pessoa_b' (nunca 'ambos' aqui -- cada device pertence
// a uma pessoa especifica, mesmo se Vault e compartilhado).
export const DispositivoRegistroSchema = z.object({
  nome_amigavel: z.string().min(1).max(80),
  pessoa: z.enum(['pessoa_a', 'pessoa_b']),
  primeira_atividade: z.string(),
  ultima_atividade: z.string(),
  substituido_por: z.string().nullable().default(null),
});

export type DispositivoRegistro = z.infer<typeof DispositivoRegistroSchema>;

export const DevicesIndexSchema = z.object({
  tipo: z.literal('devices_index'),
  registro: z.record(z.string(), DispositivoRegistroSchema),
});

export type DevicesIndex = z.infer<typeof DevicesIndexSchema>;

// Le o devices index do Vault. Devolve { registro: {} } se o arquivo
// nao existir ainda. Idempotente.
export async function lerDevicesIndex(
  vaultRoot: string
): Promise<DevicesIndex> {
  const uri = vaultUriJoin(vaultRoot, devicesIndexPath());
  try {
    const result = await readVaultFile(uri, DevicesIndexSchema);
    if (result) return result.meta;
  } catch {
    // Frontmatter ausente ou schema invalido: trata como index vazio.
  }
  return { tipo: 'devices_index', registro: {} };
}

// Escreve o devices index no Vault. Caller fornece index ja validado
// (revalidamos defensivamente). Body fica vazio.
export async function escreverDevicesIndex(
  vaultRoot: string,
  index: DevicesIndex
): Promise<void> {
  const parsed = DevicesIndexSchema.safeParse(index);
  if (!parsed.success) {
    throw new Error(`devices index invalido: ${parsed.error.message}`);
  }
  const uri = vaultUriJoin(vaultRoot, devicesIndexPath());
  await writeVaultFile<DevicesIndex>(uri, parsed.data, '');
}

// Atualiza o registro do dispositivo atual no index:
//  - Se nao havia entrada para este deviceId: cria (nome_amigavel default
//    'dispositivo-<N>' onde N = quantidade atual + 1).
//  - Se ja havia: so atualiza ultima_atividade.
//  - Resilience: se houver outro deviceId com mesma pessoa e ainda nao
//    substituido_por, marca ele com substituido_por = deviceId atual
//    (heuristica: SecureStore zerado regenerou id; antigo provavelmente
//    nao existe mais como instalacao viva). So marca quando o dispositivo
//    atual e novo no index (primeira atividade).
//
// Idempotente: roda no boot toda vez sem efeitos colaterais alem da
// atualizacao de ultima_atividade.
export async function atualizarDeviceIndex(): Promise<void> {
  const vaultRoot = useVault.getState().vaultRoot;
  if (!vaultRoot) return;

  const deviceId = await getDeviceId();
  const pessoaAtiva = usePessoa.getState().pessoaAtiva;
  // pessoaAtiva pode ser null durante onboarding muito cedo; fallback
  // conservador para 'pessoa_a' para nao bloquear o hook.
  const pessoa: PessoaAutor =
    pessoaAtiva === 'pessoa_b' ? 'pessoa_b' : 'pessoa_a';

  const index = await lerDevicesIndex(vaultRoot);
  const agoraIso = new Date().toISOString();
  const existente = index.registro[deviceId];

  if (existente) {
    // Update so de ultima_atividade.
    const novoRegistro: Record<string, DispositivoRegistro> = {
      ...index.registro,
      [deviceId]: {
        ...existente,
        ultima_atividade: agoraIso,
      },
    };
    await escreverDevicesIndex(vaultRoot, {
      tipo: 'devices_index',
      registro: novoRegistro,
    });
    return;
  }

  // Primeira atividade deste deviceId. Marca antigos com mesma pessoa
  // como substituido_por (heuristica de reinstall).
  const novoRegistro: Record<string, DispositivoRegistro> = {};
  for (const [id, reg] of Object.entries(index.registro)) {
    if (reg.pessoa === pessoa && reg.substituido_por === null) {
      novoRegistro[id] = { ...reg, substituido_por: deviceId };
    } else {
      novoRegistro[id] = reg;
    }
  }
  // Conta dispositivos ativos da mesma pessoa para gerar nome default.
  const ativosMesmaPessoa = Object.values(novoRegistro).filter(
    (r) => r.pessoa === pessoa && r.substituido_por === null
  ).length;
  novoRegistro[deviceId] = {
    nome_amigavel: `dispositivo-${ativosMesmaPessoa + 1}`,
    pessoa,
    primeira_atividade: agoraIso,
    ultima_atividade: agoraIso,
    substituido_por: null,
  };

  await escreverDevicesIndex(vaultRoot, {
    tipo: 'devices_index',
    registro: novoRegistro,
  });
}

// Renomeia um dispositivo no index. Usado pela sub-tela de Settings
// (M38 spec entregavel app/settings/dispositivos.tsx). Mantem demais
// campos intactos. Idempotente: nome igual nao escreve.
export async function renomearDispositivo(
  vaultRoot: string,
  deviceId: string,
  novoNome: string
): Promise<void> {
  const nome = novoNome.trim();
  if (nome.length === 0) {
    throw new Error('nome amigavel nao pode ser vazio');
  }
  if (nome.length > 80) {
    throw new Error('nome amigavel muito longo (max 80)');
  }
  const index = await lerDevicesIndex(vaultRoot);
  const reg = index.registro[deviceId];
  if (!reg) {
    throw new Error(`dispositivo nao encontrado: ${deviceId}`);
  }
  if (reg.nome_amigavel === nome) return;
  await escreverDevicesIndex(vaultRoot, {
    tipo: 'devices_index',
    registro: {
      ...index.registro,
      [deviceId]: { ...reg, nome_amigavel: nome },
    },
  });
}
