// Layout do Stack interno da sub-rota /(tabs)/alarmes (M16). Mantemos
// listagem (index), criacao (novo) e edicao ([slug]) compartilhando
// providers e header transparente. Cada tela monta seu proprio
// Header customizado.
//
// Comentarios sem acento (convencao shell/CI).
import { Stack } from 'expo-router';

export default function AlarmesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
