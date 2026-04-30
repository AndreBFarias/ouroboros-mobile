// Stub idempotente da rota `/scanner`. A captura real (ML Kit OCR
// mais confirmacao manual) chega em M09 e exige expo-dev-client.
// Mantido trivial: sem estado, sem schema, sem chamada a vault.
import { useRouter } from 'expo-router';
import { EmptyState, Header, Screen } from '@/components/ui';

export default function Scanner() {
  const router = useRouter();
  return (
    <Screen>
      <Header title="Scanner" onBack={() => router.back()} />
      <EmptyState frase="Esta captura chega na M09 (dev-client)." />
    </Screen>
  );
}
