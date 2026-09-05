#!/usr/bin/env python3
"""Extrai a geometria do SVG canônico da marca e emite geometria.ts.

Resolve todas as transformacoes aninhadas (translate/scale/matrix) para
coordenadas absolutas no espaco do viewBox do SVG. Todas as matrizes do
arquivo sao similaridades (rotacao + escala uniforme), o que torna
seguro transformar tambem os arcos (A): rx/ry escalam pelo fator e o
angulo do eixo-x soma a rotacao.

Uso: python3 extrair_glifo.py <svg> <saida.ts>
"""
import math
import re
import sys
import xml.etree.ElementTree as ET

NS = '{http://www.w3.org/2000/svg}'


# --- algebra de matrizes 2D (a,b,c,d,e,f) no formato SVG ---
IDENT = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)


def mul(m, n):
    a1, b1, c1, d1, e1, f1 = m
    a2, b2, c2, d2, e2, f2 = n
    return (
        a1 * a2 + c1 * b2,
        b1 * a2 + d1 * b2,
        a1 * c2 + c1 * d2,
        b1 * c2 + d1 * d2,
        a1 * e2 + c1 * f2 + e1,
        b1 * e2 + d1 * f2 + f1,
    )


def aplicar(m, x, y):
    a, b, c, d, e, f = m
    return (a * x + c * y + e, b * x + d * y + f)


def escala_de(m):
    a, b, c, d, _, _ = m
    return math.sqrt(abs(a * d - b * c))


def rotacao_de(m):
    return math.degrees(math.atan2(m[1], m[0]))


def parse_transform(txt):
    if not txt:
        return IDENT
    m = IDENT
    for nome, args in re.findall(r'(\w+)\s*\(([^)]*)\)', txt):
        v = [float(x) for x in re.split(r'[\s,]+', args.strip()) if x]
        if nome == 'matrix':
            t = tuple(v)
        elif nome == 'translate':
            t = (1, 0, 0, 1, v[0], v[1] if len(v) > 1 else 0)
        elif nome == 'scale':
            sx = v[0]
            sy = v[1] if len(v) > 1 else sx
            t = (sx, 0, 0, sy, 0, 0)
        elif nome == 'rotate':
            ang = math.radians(v[0])
            cos, sin = math.cos(ang), math.sin(ang)
            t = (cos, sin, -sin, cos, 0, 0)
            if len(v) == 3:
                t = mul(mul((1, 0, 0, 1, v[1], v[2]), t), (1, 0, 0, 1, -v[1], -v[2]))
        else:
            continue
        m = mul(m, t)
    return m


# --- transformacao de path data ---
TOKEN = re.compile(r'([MLHVCQAZmlhvcqaz])|(-?\d*\.?\d+(?:[eE][-+]?\d+)?)')


def transformar_path(d, m):
    """Reescreve o atributo d aplicando a matriz. Assume comandos absolutos.

    H/V viram L: sob rotacao eles deixam de ser horizontais/verticais.
    """
    toks = [(c, n) for c, n in TOKEN.findall(d)]
    saida = []
    i = 0
    cx = cy = 0.0
    esc = escala_de(m)
    rot = rotacao_de(m)

    def num(v):
        return f'{v:.4f}'.rstrip('0').rstrip('.')

    cmd = None
    while i < len(toks):
        c, n = toks[i]
        if c:
            cmd = c
            i += 1
            if cmd in 'Zz':
                saida.append('Z')
            continue
        # le argumentos conforme o comando corrente
        def pega(k):
            nonlocal i
            vals = [float(toks[i + j][1]) for j in range(k)]
            i += k
            return vals

        if cmd == 'M' or cmd == 'L':
            x, y = pega(2)
            px, py = aplicar(m, x, y)
            saida.append(f'{cmd} {num(px)} {num(py)}')
            cx, cy = x, y
        elif cmd == 'H':
            (x,) = pega(1)
            px, py = aplicar(m, x, cy)
            saida.append(f'L {num(px)} {num(py)}')
            cx = x
        elif cmd == 'V':
            (y,) = pega(1)
            px, py = aplicar(m, cx, y)
            saida.append(f'L {num(px)} {num(py)}')
            cy = y
        elif cmd == 'C':
            x1, y1, x2, y2, x, y = pega(6)
            p1 = aplicar(m, x1, y1)
            p2 = aplicar(m, x2, y2)
            p3 = aplicar(m, x, y)
            saida.append(
                f'C {num(p1[0])} {num(p1[1])} {num(p2[0])} {num(p2[1])} {num(p3[0])} {num(p3[1])}'
            )
            cx, cy = x, y
        elif cmd == 'Q':
            x1, y1, x, y = pega(4)
            p1 = aplicar(m, x1, y1)
            p2 = aplicar(m, x, y)
            saida.append(f'Q {num(p1[0])} {num(p1[1])} {num(p2[0])} {num(p2[1])}')
            cx, cy = x, y
        elif cmd == 'A':
            rx, ry, xrot, laf, sf, x, y = pega(7)
            p = aplicar(m, x, y)
            saida.append(
                f'A {num(rx * esc)} {num(ry * esc)} {num(xrot + rot)} '
                f'{int(laf)} {int(sf)} {num(p[0])} {num(p[1])}'
            )
            cx, cy = x, y
        else:
            i += 1
    return ' '.join(saida)


# --- coleta ---
def coletar(svg_path):
    tree = ET.parse(svg_path)
    root = tree.getroot()
    itens = []

    def titulo(e):
        t = e.find(NS + 'title')
        return t.text.strip() if t is not None and t.text else None

    def para_hex(cor):
        """Normaliza rgb()/rgba() para #rrggbb (padrão de cor do projeto).

        O alpha de um rgba() e' descartado aqui: quem precisa dele expoe
        fillOpacity separado, como BOCA e FOCINHO.
        """
        if not cor:
            return None
        cor = cor.strip()
        m = re.match(r'rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)', cor)
        if m:
            r, g, b = (int(round(float(v))) for v in m.groups())
            return f'#{r:02x}{g:02x}{b:02x}'
        return cor

    def estilo(e):
        """fill efetivo: atributo fill, senao style."""
        f = e.get('fill')
        st = e.get('style', '')
        m = re.search(r'fill:\s*([^;]+)', st)
        if f and f != 'none':
            return para_hex(f)
        if m:
            return para_hex(m.group(1))
        return None

    def walk(e, m):
        m = mul(m, parse_transform(e.get('transform', '')))
        tag = e.tag.replace(NS, '')
        if tag == 'circle':
            x, y = aplicar(m, float(e.get('cx', 0)), float(e.get('cy', 0)))
            r = float(e.get('r', 0)) * escala_de(m)
            itens.append({
                'tipo': 'circle', 'titulo': titulo(e), 'cx': x, 'cy': y, 'r': r,
                'fill': estilo(e), 'stroke': e.get('stroke'),
                'stroke_width': e.get('stroke-width'),
                'dash': e.get('stroke-dasharray'), 'escala': escala_de(m),
                'style': e.get('style', ''),
            })
        elif tag == 'path':
            itens.append({
                'tipo': 'path', 'titulo': titulo(e),
                'd': transformar_path(e.get('d', ''), m),
                'fill': estilo(e), 'style': e.get('style', ''),
            })
        for c in e:
            walk(c, m)

    walk(root, IDENT)
    return itens, root.get('viewBox', '')


def main():
    svg, saida = sys.argv[1], sys.argv[2]
    itens, viewbox = coletar(svg)
    circles = [i for i in itens if i['tipo'] == 'circle']
    paths = {i['titulo']: i for i in itens if i['tipo'] == 'path'}

    # classificacao por geometria/atributo
    contas = sorted(
        [c for c in circles if 13 < c['r'] / c['escala'] < 15],
        key=lambda c: 0,
    )
    contas = [c for c in circles if 13 < c['r'] / c['escala'] < 15]
    disco = next((c for c in circles if c['fill'] and c['fill'].upper() == '#170F2B'), None)
    anel = next((c for c in circles if c['dash']), None)
    olho = next((c for c in circles if c['r'] / c['escala'] < 6), None)

    print(f'viewBox={viewbox}')
    print(f'contas={len(contas)} disco={disco is not None} anel={anel is not None} olho={olho is not None}')
    print(f'paths={list(paths.keys())}')

    # Centro do corpo: ajuste de circulo por minimos quadrados sobre as
    # contas. NAO usar o centroide -- as contas não fecham a volta (ha o vao
    # da boca), e a media puxaria o centro para o lado oposto ao vao, fazendo
    # a animacao de rotacao girar torto.
    #
    # Sistema linear de Kasa: para (x-a)^2 + (y-b)^2 = r^2, expandindo vira
    # 2ax + 2by + c = x^2 + y^2, linear em (a, b, c).
    n_ = len(contas)
    Sx = sum(c['cx'] for c in contas)
    Sy = sum(c['cy'] for c in contas)
    Sxx = sum(c['cx'] ** 2 for c in contas)
    Syy = sum(c['cy'] ** 2 for c in contas)
    Sxy = sum(c['cx'] * c['cy'] for c in contas)
    Sxz = sum(c['cx'] * (c['cx'] ** 2 + c['cy'] ** 2) for c in contas)
    Syz = sum(c['cy'] * (c['cx'] ** 2 + c['cy'] ** 2) for c in contas)
    Sz = sum(c['cx'] ** 2 + c['cy'] ** 2 for c in contas)
    A = [[2 * Sxx, 2 * Sxy, Sx], [2 * Sxy, 2 * Syy, Sy], [2 * Sx, 2 * Sy, n_]]
    B = [Sxz, Syz, Sz]
    det = (
        A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1])
        - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0])
        + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0])
    )

    def cramer(col):
        M = [linha[:] for linha in A]
        for i in range(3):
            M[i][col] = B[i]
        return (
            M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
            - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
            + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
        ) / det

    cxs, cys = cramer(0), cramer(1)
    raio_corpo = math.sqrt(sum((c['cx'] - cxs) ** 2 + (c['cy'] - cys) ** 2 for c in contas) / n_)
    print(f'centro do corpo (fit): ({cxs:.2f}, {cys:.2f}) raio={raio_corpo:.2f}')

    # Reordena as contas para que conta-01 seja o pescoco, como manda a
    # convencao canonica (ordenarDaCabeca.ts §6-8). A ordem em que o SVG
    # lista os circulos e' arbitraria -- comeca em qualquer ponto da volta.
    # Aqui replicamos a matematica do ordenador em 'ccw' para que a fonte
    # ja saia ordenada e ordenarDaCabeca(base,'ccw') seja idempotente.
    if olho:
        ang = lambda c: math.atan2(c['cy'] - cys, c['cx'] - cxs)  # noqa: E731
        por_angulo = sorted(contas, key=ang)
        a_cabeca = math.atan2(olho['cy'] - cys, olho['cx'] - cxs)

        def dist_ang(c):
            d = abs(ang(c) - a_cabeca) % (2 * math.pi)
            return 2 * math.pi - d if d > math.pi else d

        melhor = min(range(len(por_angulo)), key=lambda i: dist_ang(por_angulo[i]))
        girado = por_angulo[melhor:] + por_angulo[:melhor]
        contas = [girado[0]] + list(reversed(girado[1:]))
        print(f'contas reordenadas: conta-01 e\' a mais proxima da cabeca')

    def n(v):
        return f'{v:.3f}'.rstrip('0').rstrip('.')

    L = []
    L.append('// Dados geometricos canônicos do glifo Ouroboros. FONTE UNICA: as')
    L.append('// contas, os paths do rosto, o disco, o anel, o wordmark e os centros')
    L.append('// de animacao vivem so aqui.')
    L.append('//')
    L.append('// GERADO por scripts/extrair-glifo.py a partir do SVG canônico da')
    L.append('// marca. Todas as transformacoes aninhadas do SVG ja estao resolvidas:')
    L.append('// as coordenadas abaixo sao absolutas no viewBox declarado em VIEWBOX.')
    L.append('// Não editar a mao -- regenerar pelo script.')
    L.append('//')
    L.append('// O wordmark e\' VETORIAL (paths), não mais <Text> monospace: isso')
    L.append('// supera a decisao M25 §10.3, cujo motivo era o pisca de fallback')
    L.append('// quando a fonte de marca não estava pronta no boot. Sem fonte, sem')
    L.append('// pisca -- e o desenho fica fiel ao canônico.')
    L.append('//')
    L.append('// Comentarios sem acento (convencao shell/CI).')
    L.append('')
    L.append(f"export const VIEWBOX = '{viewbox}';")
    L.append('')
    L.append(f'// {len(contas)} contas [cx, cy, hex] em degrade rosa->roxo.')
    L.append('export const CONTAS: ReadonlyArray<readonly [number, number, string]> = [')
    for i, c in enumerate(contas):
        L.append(f"  [{n(c['cx'])}, {n(c['cy'])}, '{c['fill']}'], // conta-{i+1:02d}")
    L.append('];')
    L.append('')
    r_medio = sum(c['r'] for c in contas) / len(contas)
    L.append('// Raio fixo das contas (user units do viewBox).')
    L.append(f'export const RAIO_CONTA = {n(r_medio)};')
    L.append('')
    if disco:
        L.append('// Disco de fundo do glifo (atras do anel e das contas).')
        L.append('export const DISCO = {')
        L.append(f"  cx: {n(disco['cx'])},")
        L.append(f"  cy: {n(disco['cy'])},")
        L.append(f"  r: {n(disco['r'])},")
        L.append(f"  fill: '{disco['fill']}',")
        L.append('};')
        L.append('')
    if anel:
        dash = [float(x) * anel['escala'] for x in re.split(r'[\s,]+', anel['dash'].strip())]
        sw = float(anel['stroke_width'] or 1) * anel['escala']
        op = re.search(r'stroke-opacity:\s*([\d.]+)', anel.get('style', ''))
        L.append('// Anel pontilhado externo.')
        L.append('export const ANEL = {')
        L.append(f"  cx: {n(anel['cx'])},")
        L.append(f"  cy: {n(anel['cy'])},")
        L.append(f"  r: {n(anel['r'])},")
        L.append(f"  stroke: '{anel['stroke']}',")
        L.append(f'  strokeWidth: {n(sw)},')
        L.append(f"  dash: [{', '.join(n(d) for d in dash)}] as number[],")
        L.append("  cap: 'round' as const,")
        L.append(f"  opacity: {op.group(1) if op else '1'},")
        L.append('};')
        L.append('')

    def bloco(nome, titulo_svg, comentario, fill_over=None, extra=None):
        p = paths.get(titulo_svg)
        if not p:
            print(f'AVISO: path "{titulo_svg}" ausente')
            return
        L.append(comentario)
        L.append(f'export const {nome} = {{')
        L.append(f"  d: '{p['d']}',")
        L.append(f"  fill: '{fill_over or p['fill']}',")
        for k, v in (extra or {}).items():
            L.append(f'  {k}: {v},')
        L.append('};')
        L.append('')

    bloco('CAUDA', 'Calda', '// Cauda mordida.')
    bloco('CABECA', 'silhueta-cabeça', '// Cabeca da serpente.')
    bloco('BOCA', 'boca', '// Boca (lingua).', fill_over='#28194a',
          extra={'fillOpacity': 0.694})
    bloco('FOCINHO', 'focinho', '// Focinho.', fill_over='#28194a',
          extra={'fillOpacity': 0.67})

    if olho:
        L.append('// Olho.')
        L.append('export const OLHO = {')
        L.append(f"  cx: {n(olho['cx'])},")
        L.append(f"  cy: {n(olho['cy'])},")
        L.append(f"  r: {n(olho['r'])},")
        L.append(f"  fill: '{olho['fill']}',")
        L.append('  opacity: 0.65,')
        L.append('};')
        L.append('')

    L.append('// Centros de animacao. CENTRO: rotacao do corpo/contas (ajuste de')
    L.append('// circulo por minimos quadrados sobre as contas, não o centroide --')
    L.append('// as contas não fecham a volta e a media giraria torto).')
    L.append('// RING_CENTER: centro real do anel (anti-wobble).')
    L.append(f'export const CENTRO = {{ x: {n(cxs)}, y: {n(cys)} }} as const;')
    if anel:
        L.append(f"export const RING_CENTER = {{ x: {n(anel['cx'])}, y: {n(anel['cy'])} }} as const;")
    if olho:
        L.append('')
        L.append('// Ancora da cabeca (posicao do olho) usada pelo ordenador de contas.')
        L.append(f"export const ANCORA_CABECA = {{ cx: {n(olho['cx'])}, cy: {n(olho['cy'])} }} as const;")
    L.append('')
    L.append('// Wordmark central. Nome do PRODUTO (Regra -1).')
    L.append('//')
    L.append('// Dois formatos, um por tipo de consumidor: `primaria`/`secundaria`')
    L.append('// sao os paths vetoriais usados dentro do SVG do glifo; os campos')
    L.append('// *Texto/fontFamily servem a quem renderiza o nome como texto nativo')
    L.append('// fora do SVG (ex.: conceitos/E3Wordmark).')
    L.append('export const WORDMARK = {')
    for chave, titulo_svg in (('secundaria', 'Protocolo'), ('primaria', 'Ouroboros')):
        p = paths.get(titulo_svg)
        if p:
            L.append(f'  {chave}: {{')
            L.append(f"    d: '{p['d']}',")
            L.append(f"    fill: '{p['fill']}',")
            L.append('  },')
    L.append("  primariaTexto: 'OUROBOROS',")
    L.append("  secundariaTexto: 'PROTOCOLO',")
    L.append("  fontFamily: 'monospace',")
    L.append('};')
    L.append('')
    L.append('// Tipo de uma conta com id (para o ordenador de contas e drivers).')
    L.append('export interface ContaComId {')
    L.append('  id: string;')
    L.append('  cx: number;')
    L.append('  cy: number;')
    L.append('}')
    L.append('')
    L.append('// Produz a lista {id:\'conta-01\',cx,cy} a partir de CONTAS.')
    L.append('export function contasComId(): ContaComId[] {')
    L.append('  return CONTAS.map(([cx, cy], i) => ({')
    L.append("    id: `conta-${String(i + 1).padStart(2, '0')}`,")
    L.append('    cx,')
    L.append('    cy,')
    L.append('  }));')
    L.append('}')
    L.append('')

    open(saida, 'w').write('\n'.join(L))
    print(f'escrito: {saida} ({len(L)} linhas)')


if __name__ == '__main__':
    main()
