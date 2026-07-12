// Declaracao de tipos para imports diretos de icones lucide-react-native
// (M-BUNDLE-DIET). O pacote so publica .d.ts no barrel principal; os
// arquivos individuais .mjs em dist/esm/icons nao tem tipos. Como cada
// icone e um componente forwardRef tipado por LucideIcon, declaramos
// modulo wildcard e exportamos default tipado.
//
// Comentarios sem acento (convencao shell/CI).

declare module 'lucide-react-native/dist/esm/icons/*.mjs' {
  import type { LucideIcon } from 'lucide-react-native';
  const Icon: LucideIcon;
  export default Icon;
}
