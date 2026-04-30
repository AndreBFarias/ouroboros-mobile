// Stub idempotente da rota `/humor-rapido`. A captura real (bottom
// sheet com sliders Humor/Energia/Ansiedade/Foco) chega em M05 e
// substitui este arquivo. Mantido trivial: sem estado, sem schema,
// sem chamada a vault.
import { useRouter } from 'expo-router';
import { EmptyState, Header, Screen } from '@/components/ui';

export default function HumorRapido() {
  const router = useRouter();
  return (
    <Screen>
      <Header title="Humor rápido" onBack={() => router.back()} />
      <EmptyState frase="Esta captura chega na M05." />
    </Screen>
  );
}
