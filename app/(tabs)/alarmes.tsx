// Stub temporario para a aba opt-in Alarmes (M16). Sem toggle
// ativo a aba nao aparece na bottom bar; deep link manual
// renderiza este redirect.
import { Redirect } from 'expo-router';

export default function AlarmesStub() {
  return (
    <Redirect
      href={{ pathname: '/(tabs)/em-construcao', params: { sprint: 'M16' } }}
    />
  );
}
