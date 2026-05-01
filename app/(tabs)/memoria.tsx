// Stub temporario para a aba Memorias. Redireciona para
// /(tabs)/em-construcao com sprint=M11. M11 substituira o conteudo
// deste arquivo pela tela real (ver INTEGRATION-CONTRACT secao 1.1).
import { Redirect } from 'expo-router';

export default function MemoriaStub() {
  return (
    <Redirect
      href={{ pathname: '/(tabs)/em-construcao', params: { sprint: 'M11' } }}
    />
  );
}
