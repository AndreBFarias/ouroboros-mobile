// Polish CSS extra para a versao Web do app. NativeWind 4 não
// emite consistentemente alguns tokens (cor de fundo do body,
// color-scheme, scrollbar, placeholder), gerando uma sensacao de
// Dracula desbotado no Chrome. Este modulo injeta um <style> no
// <head> com os ajustes residuais. Idempotente: se já foi
// injetado, retorna sem refazer.
//
// Plataforma: chamado em app/_layout.tsx no mesmo bloco que
// forca darkMode='class'. Em Android/iOS, Platform.OS !== 'web'
// e a função retorna cedo. Em Web, document existe e o style e
// inserido uma unica vez.
import { Platform } from 'react-native';

const STYLE_ID = 'ouroboros-dracula-polish';

const POLISH_CSS = `
:root {
  color-scheme: dark;
}
body {
  background-color: var(--bg-page, #14151a);
}
.border, [class*="border"] {
  border-color: var(--bg-elev, #44475a);
}
input::placeholder,
textarea::placeholder {
  color: var(--muted-decor, #6272a4);
  opacity: 1;
}
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
::-webkit-scrollbar-track {
  background: var(--bg-page, #14151a);
}
::-webkit-scrollbar-thumb {
  background: var(--bg-elev, #44475a);
  border-radius: 6px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--muted-decor, #6272a4);
}
`;

/**
 * Aplica polish Dracula adicional na versao Web. Inerte em nativo.
 * Idempotente: chamadas subsequentes não duplicam o <style>.
 */
export function applyDraculaWeb(): void {
  if (Platform.OS !== 'web') return;
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = POLISH_CSS;
  document.head.appendChild(style);
}
