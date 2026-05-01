// Stub temporario para a aba opt-in Ciclo (M14.5). Sem toggle
// ativo a aba nao aparece na bottom bar; deep link manual
// renderiza este redirect.
import { Redirect } from 'expo-router';

export default function CicloStub() {
  return (
    <Redirect
      href={{ pathname: '/(tabs)/em-construcao', params: { sprint: 'M14.5' } }}
    />
  );
}
