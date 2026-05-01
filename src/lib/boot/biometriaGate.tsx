// Componente de gate de biometria. Esqueleto no-op em M00.5.
// M15 implementara o fluxo real de LocalAuthentication.authenticateAsync
// substituindo este componente pela versao com challenge real.
//
// Comportamento atual:
//   - Consulta useSettings.privacidade.biometriaAbrir.
//   - Se off (default), renderiza children direto.
//   - Se on, ainda renderiza children (no-op) com TODO marker para M15.
//
// Quando M15 chegar, este arquivo sera reescrito com:
//   - import LocalAuthentication from 'expo-local-authentication';
//   - useState para estado de autenticacao;
//   - useEffect para disparar challenge ao montar.
import { ReactNode } from 'react';
import { useSettings } from '@/lib/stores/settings';

interface BiometriaGateProps {
  children: ReactNode;
}

export function BiometriaGate({ children }: BiometriaGateProps) {
  const ativa = useSettings((s) => s.privacidade.biometriaAbrir);
  // M15-TODO: quando ativa for true, dispara LocalAuthentication
  // antes de renderizar children. Por ora, no-op.
  void ativa;
  return <>{children}</>;
}
