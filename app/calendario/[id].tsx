// Sub-rota dinâmica de detalhe da conquista (M11.5). Recebe o id
// estável (`<origem>:<data>:<autor>`) via params e delega para
// DetalheConquista. Slide horizontal default da Stack raiz cobre a
// transição (decisão 10 do spec).
//
// Comentários em PT-BR com acentuação correta.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DetalheConquista } from '@/components/screens/DetalheConquista';

export default function DetalheConquistaRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const idNormalizado = typeof id === 'string' ? id : '';
  return (
    <DetalheConquista
      id={idNormalizado}
      onVoltar={() => router.back()}
    />
  );
}
