// Layout do Stack interno da sub-rota /rotinas (Q11.a, M-ROTINA-TREINO).
// Lista (index), criacao (novo) e detalhe/edicao ([slug]) compartilham
// providers e header transparente. Cada tela monta seu proprio Header
// customizado.
//
// Comentarios sem acento (convencao shell/CI).
import { Stack } from 'expo-router';

export default function RotinasLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
