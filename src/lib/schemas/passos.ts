// Schema do arquivo markdown/passos-YYYY-MM-DD.md (passos diarios
// agregados a partir de StepsRecord do Health Connect).
// R-INT-3-HC-AUTOPULL-PASSOS (2026-05-22).
//
// Cada arquivo representa o total agregado de passos para um dia
// completo (00:00 a 23:59 no fuso de São Paulo, UTC-3 fixo). E
// escrito pelo puxador `puxadorPassos` em
// src/lib/health/puxadores/passos.ts, que soma todos os
// StepsRecord recebidos do Health Connect dentro daquela janela
// diaria.
//
// Idempotencia: chamar o puxador 2x sobre o mesmo dia regrava o
// arquivo com o mesmo total (HC nao deduplica, mas o agregado por
// dia e estavel apos o dia ter encerrado). O dia em curso nunca e
// escrito (filtrado em endTime < startOfTodayLocal) para evitar
// salvar parcial.
//
// Convencoes do projeto:
//  - data em YYYY-MM-DD (sem hora; o agregado e diario).
//  - autor sempre 'pessoa_a' ou 'pessoa_b' (lido de
//    useSettings.getState().pessoa.ativa em runtime). Familia
//    (vaultCompartilhado=true) nao gera duplicacao: o autor e a
//    pessoa que dispara a sync naquele momento.
//  - fonte_hc literal true (todo arquivo passos-*.md vem de
//    StepsRecord; nao ha entrada manual nesta v1).
//  - sincronizado_em ISO 8601 com offset, util pra rastrear quando
//    a sync rodou pela ultima vez (debug e cleanup futuro).
//  - Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import { PessoaAutorSchema } from '@/lib/schemas/pessoa';

// Data YYYY-MM-DD (sem hora; o agregado e diario). Mesmo padrao
// usado por medidas/humor/ciclo.
const DataYmd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve estar em YYYY-MM-DD');

// ISO datetime com offset (ex: 2026-05-22T20:30:00-03:00) ou Z.
// Mesmo regex usado em contador/evento_contador.
const IsoDatetime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/,
    'sincronizado_em deve estar em ISO 8601 com offset'
  );

export const PassosSchema = z.object({
  tipo: z.literal('passos'),
  data: DataYmd,
  autor: PessoaAutorSchema,
  // Total de passos agregado para aquele dia. Limite superior
  // defensivo (200_000) protege contra leitura corrompida do HC.
  // Pedometros caseiros tipicos ficam abaixo de 50_000/dia mesmo
  // em rotinas extremas.
  total: z.number().int().nonnegative().max(200_000),
  // Sempre true nesta v1 (toda entrada vem de StepsRecord). Mantido
  // como campo explicito para preparar futura entrada manual ou
  // entrada vinda de wearables externos.
  fonte_hc: z.literal(true),
  sincronizado_em: IsoDatetime,
});
export type Passos = z.infer<typeof PassosSchema>;
