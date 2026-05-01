// Stub temporario para a aba opt-in Calendario (M11.5). Sem toggle
// ativo a aba não aparece na bottom bar; deep link manual
// renderiza este redirect.
import { Redirect } from 'expo-router';

export default function CalendarioStub() {
  return (
    <Redirect
      href={{ pathname: '/(tabs)/em-construcao', params: { sprint: 'M11.5' } }}
    />
  );
}
