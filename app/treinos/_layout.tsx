// Layout do Stack interno da sub-rota /treinos. Hoje so cobre o
// executor de sessao (Q11.c). Futuras telas (historico, edicao
// avancada) entram aqui sem mexer no header global.
//
// Comentarios sem acento (convencao shell/CI).
import { Stack } from 'expo-router';

export default function TreinosLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
