// Layout do Stack interno da sub-rota /grupos (Q19, Onda Q
// 2026-05-13). Espelha o padrao de /rotinas/.
//
// Comentarios sem acento (convencao shell/CI).
import { Stack } from 'expo-router';

export default function GruposLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
