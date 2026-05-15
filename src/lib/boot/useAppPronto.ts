// M27.3: hook agregador de prontidao do app.
//
// Combina:
//   - fontesProntas (passado pelo caller -- vem de useFonts em
//     _layout.tsx; manter o useFonts no caller permite que o
//     Expo Router e demais providers continuem montados).
//   - hidratacao das 3 stores criticas (onboarding, vault, sessao).
//
// Latch via store global useBootStatus: uma vez true, sempre true
// pela sessao. Mesmo que useFonts oscile (Armadilha SDK 54 web
// documentada em M27.1) ou alguma store re-emita evento de
// hidratacao, o latch permanece.
//
// Decisao M27.3: NAO usa Suspense throw. Em React Native 0.81 +
// React 19.1 + Reanimated 4 com worklets nativos, throw new Promise
// dentro do hook pode causar surprise no Reanimated worklet. O
// prompt do orquestrador autoriza conditional render como
// equivalente em UX e mais seguro cross-plataforma. O consumidor
// recebe boolean e decide se renderiza fallback. Quando/se a stack
// suportar Suspense de forma garantida em todas as plataformas,
// migrar e local (apenas troca o consumidor).
//
// Comentarios sem acento.
import { useEffect } from 'react';
import { useOnboarding } from '@/lib/stores/onboarding';
import { useVault } from '@/lib/stores/vault';
import { useSessao } from '@/lib/stores/sessao';
import { useHasHydrated } from '@/lib/stores/hydrated';
import { useBootStatus, selectBootPronto } from '@/lib/boot/useBootStatus';

export interface UseAppProntoArgs {
  // useFonts ja roda em _layout.tsx; passamos o boolean ao hook
  // para evitar duplicar o hook em locais diferentes (multiplos
  // useFonts criariam fetch duplicado de woff2).
  fontesProntas: boolean;
}

export function useAppPronto({ fontesProntas }: UseAppProntoArgs): boolean {
  const onboardingHidratado = useHasHydrated(useOnboarding);
  const vaultHidratado = useHasHydrated(useVault);
  const sessaoHidratada = useHasHydrated(useSessao);
  const pronto = useBootStatus(selectBootPronto);
  const marcarPronto = useBootStatus((s) => s.marcarPronto);

  // Quando todas as condicoes baterem true uma vez, latch global.
  // useEffect garante que a mutacao do store nao acontece durante
  // render -- evita "Cannot update a component while rendering" do
  // React 19 strict mode (lesson learned em M27.2).
  useEffect(() => {
    if (
      !pronto &&
      fontesProntas &&
      onboardingHidratado &&
      vaultHidratado &&
      sessaoHidratada
    ) {
      marcarPronto();
    }
  }, [
    pronto,
    fontesProntas,
    onboardingHidratado,
    vaultHidratado,
    sessaoHidratada,
    marcarPronto,
  ]);

  // Latch garantido: uma vez true no store, sempre devolve true.
  // Mesmo que algum dos inputs oscile, retorna true.
  return pronto;
}
