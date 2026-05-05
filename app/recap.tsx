// Rota raiz /recap (M36). Espelho otimista do Vault em um periodo:
// agrega conquistas, crises, evolucoes, tarefas concluidas e numeros.
// Apresentacao modal registrada em app/_layout.tsx.
//
// Comentarios sem acento (convencao shell/CI).
import { RecapScreen } from '@/components/screens/RecapScreen';

export default function Recap() {
  return <RecapScreen />;
}
