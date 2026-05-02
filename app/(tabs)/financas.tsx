// Aba Financas (Tela 22, M14). Substitui o stub-redirect introduzido
// em M00.5; a partir desta sprint a rota renderiza a tela completa
// com banner de leitura, gasto da semana, top categorias e lista das
// ultimas transacoes. Cache lido via SAF a partir de
// .ouroboros/cache/financas-cache.json (gerado pelo backend, ADR
// 0012). Empty state cobre o caso sem cache. Read-only absoluto.
import type { ReactNode } from 'react';
import { MiniFinanceiroScreen } from '@/components/screens/MiniFinanceiroScreen';

export default function FinancasTab(): ReactNode {
  return <MiniFinanceiroScreen />;
}
