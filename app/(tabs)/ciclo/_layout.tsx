// Layout do Stack interno da sub-rota /(tabs)/ciclo (M14.5).
// Mantemos a visualizacao (index) e o sheet de registro
// (registrar.tsx) compartilhando providers e header transparente.
// Cada tela monta seu proprio Header customizado.
//
// Comentarios sem acento (convencao shell/CI).
import { Stack } from 'expo-router';

export default function CicloLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
