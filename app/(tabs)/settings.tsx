// Stub temporario para a aba Settings. Redireciona para
// /(tabs)/em-construcao com sprint=M15. M15 substituira o conteudo
// deste arquivo pela tela real (ver INTEGRATION-CONTRACT secao 1.1).
import { Redirect } from 'expo-router';

export default function SettingsStub() {
  return (
    <Redirect
      href={{ pathname: '/(tabs)/em-construcao', params: { sprint: 'M15' } }}
    />
  );
}
