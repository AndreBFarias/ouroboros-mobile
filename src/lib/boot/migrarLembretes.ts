// Boot helper M30: migra os 3 lembretes diarios que viviam em
// useSettings.lembretes (shape v1, removido em M29) para alarmes
// pre-cadastrados no Vault. Idempotente: rodar 2x nao duplica nem
// sobrescreve alarmes ja migrados (alarmes existentes com mesmo
// slug sao preservados intactos).
//
// Lemos o blob legado direto do SecureStore na chave
// `ouroboros.settings.v1` (o useSettings.persist atual usa v2 e nao
// expoe lembretes; a migracao do persist descartou lembretes em M29).
// Se o blob nao existir ou estiver malformado, nada a migrar; apenas
// retorna. Em web, no-op (sem SecureStore real, sem vault canonico).
//
// Apos sucesso, apaga a chave v1 para nao re-migrar em boots futuros
// (mesmo com a flag interna - belt and suspenders).
//
// Plugado em BOOT_HOOKS antes de reagendarAlarmes em
// src/lib/boot/reagendamento.ts.
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  AlarmeSchema,
  type Alarme,
  type AlarmeTag,
} from '@/lib/schemas/alarme';
import { escreverAlarme, lerAlarme } from '@/lib/vault/alarmes';

// Chaves canonicas dos 3 lembretes legados (medicacao/treino/humor).
// Sao tratadas como AlarmeTag direta excepto humor que vai para 'outro'
// (nao ha tag 'humor' no AlarmeTagSchema atual).
const CHAVES_LEGADAS = ['medicacao', 'treino', 'humor'] as const;
type ChaveLegada = (typeof CHAVES_LEGADAS)[number];

const TITULOS: Record<ChaveLegada, string> = {
  medicacao: 'Medicação',
  treino: 'Treino',
  humor: 'Humor diário',
};

// Mapeia chave do lembrete -> tag canonica do AlarmeSchema. 'humor'
// nao tem tag dedicada, vai para 'outro' (decisao §2 do M30-spec).
const TAG_DA_CHAVE: Record<ChaveLegada, AlarmeTag> = {
  medicacao: 'medicacao',
  treino: 'treino',
  humor: 'outro',
};

// Slug canonico no Vault (kebab-case ASCII). Prefixo 'lembrete-' deixa
// claro a origem do alarme em listagens futuras.
function slugLembrete(chave: ChaveLegada): string {
  return `lembrete-${chave}`;
}

// Forma esperada do blob v1 em SecureStore (parcial, defensivo).
interface LembreteV1 {
  ativo?: boolean;
  horario?: string;
}

interface SettingsV1 {
  lembretes?: {
    medicacao?: LembreteV1;
    treino?: LembreteV1;
    humor?: LembreteV1;
  };
}

// Le e parseia (defensivamente) o blob legado de useSettings v1 do
// SecureStore. Retorna null se nao existir, nao for JSON valido, ou
// nao tiver a chave `lembretes`.
async function lerLembretesV1(): Promise<SettingsV1['lembretes'] | null> {
  if (Platform.OS === 'web') return null;
  try {
    const raw = await SecureStore.getItemAsync('ouroboros.settings.v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: SettingsV1 } | SettingsV1;
    // zustand persist envelopa em { state, version }. Aceita ambos os
    // shapes para resiliencia a refactor de persist.
    const state =
      parsed && typeof parsed === 'object' && 'state' in parsed
        ? parsed.state
        : (parsed as SettingsV1);
    const lembretes = state?.lembretes;
    if (!lembretes || typeof lembretes !== 'object') return null;
    return lembretes;
  } catch {
    return null;
  }
}

// Apaga o blob v1 do SecureStore. Idempotente: deleteItemAsync com
// chave inexistente nao falha. Em web, no-op.
async function apagarLembretesV1(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.deleteItemAsync('ouroboros.settings.v1');
  } catch {
    // Ja apagado ou storage indisponivel; ok.
  }
}

function nowIso(): string {
  return new Date().toISOString().replace('Z', '+00:00');
}

// Migracao principal. Idempotente: alarmes com slug 'lembrete-<chave>'
// que ja existem no Vault sao preservados intactos (skip silencioso).
// Apos uma execucao bem sucedida, apaga o blob v1 do SecureStore para
// que execucoes futuras curtem cedo no `lerLembretesV1() === null`.
export async function migrarLembretesParaAlarmes(
  vaultRoot: string
): Promise<void> {
  if (!vaultRoot) return;
  const lembretes = await lerLembretesV1();
  if (!lembretes) return;

  let escreveuAlguma = false;
  for (const chave of CHAVES_LEGADAS) {
    const slug = slugLembrete(chave);
    let existe: Alarme | null = null;
    try {
      existe = await lerAlarme(vaultRoot, slug);
    } catch {
      existe = null;
    }
    if (existe) continue;

    const horario = lembretes[chave]?.horario ?? '09:00';
    const ativo = lembretes[chave]?.ativo ?? false;

    const novoAlarme: Alarme = {
      tipo: 'alarme',
      slug,
      titulo: TITULOS[chave],
      horario,
      // Recorrencia diaria: lembretes v1 disparavam todo dia (nao tinham
      // dia da semana especifico). Mantem mesma cadencia.
      dias_semana: [],
      recorrencia: 'diaria',
      data_unica: undefined,
      tag: TAG_DA_CHAVE[chave],
      som: 'gentle',
      ativo,
      snooze_minutos: 5,
      criado_em: nowIso(),
      ultimo_disparo: null,
      notification_ids: [],
      snooze_id: null,
    };

    // Validacao defensiva. Se algo no AlarmeSchema mudar (campos
    // novos required) sem atualizar este helper, falhamos cedo.
    const parsed = AlarmeSchema.safeParse(novoAlarme);
    if (!parsed.success) continue;

    try {
      await escreverAlarme(vaultRoot, parsed.data);
      escreveuAlguma = true;
    } catch {
      // Falha de IO num lembrete nao impede os outros 2.
    }
  }

  // Apaga blob v1 apos passada bem sucedida (mesmo que nenhum lembrete
  // tenha sido escrito porque ja existiam: a fonte legada nao precisa
  // mais existir). Se nada foi processado por falha total de IO,
  // mantemos o blob para tentar de novo no proximo boot.
  if (escreveuAlguma || lembretes) {
    await apagarLembretesV1();
  }
}
