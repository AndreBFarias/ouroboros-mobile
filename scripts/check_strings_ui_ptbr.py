#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check_strings_ui_ptbr.py
========================

Auditor de strings UI em PT-BR para o Protocolo-Mob-Ouroboros.

Varre `src/` e `app/` por arquivos `.ts`/`.tsx`. Detecta strings literais
em contextos UI (JSX text node, props label/placeholder/title/message/frase)
e checa cada token contra `scripts/dicionario_ptbr_canonico.json`.
Tokens que aparecem sem acento e tem versao canonica acentuada no
dicionario sao reportados como violacao.

Regras:
- `accessibilityLabel` e ignorado (convencao screen reader, sempre sem
  acento).
- Linhas com comentario inline `// ptbr-allow: <razao>` na MESMA linha
  da string sao ignoradas (override por linha, com justificativa).
- Arquivo `.ptbr-violations.txt` na raiz lista paths excluidos
  temporariamente do check (retrofit pendente). Formato: um path
  relativo por linha; linhas iniciadas por `#` sao comentario.

Saida:
- Exit 0 se zero violacoes.
- Exit 1 com lista path:linha:coluna + sugestao se houver.

Uso:
    python3 scripts/check_strings_ui_ptbr.py
    python3 scripts/check_strings_ui_ptbr.py --json     # saida json
    python3 scripts/check_strings_ui_ptbr.py --verbose

Sem dependencias externas. Python 3.10+.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Iterable, NamedTuple

REPO_ROOT = Path(__file__).resolve().parent.parent
DICIONARIO_PATH = REPO_ROOT / "scripts" / "dicionario_ptbr_canonico.json"
EXCLUSAO_PATH = REPO_ROOT / ".ptbr-violations.txt"

# Diretorios alvo (relativos a REPO_ROOT)
TARGETS = ("src", "app")
EXTENSOES = (".ts", ".tsx")

# Props cujo valor e UI visivel (vai checar)
PROPS_UI = {
    "label",
    "placeholder",
    "title",
    "message",
    "frase",
    "subtitle",
    "heading",
    "description",
    "descricao",
    "texto",
    "hint",
    "rotulo",
    "headerTitle",
    "tituloSecao",
    "subtitulo",
    "titulo",
    "mensagem",
    "rotuloAcao",
    "labelAcao",
    "tituloAcao",
}

# Props que NAO devem ser checadas (a11y, IDs, paths, etc.)
PROPS_IGNORADAS = {
    "accessibilityLabel",
    "accessibilityHint",
    "accessibilityRole",
    "testID",
    "testId",
    "key",
    "id",
    "name",
    "nome",
    "href",
    "source",
    "src",
    "uri",
    "type",
    "tipo",
    "color",
    "cor",
    "icon",
    "iconName",
    "fontFamily",
    "className",
    "style",
}

# Marker de override por linha
ALLOW_MARKER = re.compile(r"//\s*ptbr-allow\s*:")

# Match de strings JSX em contextos UI:
# 1. Atributo JSX: <prop>="..." ou <prop>={'...'} ou <prop>={"..."}
RE_PROP_STRING = re.compile(
    r"""
    (?P<prop>\b[a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*
    (?:
        "(?P<dq>(?:[^"\\]|\\.)*)" |
        '(?P<sq>(?:[^'\\]|\\.)*)' |
        \{\s*['"](?P<bq>(?:[^'"\\]|\\.)*)['"]\s*\}
    )
    """,
    re.VERBOSE,
)

# 2. JSX text node: >Texto livre< (entre tags JSX)
# Heuristica simples: linha contendo ">..." onde ... tem letra acentuavel
# e termina em "<" ou newline-com-tag.
RE_JSX_TEXT_NODE = re.compile(
    r">(?P<txt>[^<{}>\n][^<{}>]*?[A-Za-zà-úÀ-Ú][^<{}>]*?)<"
)

# 3. Object literal property: { prop: 'X' } ou { prop: "X" }
# Precedido por `,` `{` ou inicio de linha para reduzir falso positivo
# de ternario tipo `cond ? a : 'X'` (separador `:` apos identificador
# nao precedido por whitespace de bloco). Exige whitespace ou inicio
# antes do nome da prop.
RE_OBJ_LITERAL_PROP = re.compile(
    r"""
    (?:^|[\{,(\[]|\s)\s*
    (?P<prop>[a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*
    (?:
        "(?P<dq>(?:[^"\\]|\\.)*)" |
        '(?P<sq>(?:[^'\\]|\\.)*)'
    )
    """,
    re.VERBOSE,
)


class Violacao(NamedTuple):
    arquivo: str
    linha: int
    coluna: int
    contexto: str  # "prop:label" | "jsx-text" | etc
    string_original: str
    token_problema: str
    sugestao: str


def carregar_dicionario() -> dict[str, str]:
    """Carrega dicionario_ptbr_canonico.json e retorna mapa sem_acento -> com_acento."""
    if not DICIONARIO_PATH.exists():
        print(f"ERRO: dicionario nao encontrado em {DICIONARIO_PATH}", file=sys.stderr)
        sys.exit(2)
    with DICIONARIO_PATH.open(encoding="utf-8") as f:
        data = json.load(f)
    palavras = data.get("palavras", {})
    # filtra apenas pares onde k != v (defesa)
    return {k.lower(): v for k, v in palavras.items() if k != v}


def carregar_exclusoes() -> set[str]:
    """Carrega lista de paths relativos excluidos temporariamente."""
    if not EXCLUSAO_PATH.exists():
        return set()
    excluidos: set[str] = set()
    with EXCLUSAO_PATH.open(encoding="utf-8") as f:
        for linha in f:
            s = linha.strip()
            if not s or s.startswith("#"):
                continue
            excluidos.add(s)
    return excluidos


def listar_arquivos(targets: Iterable[str]) -> list[Path]:
    arquivos: list[Path] = []
    for tgt in targets:
        base = REPO_ROOT / tgt
        if not base.exists():
            continue
        for ext in EXTENSOES:
            arquivos.extend(base.rglob(f"*{ext}"))
    return sorted(arquivos)


def tokenizar(texto: str) -> list[str]:
    """Quebra texto em tokens alfabeticos (lower)."""
    return re.findall(r"[A-Za-zà-úÀ-Ú]+", texto.lower())


def checar_string(
    string_original: str,
    dicionario: dict[str, str],
) -> tuple[str, str] | None:
    """
    Retorna (token_sem_acento, sugestao_completa) se houver violacao.
    Sugestao completa = string_original com o token substituido pela
    forma canonica.
    """
    tokens = tokenizar(string_original)
    for tok in tokens:
        if tok in dicionario:
            canonica = dicionario[tok]
            # Verifica se a forma canonica ja NAO esta presente no original
            # (case-insensitive). Se ja esta, nao e violacao (ex: o token
            # apareceu como substring de outra palavra).
            if canonica.lower() in string_original.lower():
                continue
            # Verifica que o token aparece como palavra inteira no original
            # (boundary). Senao, evita falso positivo (ex: "sao" em "Sao Paulo"
            # vs "sao" em "essao").
            padrao = re.compile(
                rf"(?<![A-Za-zà-úÀ-Ú]){re.escape(tok)}(?![A-Za-zà-úÀ-Ú])",
                re.IGNORECASE,
            )
            if not padrao.search(string_original):
                continue
            sugestao = padrao.sub(canonica, string_original, count=1)
            return tok, sugestao
    return None


def auditar_arquivo(
    path: Path,
    dicionario: dict[str, str],
) -> list[Violacao]:
    """Le um arquivo e retorna lista de violacoes."""
    violacoes: list[Violacao] = []
    rel = str(path.relative_to(REPO_ROOT))
    try:
        conteudo = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return violacoes
    for nlinha, linha in enumerate(conteudo.splitlines(), start=1):
        # Override por linha
        if ALLOW_MARKER.search(linha):
            continue

        # 1. Strings em props
        for m in RE_PROP_STRING.finditer(linha):
            prop = m.group("prop")
            if prop in PROPS_IGNORADAS:
                continue
            if prop not in PROPS_UI:
                continue
            valor = m.group("dq") or m.group("sq") or m.group("bq") or ""
            if not valor.strip():
                continue
            res = checar_string(valor, dicionario)
            if res:
                tok, sugestao = res
                col = m.start() + 1
                violacoes.append(
                    Violacao(
                        arquivo=rel,
                        linha=nlinha,
                        coluna=col,
                        contexto=f"prop:{prop}",
                        string_original=valor,
                        token_problema=tok,
                        sugestao=sugestao,
                    )
                )

        # 2. Object literal props ({ prop: 'X' })
        for m in RE_OBJ_LITERAL_PROP.finditer(linha):
            prop = m.group("prop")
            if prop in PROPS_IGNORADAS:
                continue
            if prop not in PROPS_UI:
                continue
            valor = m.group("dq") or m.group("sq") or ""
            if not valor.strip():
                continue
            res = checar_string(valor, dicionario)
            if res:
                tok, sugestao = res
                col = m.start() + 1
                violacoes.append(
                    Violacao(
                        arquivo=rel,
                        linha=nlinha,
                        coluna=col,
                        contexto=f"obj-prop:{prop}",
                        string_original=valor,
                        token_problema=tok,
                        sugestao=sugestao,
                    )
                )

        # 3. JSX text nodes
        for m in RE_JSX_TEXT_NODE.finditer(linha):
            txt = m.group("txt").strip()
            if not txt:
                continue
            # Filtra ruido: tags HTML, expressoes, codigo
            if txt.startswith("/") or txt.startswith("="):
                continue
            res = checar_string(txt, dicionario)
            if res:
                tok, sugestao = res
                col = m.start() + 1
                violacoes.append(
                    Violacao(
                        arquivo=rel,
                        linha=nlinha,
                        coluna=col,
                        contexto="jsx-text",
                        string_original=txt,
                        token_problema=tok,
                        sugestao=sugestao,
                    )
                )

    return violacoes


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Auditor de strings UI PT-BR para Protocolo-Mob-Ouroboros."
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Saida em JSON (uma linha por violacao).",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Mostra contagem de arquivos varridos.",
    )
    parser.add_argument(
        "--targets",
        nargs="+",
        default=list(TARGETS),
        help="Diretorios alvo (default: src app).",
    )
    args = parser.parse_args()

    dicionario = carregar_dicionario()
    exclusoes = carregar_exclusoes()
    arquivos = listar_arquivos(args.targets)

    arquivos_efetivos = [
        a for a in arquivos if str(a.relative_to(REPO_ROOT)) not in exclusoes
    ]

    if args.verbose:
        print(
            f"[ptbr-audit] dicionario: {len(dicionario)} pares; "
            f"arquivos varridos: {len(arquivos_efetivos)} "
            f"(excluidos {len(arquivos) - len(arquivos_efetivos)} via "
            f"{EXCLUSAO_PATH.name})",
            file=sys.stderr,
        )

    todas: list[Violacao] = []
    for arq in arquivos_efetivos:
        todas.extend(auditar_arquivo(arq, dicionario))

    if args.json:
        for v in todas:
            print(
                json.dumps(
                    {
                        "arquivo": v.arquivo,
                        "linha": v.linha,
                        "coluna": v.coluna,
                        "contexto": v.contexto,
                        "original": v.string_original,
                        "token": v.token_problema,
                        "sugestao": v.sugestao,
                    },
                    ensure_ascii=False,
                )
            )
    else:
        for v in todas:
            print(
                f"{v.arquivo}:{v.linha}:{v.coluna}: "
                f"[{v.contexto}] '{v.string_original}' "
                f"-> token '{v.token_problema}' sem acento; "
                f"sugestao: '{v.sugestao}'"
            )

    if todas:
        if not args.json:
            print()
            print(f"[ptbr-audit] {len(todas)} violacao(oes) detectada(s).")
            print(
                "[ptbr-audit] Para suprimir caso a caso, adicione comentario "
                "inline: // ptbr-allow: <razao>"
            )
            print(
                f"[ptbr-audit] Para excluir arquivos em batch (retrofit pendente), "
                f"adicione path em {EXCLUSAO_PATH.name}"
            )
        return 1
    if args.verbose:
        print("[ptbr-audit] OK: zero violacoes.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
