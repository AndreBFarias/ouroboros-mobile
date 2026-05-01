// Layout do Stack interno da sub-rota /(tabs)/contadores (M18).
// Mantemos listagem (index), criacao (novo) e detalhe ([slug])
// compartilhando providers e header transparente. Cada tela monta
// seu proprio Header customizado.
//
// Comentarios sem acento (convencao shell/CI).
import { Stack } from 'expo-router';

export default function ContadoresLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
