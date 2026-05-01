// Stub temporario para a aba Humor. Redireciona para
// /(tabs)/em-construcao com sprint=M10. M10 substituira o conteudo
// deste arquivo pela tela real (ver INTEGRATION-CONTRACT seção 1.1).
import { Redirect } from 'expo-router';

export default function HumorStub() {
  return (
    <Redirect
      href={{ pathname: '/(tabs)/em-construcao', params: { sprint: 'M10' } }}
    />
  );
}
