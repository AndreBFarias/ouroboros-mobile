// Mini-changelog amigavel para a tela Sobre. Nao e import bruto do
// CHANGELOG.md raiz: aqui o texto e humanizado, em sentence case PT-BR
// completa, sem jargao tecnico interno (ids de sprint, paths). Cada
// entrada lista a versao publica, a data ISO e ate 5 mudancas
// percebidas pelo usuario final.
//
// Quando publicar nova versao do app: prependar a entrada nova no
// inicio do array RELEASE_NOTES (ordem decrescente: mais nova
// primeiro). Manter no maximo 8 entradas; entradas mais antigas saem
// da lista visivel da tela Sobre mas continuam no CHANGELOG.md raiz.
//
// Regra -1 anonimato: nenhuma entrada cita autor, IA, ferramenta ou
// nome real. Texto descreve a feature do ponto de vista do usuario.

export interface ReleaseNote {
  versao: string;
  data: string;
  mudancas: readonly string[];
}

export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    versao: '1.0.0',
    data: '2026-05-05',
    mudancas: [
      'Tela Hoje reformulada com status do casal e jornada agrupada.',
      'Recap com período personalizável e cinco seções de leitura.',
      'Settings com tela Sobre detalhada e mini-changelog.',
      'Backup e restauração de dados via arquivo zip.',
      'Suporte a duas pessoas com cores e nomes próprios.',
    ],
  },
  {
    versao: '0.9.0',
    data: '2026-05-02',
    mudancas: [
      'Onboarding completo com seleção de pasta do Vault.',
      'Diário emocional com tags rápidas e mídia anexada.',
      'Marcos e memórias em galeria visual.',
      'Captura unificada por gesto longo no botão central.',
    ],
  },
  {
    versao: '0.8.0',
    data: '2026-04-28',
    mudancas: [
      'Primeira versão pública para testes internos.',
      'Humor rápido em três campos com persistência local.',
      'Menu lateral com navegação entre as áreas principais.',
    ],
  },
] as const;
