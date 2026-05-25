// Schema do arquivo markdown/sono-YYYY-MM-DD-hc-<id>.md (uma sessao de
// sono, derivada de SleepSessionRecord do Health Connect).
// R-INT-3-HC-AUTOPULL-SLEEP (2026-05-25).
//
// Cada arquivo representa UMA sessao de sono completa (ao contrario de
// passos, que agrega por dia). O `data` e o dia do despertar (endTime
// no fuso de São Paulo, UTC-3 fixo). Sem analytics de ciclos REM/
// profundo nesta v1 — so duracao + horario de inicio/fim, suficiente
// para o Recap.
//
// Escrito pelo puxador `puxadorSono` em src/lib/health/puxadores/sleep.ts,
// que le SleepSession do HC dentro da janela de sync.
//
// Idempotencia: o puxador pula sessoes ja persistidas checando o slug
// sono-<data>-hc-<id> antes de escrever (HC nao deduplica; a chave
// estavel e metadata.id, gravado em fonte_hc_id). Diferente de passos,
// que regrava o agregado do dia, aqui a sessao e imutavel uma vez
// persistida.
//
// Convencoes do projeto:
//  - data em YYYY-MM-DD (dia do despertar, sem hora).
//  - autor sempre 'pessoa_a' ou 'pessoa_b' (lido de
//    useSettings.getState().pessoa.ativa em runtime). Familia
//    (vaultCompartilhado=true) nao gera duplicacao: o autor e a pessoa
//    que dispara a sync naquele momento.
//  - inicio/fim em ISO 8601 com offset (instante exato da sessao).
//  - duracao_min int positivo (calculado pelo puxador: (fim-inicio)/60000).
//  - fonte_hc_id / fonte_hc_origin opcionais (metadata.id e packageName
//    do wearable; ausentes em entrada manual futura).
//  - Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import { PessoaAutorSchema } from '@/lib/schemas/pessoa';

// Data YYYY-MM-DD (dia do despertar; sem hora). Mesmo padrao usado por
// medidas/humor/passos/ciclo.
const DataYmd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve estar em YYYY-MM-DD');

// ISO datetime com offset (ex: 2026-05-22T07:32:00-03:00) ou Z. Mesmo
// regex usado em passos/contador/evento_contador.
const IsoDatetime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/,
    'datetime deve estar em ISO 8601 com offset'
  );

export const SonoSchema = z.object({
  tipo: z.literal('sono'),
  data: DataYmd,
  autor: PessoaAutorSchema,
  inicio: IsoDatetime,
  fim: IsoDatetime,
  // Duracao da sessao em minutos. Limite superior defensivo (1440 = 24h)
  // protege contra leitura corrompida do HC ou sessao com endTime
  // disparatado. Int positivo: uma sessao de sono registrada tem ao
  // menos 1 minuto.
  duracao_min: z.number().int().positive().max(1440),
  // metadata.id da SleepSession no HC. Chave estavel pra idempotencia.
  // Opcional para preparar futura entrada manual (sem origem HC).
  fonte_hc_id: z.string().optional(),
  // dataOrigin.packageName do wearable (ex: 'com.samsung.health').
  // Opcional; nem todo provider preenche.
  fonte_hc_origin: z.string().optional(),
});
export type Sono = z.infer<typeof SonoSchema>;
