// Helper de acessibilidade: calcula razao de contraste WCAG AA entre
// duas cores. Usado por testes unitarios e por auditoria E2E que mede
// contraste das paletas Dracula contra superficies bg/bgAlt/bgElev.
//
// Referencia: WCAG 2.1 SC 1.4.3 (texto normal >= 4.5:1; large >= 3:1).
// Formula identica ao bloco usado em tests/e2e/playwright/m34-2-botao-contraste.e2e.ts.
//
// Aceita strings: hex (#fff, #ffffff, #ffffffff) ou rgb()/rgba(r,g,b,a).
// Comentarios sem acento.

export type CorRgb = { r: number; g: number; b: number; a: number };

// Converte canal sRGB 0-255 para luminancia linear.
function srgbParaLinear(c: number): number {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

// Parse de string CSS aceitando hex curto/longo e rgb()/rgba().
// Retorna null se nao reconhecer.
export function parseCor(s: string): CorRgb | null {
  if (!s) return null;
  const trim = s.trim();
  // rgb()/rgba()
  const m = trim.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const partes = m[1].split(',').map((p) => parseFloat(p.trim()));
    if (partes.length >= 3 && partes.slice(0, 3).every((n) => Number.isFinite(n))) {
      return {
        r: partes[0],
        g: partes[1],
        b: partes[2],
        a: partes.length >= 4 && Number.isFinite(partes[3]) ? partes[3] : 1,
      };
    }
    return null;
  }
  // hex
  const hex = trim.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length === 4) {
      // #rgba curto -- expandir para #rrggbbaa
      h = h.split('').map((c) => c + c).join('');
    }
    if (h.length === 6) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
        a: 1,
      };
    }
    if (h.length === 8) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
        a: parseInt(h.slice(6, 8), 16) / 255,
      };
    }
  }
  return null;
}

// Luminancia relativa WCAG (0 = preto, 1 = branco).
export function luminanciaRelativa(cor: CorRgb): number {
  return (
    0.2126 * srgbParaLinear(cor.r) +
    0.7152 * srgbParaLinear(cor.g) +
    0.0722 * srgbParaLinear(cor.b)
  );
}

// Razao de contraste entre fg e bg. Aceita strings (hex/rgb) ou objetos.
// Resultado entre 1.0 (sem contraste) e 21.0 (preto sobre branco).
// Lanca Error se cores invalidas.
export function ratioContraste(fg: string | CorRgb, bg: string | CorRgb): number {
  const corFg = typeof fg === 'string' ? parseCor(fg) : fg;
  const corBg = typeof bg === 'string' ? parseCor(bg) : bg;
  if (!corFg) throw new Error(`cor de texto invalida: ${JSON.stringify(fg)}`);
  if (!corBg) throw new Error(`cor de fundo invalida: ${JSON.stringify(bg)}`);
  const Lfg = luminanciaRelativa(corFg);
  const Lbg = luminanciaRelativa(corBg);
  const claro = Math.max(Lfg, Lbg);
  const escuro = Math.min(Lfg, Lbg);
  return (claro + 0.05) / (escuro + 0.05);
}

// Converte hex (#rrggbb ou #rgb) para rgba(r,g,b,alpha) string.
// Usado por componentes que querem aplicar cor accent com transparencia
// (ex: borda Chip rest com 40% opacity para distinguir categoria sem
// competir com selected). Alpha clampado em [0, 1]. Lanca Error se hex
// invalido para evitar string fallback silenciosa em runtime.
export function hexToRgba(hex: string, alpha: number): string {
  const cor = parseCor(hex);
  if (!cor) throw new Error(`hex invalido: ${hex}`);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${cor.r}, ${cor.g}, ${cor.b}, ${a})`;
}

// Atalhos semanticos.
export const WCAG_AA_TEXTO_NORMAL = 4.5;
export const WCAG_AA_TEXTO_GRANDE = 3.0;
export const WCAG_AAA_TEXTO_NORMAL = 7.0;

// Checa conformidade contra WCAG AA texto normal. Retorna boolean.
export function passaWcagAaTextoNormal(
  fg: string | CorRgb,
  bg: string | CorRgb,
): boolean {
  return ratioContraste(fg, bg) >= WCAG_AA_TEXTO_NORMAL;
}

export function passaWcagAaTextoGrande(
  fg: string | CorRgb,
  bg: string | CorRgb,
): boolean {
  return ratioContraste(fg, bg) >= WCAG_AA_TEXTO_GRANDE;
}
