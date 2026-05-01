// Aba Memorias - rota canonica registrada em
// app/(tabs)/_layout.tsx. M11 substituiu o stub redirect (anterior
// apontava para em-construcao?sprint=M11) pelo container real.
//
// Container <MemoriasScreen> renderiza 3 tabs internas: Treinos
// (Tela 09 + 10), Fotos (galeria agregada), Marcos (Tela 11).
import { MemoriasScreen } from '@/components/screens/MemoriasScreen';

export default function MemoriaTab() {
  return <MemoriasScreen />;
}
