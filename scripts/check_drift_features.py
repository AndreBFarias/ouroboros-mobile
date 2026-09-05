#!/usr/bin/env python3
"""Avisa quando o codigo de integracoes muda sem mexer em FEATURES-CANONICAS.

AUDIT-P4-10. `docs/FEATURES-CANONICAS.md` se declara fonte de verdade unica
sobre o que o app faz, e a regra do projeto manda atualiza-lo no mesmo commit
de toda sprint que muda feature. Nao havia mecanismo nenhum verificando isso:
era convencao pura, e a auditoria de 2026-07-28 mostrou a convencao falhando
tres vezes seguidas nas integracoes -- a troca do pacote de Health Connect
pela bridge nativa, R-INT-4 (Spotify/YouTube) e R-INT-5 (Drive).

O custo do drift não e estetico. Antes da AUDIT-P4-3 o documento afirmava que
o projeto dependia de um pacote npm que não existe no package.json, e que tres
cards eram placeholders "Em breve" quando ja computavam estado real. Quem le
decide errado.

Regra unica, de proposito: se o diff toca as pastas vigiadas E não toca o
documento, avisa nomeando os arquivos. Nao valida o CONTEUDO do texto --
qualquer heuristica sobre a prosa seria falso-positivo garantido.

Advisory por design: nunca reprova. Promove-lo a bloqueante depende de
AUDIT-P3-1 (quality-gate como required check), e e decisao separada.

Uso:
  python3 scripts/check_drift_features.py                  # origin/main...HEAD
  python3 scripts/check_drift_features.py --base A --head B
  python3 scripts/check_drift_features.py --allow "refatoracao interna"

Exit: 0 sempre que o check roda (com ou sem achado). 2 so em erro de
invocacao -- git indisponivel ou range inválido.

Comentarios sem acento (convencao shell/CI).
"""
import argparse
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

DOC = 'docs/FEATURES-CANONICAS.md'

# Comeca pelas tres pastas onde o drift foi MEDIDO, não por todo src/.
# Ampliar depois, com evidencia -- vigiar demais e o caminho mais curto
# para o aviso virar ruido que todo mundo aprende a ignorar.
VIGIADAS = (
    'src/lib/integracoes/',
    'modules/health-connect/',
    'src/lib/health/',
)

# Escape hatch, no mesmo espirito do `// anonimato-allow:`. Refatoracao
# interna e correcao de bug que não muda comportamento visivel sao casos
# legitimos e frequentes; sem valvula, o check vira ruido.
MARCADOR_ALLOW = 'features-canonicas-allow:'


def git(*args: str) -> str:
    saida = subprocess.run(
        ['git', *args],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if saida.returncode != 0:
        raise RuntimeError(saida.stderr.strip() or f'git {" ".join(args)} falhou')
    return saida.stdout


def arquivos_do_range(base: str, head: str) -> list[str]:
    bruto = git('diff', '--name-only', f'{base}...{head}')
    return [linha.strip() for linha in bruto.splitlines() if linha.strip()]


def mensagens_do_range(base: str, head: str) -> str:
    return git('log', '--format=%B', f'{base}..{head}')


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Avisa sobre drift entre integracoes e FEATURES-CANONICAS.md.'
    )
    parser.add_argument('--base', default='origin/main')
    parser.add_argument('--head', default='HEAD')
    parser.add_argument(
        '--allow',
        default=None,
        help='Silencia o aviso, registrando o motivo na saida.',
    )
    args = parser.parse_args()

    try:
        arquivos = arquivos_do_range(args.base, args.head)
    except RuntimeError as err:
        print(f'ERRO: nao consegui ler o diff: {err}', file=sys.stderr)
        return 2

    gatilhos = [a for a in arquivos if a.startswith(VIGIADAS)]
    if not gatilhos:
        return 0

    if DOC in arquivos:
        return 0

    if args.allow:
        print(f'[drift-features] dispensado por --allow: {args.allow}')
        return 0

    try:
        corpo = mensagens_do_range(args.base, args.head)
    except RuntimeError:
        corpo = ''
    for linha in corpo.splitlines():
        if MARCADOR_ALLOW in linha:
            motivo = linha.split(MARCADOR_ALLOW, 1)[1].strip()
            print(f'[drift-features] dispensado pelo commit: {motivo or "(sem motivo)"}')
            return 0

    print(f'AVISO: {len(gatilhos)} arquivo(s) de integracao mudaram sem tocar {DOC}:')
    for a in gatilhos[:10]:
        print(f'    {a}')
    if len(gatilhos) > 10:
        print(f'    ... e mais {len(gatilhos) - 10}')
    print('  Se a mudanca altera o que o app FAZ, atualize o documento no mesmo commit.')
    print(f'  Se nao altera, escreva "{MARCADOR_ALLOW} <motivo>" no corpo do commit.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
