// Rota stub usada pela acao `exercicio` do FAB Radial enquanto a
// galeria de exercicios real nao chegar (M13). Mensagem explicita
// para nao gerar a ilusao de captura pronta. Sem estado novo, sem
// schema novo, sem chamada a vault.
import { useRouter } from 'expo-router';
import { Hammer } from 'lucide-react-native';
import { EmptyState, Header, Screen } from '@/components/ui';

export default function EmBreve() {
  const router = useRouter();
  return (
    <Screen>
      <Header title="Em breve" onBack={() => router.back()} />
      <EmptyState
        Icon={Hammer}
        frase="Galeria de exercícios chega na M13."
      />
    </Screen>
  );
}
