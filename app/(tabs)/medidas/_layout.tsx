// Layout do Stack interno da sub-rota /(tabs)/medidas. Mantemos o
// comparativo (index) e o form de novo (novo.tsx) compartilhando
// providers e header transparente. Cada tela monta seu proprio
// Header customizado.
//
// Comentarios sem acento (convencao shell/CI).
import { Stack } from 'expo-router';

export default function MedidasLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
