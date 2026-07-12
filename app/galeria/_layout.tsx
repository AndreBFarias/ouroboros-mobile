// Q9 (Onda Q): layout do Stack interno da sub-rota /galeria.
// index lista a galeria unificada (vault explorer); detalhe/[slug]
// abre visualizacao read-only de um item especifico.
//
// Comentarios sem acento (convencao shell/CI).
import { Stack } from 'expo-router';

export default function GaleriaLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
