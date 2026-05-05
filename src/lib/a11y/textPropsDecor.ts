// Helper para marcar <Text> como decorativo aos olhos da auditoria
// runtime de contraste WCAG (E2E m-wcag-audit). Em RN-Web, dataSet
// vira data-* no DOM. O tipo TextProps do RN nao expoe dataSet, entao
// devolvemos um objeto cast como qualquer prop adicional.
//
// Uso:
//   <Text {...textPropsDecor()} style={{ color: colors.mutedDecor }}>
//     ...
//   </Text>
//
// O E2E ignora qualquer elemento com data-a11y="decor", evitando
// flag falso-positivo em rotulos micro intencionalmente baixos.
//
// Comentarios sem acento.
export function textPropsDecor(): Record<string, unknown> {
  return { dataSet: { a11y: 'decor' } };
}
