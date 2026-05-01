// Stub temporario para a aba Financas. Redireciona para
// /(tabs)/em-construcao com sprint=M14. M14 substituira o conteudo
// deste arquivo pela tela real (ver INTEGRATION-CONTRACT secao 1.1).
import { Redirect } from 'expo-router';

export default function FinancasStub() {
  return (
    <Redirect
      href={{ pathname: '/(tabs)/em-construcao', params: { sprint: 'M14' } }}
    />
  );
}
