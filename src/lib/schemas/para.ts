// Schema compartilhado do campo `para` (M33). Indica o destinatario
// emocional / tema de uma anotacao em diario, evento, contador ou
// marco. Diferente de `autor` (quem REGISTRA) e de `pessoa_destino`
// da Tarefa (quem deve EXECUTAR a tarefa, M31).
//
// Discriminado por `tipo`:
//  - 'mim'   = anotacao para si mesmo (default backward-compat).
//  - 'outra' = anotacao dedicada ao parceiro do casal. `pessoa` usa
//              PessoaAutorSchema (pessoa_a / pessoa_b). Nome real
//              vem de useNomeDe() em runtime; nunca string livre.
//  - 'casal' = anotacao para o casal como unidade.
//
// Default `{ tipo: 'mim' }` garante compat com .md v1 que nao traz
// o campo no frontmatter; arquivos antigos continuam validos.
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import { PessoaAutorSchema } from '@/lib/schemas/pessoa';

export const ParaSchema = z
  .discriminatedUnion('tipo', [
    z.object({ tipo: z.literal('mim') }),
    z.object({ tipo: z.literal('outra'), pessoa: PessoaAutorSchema }),
    z.object({ tipo: z.literal('casal') }),
  ])
  .default({ tipo: 'mim' });

export type Para = z.infer<typeof ParaSchema>;
