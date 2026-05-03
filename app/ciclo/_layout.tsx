// Layout do Stack interno da sub-rota /ciclo (M14.5; M27 moveu para raiz).
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
