// Stub idempotente da rota `/eventos`. A captura real (lugar, bairro,
// pessoas envolvidas, modo positivo/negativo) chega em M07 e
// substitui este arquivo. Mantido trivial: sem estado, sem schema,
// sem chamada a vault.
import { useRouter } from 'expo-router';
import { EmptyState, Header, Screen } from '@/components/ui';

export default function Eventos() {
  const router = useRouter();
  return (
    <Screen>
      <Header title="Eventos" onBack={() => router.back()} />
      <EmptyState frase="Esta captura chega na M07." />
    </Screen>
  );
}
