// Stack interno da aba Settings. Index e a tela 23 com 7 seções;
// editar-pessoa e adicionar-segunda-pessoa são sub-rotas com
// animacao slide-from-right (consistente com outras sub-rotas).
import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
