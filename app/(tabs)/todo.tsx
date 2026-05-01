// Stub temporario para a aba opt-in Tarefas (M17). Sem toggle
// ativo a aba nao aparece na bottom bar; deep link manual
// renderiza este redirect.
import { Redirect } from 'expo-router';

export default function TodoStub() {
  return (
    <Redirect
      href={{ pathname: '/(tabs)/em-construcao', params: { sprint: 'M17' } }}
    />
  );
}
