// Integracao concreta do Google Calendar para o orquestrador de
// integracoes (R-INT-2-CALENDAR-SYNC-EVENTOS, 2026-05-25).
//
// REUSO TOTAL — esta sprint NAO recria schema/writer/consumer/cliente:
//   - listarEventos (src/lib/services/calendarApi.ts): bate na Google
//     Calendar API real, read-only, ja existente (M37.1).
//   - sincronizarSnapshotAgenda + AgendaEvento (src/lib/vault/agenda.ts):
//     writer canonico .md por evento, idempotente por event.id, ja
//     existente (M37.1.2). O consumer (useProximos/SecaoProximos) ja le
//     esses .md — esta integracao so abastece o Vault sem o usuario
//     abrir /agenda.
//
// O proposito desta sprint e' o auto-sync periodico no boot/foreground
// (analogo ao HC autopull wiring), nao a logica de sync em si, que ja
// existia em app/agenda.tsx mas so disparava ao abrir a tela.
//
// `criarIntegracaoCalendar` produz uma Integracao (contrato do
// scheduler) com as dependencias injetadas, permitindo teste puro sem
// rede nem stores globais. O wiring em app/_layout.tsx injeta as
// implementacoes reais (refreshIfNeeded do googleAuth, listarEventos,
// sincronizarSnapshotAgenda).
//
// Token/pessoa seguem o MESMO padrao de app/agenda.tsx: se o token vier
// null (conta nao conectada, invalida ou refresh falhou) o sync e'
// no-op gracioso (novos: 0, erro: null) — NUNCA crasha o boot.
//
// Comentarios sem acento (convencao shell/CI).
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import type { EventoCalendar } from '@/lib/services/calendarApi';
import type { AgendaEvento } from '@/lib/vault/agenda';
import type { Integracao } from '@/lib/integracoes/scheduler';

// Janela default puxada a cada sync: hoje ate +30 dias. Igual ao
// horizonte usado em app/agenda.tsx (snapshot de 30 dias). Mantem a
// secao "Proximos" da Tela Hoje fresca sem puxar historico inutil.
const JANELA_DIAS = 30;

// Dependencias injetadas. O wiring real passa as funcoes do googleAuth
// store, do calendarApi e do writer de agenda; os testes passam fakes.
export interface CalendarSyncDeps {
  // Resolve um access token valido para a pessoa (refresh se preciso).
  // null => conta nao conectada/invalida => sync vira no-op gracioso.
  refreshToken: (pessoa: PessoaAutor) => Promise<string | null>;
  // Busca eventos remotos entre [de, ate). Reusa calendarApi.listarEventos.
  listar: (
    token: string,
    de: Date,
    ate: Date,
    pessoa: PessoaAutor
  ) => Promise<EventoCalendar[]>;
  // Persiste o snapshot no Vault (idempotente por event.id). Reusa
  // vault/agenda.sincronizarSnapshotAgenda.
  sincronizarSnapshot: (
    vaultRoot: string,
    pessoa: PessoaAutor,
    eventos: AgendaEvento[],
    sincronizadoEm: string
  ) => Promise<{ adicionados: number; atualizados: number; removidos: number }>;
  // Raiz do Vault SAF/file. null/'' => sem destino => no-op gracioso.
  vaultRoot: string | null;
  // Fonte do "agora" (testes injetam Date fixa). Default: new Date().
  agora?: () => Date;
}

// Converte EventoCalendar (shape do calendarApi) para AgendaEvento
// (shape do writer .md). O writer exige `pessoa`, `fonte` literal e
// `sincronizado_em`; o EventoCalendar nao os carrega, entao os
// preenchemos aqui. `descricao` do EventoCalendar vira o body do .md
// no writer (passado a salvarEventoAgenda dentro do snapshot).
function paraAgendaEvento(
  ev: EventoCalendar,
  pessoa: PessoaAutor,
  sincronizadoEm: string
): AgendaEvento {
  const out: AgendaEvento = {
    id: ev.id,
    pessoa,
    titulo: ev.titulo,
    inicio: ev.inicio,
    fim: ev.fim,
    fonte: 'google_calendar',
    sincronizado_em: sincronizadoEm,
  };
  if (typeof ev.local === 'string' && ev.local.length > 0) {
    out.local = ev.local;
  }
  return out;
}

// Sincroniza o Calendar de uma pessoa para o Vault. Resolve sempre
// com {novos, erro} — nunca rejeita (contrato do scheduler tolera erro
// como string, mas aqui ja tratamos para no-op gracioso ser explicito).
async function sincronizarCalendarPessoa(
  pessoa: PessoaAutor,
  deps: CalendarSyncDeps
): Promise<{ novos: number; erro: string | null }> {
  const vaultRoot = deps.vaultRoot;
  if (typeof vaultRoot !== 'string' || vaultRoot.length === 0) {
    // Sem Vault configurado: nao ha onde escrever. No-op gracioso.
    return { novos: 0, erro: null };
  }

  const token = await deps.refreshToken(pessoa);
  if (token === null) {
    // Conta nao conectada/invalida/refresh falhou. Mesmo padrao de
    // app/agenda.tsx: no-op gracioso, sem crash, sem erro propagado.
    return { novos: 0, erro: null };
  }

  const agoraFn = deps.agora ?? (() => new Date());
  const agora = agoraFn();
  const ate = new Date(agora.getTime() + JANELA_DIAS * 86400_000);
  const sincronizadoEm = agora.toISOString();

  const remotos = await deps.listar(token, agora, ate, pessoa);
  const eventos = remotos.map((ev) =>
    paraAgendaEvento(ev, pessoa, sincronizadoEm)
  );
  const res = await deps.sincronizarSnapshot(
    vaultRoot,
    pessoa,
    eventos,
    sincronizadoEm
  );
  return { novos: res.adicionados, erro: null };
}

// Fabrica a Integracao do Calendar para o scheduler. Sincroniza ambas
// as pessoas (pessoa_a e pessoa_b): cada uma tem sua propria conta
// Google e seus proprios .md em agenda/<pessoa>/. Erro de uma pessoa
// nao derruba a outra (Promise.allSettled interno); o erro agregado
// so aparece se AMBAS falharem com excecao real (rede/quota), o que o
// scheduler ja trata por integracao.
export function criarIntegracaoCalendar(deps: CalendarSyncDeps): Integracao {
  return {
    nome: 'google_calendar',
    sincronizar: async () => {
      const pessoas: PessoaAutor[] = ['pessoa_a', 'pessoa_b'];
      const resultados = await Promise.allSettled(
        pessoas.map((p) => sincronizarCalendarPessoa(p, deps))
      );

      let novos = 0;
      const erros: string[] = [];
      for (const r of resultados) {
        if (r.status === 'fulfilled') {
          novos += r.value.novos;
          if (r.value.erro !== null) erros.push(r.value.erro);
        } else {
          const msg =
            r.reason instanceof Error
              ? r.reason.message
              : String(r.reason ?? 'rejected');
          erros.push(msg);
        }
      }

      // Erro so e' reportado se ALGUMA pessoa falhou com excecao real.
      // No-op gracioso (token null / sem vault) nao conta como erro.
      const erro = erros.length > 0 ? erros.join('; ') : null;
      return { novos, erro };
    },
  };
}
