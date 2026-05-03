// M-GAUNTLET: helpers de seed deterministico para popular UI com
// dados sinteticos. Versao 1 cobre o seed minimo (stores de
// identidade, vault, onboarding, sessao). Versao 2 (futura) adiciona
// humores, diarios, eventos, etc -- requer integracao com schemas
// YAML e adapters de leitura/escrita; complexidade grande, fica para
// quando uma sprint precisar concretamente.
//
// Por que existir agora? Para que tests/e2e/playwright/*.e2e.ts
// possam importar `seedNomesDuo()` direto e ter assinatura estavel
// mesmo que a implementacao evolua.
//
// Comentarios sem acento.
import { gauntlet, type SeedOpcoes } from '@/lib/dev/gauntlet';

// Seed minimo (modo sozinho, vault mock, onboarding done).
export function seedSozinho(nomeA: string = 'Nome_A'): void {
  gauntlet.seed({ nomeA, nomeB: null });
}

// Seed casal (modo dual, vault mock, onboarding done).
export function seedDuo(
  nomeA: string = 'Nome_A',
  nomeB: string = 'Nome_B'
): void {
  gauntlet.seed({ nomeA, nomeB });
}

// Seed customizado: passa qualquer combinacao.
export function seedCustom(opts: SeedOpcoes): void {
  gauntlet.seed(opts);
}

// Reset total: zera stores. Util entre casos E2E.
export function resetTotal(): void {
  gauntlet.reset();
}

// Stubs para versao 2 -- chamadas nao fazem nada hoje, apenas
// documentam a API esperada quando schemas integrarem.
export function seedHumores(): void {
  // TODO: criar 90 dias de registros sinteticos de humor com pessoa_a
  // e pessoa_b, distribuidos aleatoriamente (mas seed deterministico).
}

export function seedDiarios(): void {
  // TODO: 30 entradas mistas (vitoria/trigger).
}

export function seedEventos(): void {
  // TODO: 20 eventos de varios tipos (foto, lugar, frase).
}

export function seedTudo(): void {
  // Versao 1 chama apenas seedDuo. Versao 2 incluira os demais.
  seedDuo();
}
