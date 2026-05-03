// Layout do Stack interno da sub-rota /exercicios (M27 moveu de (tabs)/exercicios para raiz). Mantemos
// a galeria (index), o detalhe ([slug]), o cadastro (novo) e a
// edicao ([slug]/editar) compartilhando providers e header
// transparente. Cada tela monta seu proprio Header customizado.
import { Stack } from 'expo-router';

export default function ExerciciosLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
