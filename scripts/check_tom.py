#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check_tom.py
============

Gate de tom para o Protocolo-Mob-Ouroboros (decisao P8 do dono,
2026-09-08). A Regra de Tom (`docs/CONTEXTO.md` Secao 5) era, ate aqui, a
unica regra da seção que se declarava "enforced via revisao manual e
checklist de PR": nenhum script em `scripts/` checava emoji ou exclamacao.
Com o repositorio publico e aberto a contribuicao externa, revisao manual
deixa de escalar -- a primeira PR bem-intencionada com um emoji de
comemoracao passa.

O QUE ESTE GATE VERIFICA -- e so isto
-------------------------------------
1. **Emoji** em codigo de UI (`src/`, `app/`) e na prosa de documento
   `.md` versionado.
2. **Ponto de exclamacao** em string de UI.

O QUE ESTE GATE NÃO VERIFICA -- e continua dependendo de revisao humana
-----------------------------------------------------------------------
A Regra de Tom tem quatro clausulas. Este gate cobre duas, porque as
outras duas **não sao detectaveis por regex**:

- **Comparativo negativo** ("30% pior que ontem", "menos que na semana
  passada"). Depende de comparar duas grandezas e julgar a direção; o
  texto sozinho não carrega o sinal.
- **Gamificacao** (streak, badge, ranking entre as pessoas, celebracao de
  marco, "voce conseguiu"). Uma lista de palavras proibidas ou acusa
  `docs/ADRs/0005-sem-gamificacao.md`, que fala do assunto para proibi-lo,
  ou deixa passar a proxima formulacao que ninguem listou.

Este cabecalho existe porque o projeto ja foi mordido por gate que dizia
verificar o que não verificava (`AUDIT-P3-2`: o smoke anunciava lint e
engolia o exit code por dois anos). **Um gate verde aqui não e atestado de
tom correto** -- e atestado de ausencia de emoji e de exclamacao.

Definicao de emoji, e o que fica de fora de proposito
-----------------------------------------------------
Emoji e o caractere com **apresentacao emoji por padrão**
(`Emoji_Presentation=Yes` do UTS #51), mais qualquer caractere seguido do
seletor de variacao U+FE0F, mais o keycap U+20E3.

Fica de fora, por decisao medida e não por omissao: seta (`->`, U+2192,
408 ocorrencias na arvore em 2026-09-08), `(c)`, `(R)`, `(TM)` e os
dingbats de checagem. Nenhum deles e emoji por padrão -- todos renderizam
como texto -- e varre-los transformaria a tipografia corrente da
documentacao em violacao. Adicionar essas faixas seria falso positivo, não
rigor.

Escopo padrão (sem argumento)
------------------------------
- Codigo: `src/` e `app/`, extensoes `.ts` `.tsx` `.js` `.jsx`. Mesmo
  escopo de `check_strings_ui_ptbr.py`.
- Documento: todo `.md` **rastreado** pelo git, mais todo `.md` nao
  rastreado que o `.gitignore` **não** exclui -- ou seja, o que ja esta
  publico mais o que vai estar no próximo `git add`. Arquivo gitignored
  (`VALIDATOR_BRIEF.md`, `STATE.md`, `Checkpoint.md`) fica de fora: e
  material privado de sessão, não documento do projeto.

Emoji em codigo e procurado na **linha inteira**, inclusive em
comentario: não existe posicao legitima para ele num `.ts`/`.tsx` deste
projeto. Exclamacao, não -- `!` e operador em JS/TS, entao so e acusada
dentro de string reconhecida como UI.

Quais strings sao "de UI"
--------------------------
As quatro formas canonicas de uma string chegar a tela, reusadas
diretamente de `check_strings_ui_ptbr.py` (import, não copia): atributo
JSX, texto entre tags, propriedade de objeto literal e primeiro argumento
posicional das funções imperativas de `FUNCS_UI`. Reusar em vez de
duplicar tem consequencia declarada: **as duas listas curadas de la
(`PROPS_UI` e `FUNCS_UI`) sao o limite deste gate tambem**. Prop de UI
nova que não entre em `PROPS_UI` fica invisivel para os dois gates de uma
vez. Foi assim que quatro strings sem acento sobreviveram ate a
`AUDIT-P3-6`.

Ruido ignorado, sem perder numeracao de linha
----------------------------------------------
Em `.md`: bloco cercado por tres crases ou tres tis, e span em crase na
mesma linha. Emoji dentro de bloco de codigo de exemplo **não e
violacao** -- e frequentemente e o próprio exemplo do que não fazer. O
conteudo mascarado vira espaco, entao `caminho:linha:coluna` continua
apontando para o lugar certo no arquivo original.

Isencao por linha
------------------
Marcador `tom-allow: <razao>` na MESMA linha, no mesmo espirito de
`// ptbr-allow:`, `// anonimato-allow:` e `test-data-allow:`. Serve tanto
em comentario de codigo (`// tom-allow: ...`) quanto em HTML comment de
markdown (`<!-- tom-allow: ... -->`). Decisao por linha, com
justificativa, nunca bypass em bloco.

Uso
----
    python3 scripts/check_tom.py                       # conjunto padrão
    python3 scripts/check_tom.py src/components        # caminhos
    python3 scripts/check_tom.py docs/CONTEXTO.md a.md
    python3 scripts/check_tom.py --verbose

O argumento posicional não e conveniencia: e o que permite ao teste do
próprio gate (`tests/scripts/check-tom-gate.test.ts`) apontar para uma
fixture em diretório temporario, sem tocar o repositorio.

Saida
------
- Exit 0: zero violacoes.
- Exit 1: uma linha `caminho:linha:coluna` por violacao, com o caractere
  ofensor.
- Exit 2: erro de invocacao (caminho inexistente, git indisponivel).

Sem dependencias externas. Python 3.10+.
Comentarios sem acento (convencao dos gates deste diretório).
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable, NamedTuple

# Evita gerar scripts/__pycache__ ao importar o gate irmao: o diretório
# não esta no .gitignore, e sujeira untracked em scripts/ e exatamente o
# tipo de coisa que some no meio de 600 entradas de `git status`.
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))

import check_strings_ui_ptbr as ptbr  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent

CODE_DIRS = ("src", "app")
CODE_EXT = (".ts", ".tsx", ".js", ".jsx")
DOC_EXT = (".md",)

ALLOW_MARKER = re.compile(r"tom-allow\s*:")

# Faixas com Emoji_Presentation=Yes (UTS #51 / emoji-data.txt). As do BMP
# sao enumeradas porque o bloco vizinho e cheio de sinal tipografico que
# NÃO e emoji; as dos planos suplementares sao pictograficas por inteiro.
FAIXAS_EMOJI: tuple[tuple[int, int], ...] = (
    (0x231A, 0x231B),
    (0x23E9, 0x23EC),
    (0x23F0, 0x23F0),
    (0x23F3, 0x23F3),
    (0x25FD, 0x25FE),
    (0x2614, 0x2615),
    (0x2648, 0x2653),
    (0x267F, 0x267F),
    (0x2693, 0x2693),
    (0x26A1, 0x26A1),
    (0x26AA, 0x26AB),
    (0x26BD, 0x26BE),
    (0x26C4, 0x26C5),
    (0x26CE, 0x26CE),
    (0x26D4, 0x26D4),
    (0x26EA, 0x26EA),
    (0x26F2, 0x26F3),
    (0x26F5, 0x26F5),
    (0x26FA, 0x26FA),
    (0x26FD, 0x26FD),
    (0x2705, 0x2705),
    (0x270A, 0x270B),
    (0x2728, 0x2728),
    (0x274C, 0x274C),
    (0x274E, 0x274E),
    (0x2753, 0x2755),
    (0x2757, 0x2757),
    (0x2795, 0x2797),
    (0x27B0, 0x27B0),
    (0x27BF, 0x27BF),
    (0x2B1B, 0x2B1C),
    (0x2B50, 0x2B50),
    (0x2B55, 0x2B55),
    (0x1F000, 0x1F0FF),
    (0x1F100, 0x1F1FF),
    (0x1F200, 0x1F2FF),
    (0x1F300, 0x1F5FF),
    (0x1F600, 0x1F64F),
    (0x1F680, 0x1F6FF),
    (0x1F7E0, 0x1F7EB),
    (0x1F900, 0x1F9FF),
    (0x1FA70, 0x1FAFF),
)

# Seletor de variacao emoji: pede apresentacao emoji para um caractere que
# por padrão e texto. Presente = alguem quis um emoji ali.
VS16 = 0xFE0F
KEYCAP = 0x20E3

# Classe de caracteres montada a partir das faixas acima. Varrer caractere
# a caractere em Python custava 16s sobre a arvore inteira -- 21% do smoke
# por um check que não achou nada. Com a classe compilada, a varredura
# desce a 1s.
RE_EMOJI = re.compile(
    "["
    + "".join(f"\\U{a:08X}-\\U{b:08X}" for a, b in FAIXAS_EMOJI)
    + f"\\U{VS16:08X}\\U{KEYCAP:08X}]"
)

FENCE = re.compile(r"^\s{0,3}(`{3,}|~{3,})")
SPAN_CRASE = re.compile(r"(`+)(?:[^`]|(?!\1)`)*?\1")

# `!` e pontuacao quando FECHA uma palavra ("Pronto!", "Salvo!"); e
# operador quando ABRE uma expressao (`!feito`, `!==`, `!isVazio(x)`).
# A distincao não e enfeite: o heuristico de texto entre tags herdado de
# check_strings_ui_ptbr.py casa `>...<` por regex e não sabe se aquilo e
# JSX ou codigo. Medido em 2026-09-08, o único falso positivo da arvore
# inteira era `(t) => !t.meta.feito && t.meta.data <` em
# src/lib/tarefas/rollover.ts:49 -- a seta do arrow function fornecia o
# `>` e a comparacao fornecia o `<`. Exigir caractere de palavra antes do
# `!` derruba esse caso e preserva toda exclamacao de prosa.
#
# Limite conhecido, declarado em vez de escondido: exclamacao logo depois
# de interpolacao (`<Text>{nome}!</Text>`) escapa, porque o padrão herdado
# exclui `{` e `}` por construcao.
RE_EXCLAMACAO_PROSA = re.compile(r"[\w?)\"']!")


class Violacao(NamedTuple):
    arquivo: str
    linha: int
    coluna: int
    tipo: str  # "emoji" | "exclamacao"
    detalhe: str


def achar_emoji(texto: str) -> list[tuple[int, str]]:
    """Devolve [(coluna 1-based, caractere ofensor)] do texto dado."""
    achados: list[tuple[int, str]] = []
    for m in RE_EMOJI.finditer(texto):
        i = m.start()
        # Com VS16, reporta o par (base + seletor) para o humano ver o
        # glifo inteiro, e não um caractere invisivel solto.
        if ord(m.group(0)) == VS16 and i > 0:
            achados.append((i, texto[i - 1] + m.group(0)))
        else:
            achados.append((i + 1, m.group(0)))
    return achados


def descrever_emoji(trecho: str) -> str:
    pontos = " ".join(f"U+{ord(c):04X}" for c in trecho)
    return f"{pontos} ({trecho})"


def mascarar_markdown(linhas: list[str]) -> list[str]:
    """
    Substitui por espaco o conteudo de bloco cercado e de span em crase,
    preservando a quantidade de linhas e a coluna de tudo que sobra.
    """
    saida: list[str] = []
    cerca_aberta: str | None = None
    for linha in linhas:
        m = FENCE.match(linha)
        if cerca_aberta is None:
            if m:
                cerca_aberta = m.group(1)[0]
                saida.append(" " * len(linha))
                continue
            saida.append(SPAN_CRASE.sub(lambda x: " " * len(x.group(0)), linha))
        else:
            if m and m.group(1)[0] == cerca_aberta:
                cerca_aberta = None
            saida.append(" " * len(linha))
    return saida


def strings_ui(linha: str) -> list[tuple[int, str, str]]:
    """
    Devolve [(coluna 1-based, contexto, valor)] das strings de UI da
    linha. As quatro formas vem de check_strings_ui_ptbr.py; ver o
    cabecalho para o limite herdado.
    """
    achados: list[tuple[int, str, str]] = []

    for m in ptbr.RE_PROP_STRING.finditer(linha):
        prop = m.group("prop")
        if prop in ptbr.PROPS_IGNORADAS or prop not in ptbr.PROPS_UI:
            continue
        valor = m.group("dq") or m.group("sq") or m.group("bq") or ""
        if valor.strip():
            achados.append((m.start() + 1, f"prop:{prop}", valor))

    for m in ptbr.RE_OBJ_LITERAL_PROP.finditer(linha):
        prop = m.group("prop")
        if prop in ptbr.PROPS_IGNORADAS or prop not in ptbr.PROPS_UI:
            continue
        valor = m.group("dq") or m.group("sq") or ""
        if valor.strip():
            achados.append((m.start() + 1, f"obj-prop:{prop}", valor))

    for m in ptbr.RE_JSX_TEXT_NODE.finditer(linha):
        txt = m.group("txt").strip()
        if not txt or txt.startswith("/") or txt.startswith("="):
            continue
        achados.append((m.start() + 1, "jsx-text", txt))

    for m in ptbr.RE_FUNC_ARG_STRING.finditer(linha):
        fn = m.group("fn")
        if fn not in ptbr.FUNCS_UI:
            continue
        valor = m.group("dq") or m.group("sq") or ""
        if valor.strip():
            achados.append((m.start() + 1, f"func-arg:{fn}", valor))

    return achados


def auditar_codigo(path: Path, rel: str) -> list[Violacao]:
    violacoes: list[Violacao] = []
    try:
        conteudo = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return violacoes
    for n, linha in enumerate(conteudo.splitlines(), start=1):
        if ALLOW_MARKER.search(linha):
            continue
        for col, trecho in achar_emoji(linha):
            violacoes.append(
                Violacao(rel, n, col, "emoji", descrever_emoji(trecho))
            )
        for col, contexto, valor in strings_ui(linha):
            if RE_EXCLAMACAO_PROSA.search(valor):
                violacoes.append(
                    Violacao(
                        rel,
                        n,
                        col,
                        "exclamacao",
                        f"[{contexto}] '{valor}'",
                    )
                )
    return violacoes


def auditar_documento(path: Path, rel: str) -> list[Violacao]:
    violacoes: list[Violacao] = []
    try:
        conteudo = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return violacoes
    originais = conteudo.splitlines()
    for n, (original, prosa) in enumerate(
        zip(originais, mascarar_markdown(originais)), start=1
    ):
        if ALLOW_MARKER.search(original):
            continue
        for col, trecho in achar_emoji(prosa):
            violacoes.append(
                Violacao(rel, n, col, "emoji", descrever_emoji(trecho))
            )
    return violacoes


def git_saida(*args: str) -> list[str]:
    try:
        r = subprocess.run(
            ["git", *args],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
    except (OSError, subprocess.CalledProcessError) as e:
        print(f"ERRO: git indisponivel ou falhou: {e}", file=sys.stderr)
        sys.exit(2)
    return [l for l in r.stdout.splitlines() if l.strip()]


def docs_versionados() -> list[Path]:
    """
    `.md` rastreado + `.md` untracked que o .gitignore não exclui. O
    segundo conjunto existe porque a armadilha simetrica ja mordeu este
    projeto: arquivo novo esquecido fora do `git add` passa no gate local
    e reprova no CI, onde ele ja esta commitado.
    """
    rastreados = git_saida("ls-files", "--", "*.md")
    novos = git_saida("ls-files", "--others", "--exclude-standard", "--", "*.md")
    vistos: dict[str, Path] = {}
    for rel in rastreados + novos:
        p = REPO_ROOT / rel
        if p.is_file():
            vistos[rel] = p
    return [vistos[k] for k in sorted(vistos)]


def codigo_padrao() -> list[Path]:
    arquivos: list[Path] = []
    for d in CODE_DIRS:
        base = REPO_ROOT / d
        if not base.exists():
            continue
        for ext in CODE_EXT:
            arquivos.extend(base.rglob(f"*{ext}"))
    return sorted(arquivos)


def expandir(caminhos: Iterable[str]) -> tuple[list[Path], list[Path]]:
    """Classifica caminhos explicitos em (codigo, documentos)."""
    codigo: list[Path] = []
    docs: list[Path] = []
    for c in caminhos:
        p = Path(c)
        if not p.exists():
            print(f"ERRO: caminho inexistente: {c}", file=sys.stderr)
            sys.exit(2)
        candidatos = sorted(x for x in p.rglob("*") if x.is_file()) if p.is_dir() else [p]
        for x in candidatos:
            if x.suffix in CODE_EXT:
                codigo.append(x)
            elif x.suffix in DOC_EXT:
                docs.append(x)
            elif not p.is_dir():
                print(
                    f"AVISO: extensao nao auditada, ignorado: {x}",
                    file=sys.stderr,
                )
    return codigo, docs


def rel_de(p: Path) -> str:
    try:
        return str(p.resolve().relative_to(REPO_ROOT))
    except ValueError:
        return str(p)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Gate de tom: emoji em UI e em documento, exclamacao em string "
            "de UI. Nao cobre comparativo negativo nem gamificacao -- ver o "
            "cabecalho do script."
        )
    )
    parser.add_argument(
        "caminhos",
        nargs="*",
        help="arquivos ou diretórios; sem argumento, varre o conjunto padrão",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="mostra contagem de arquivos varridos",
    )
    args = parser.parse_args()

    if args.caminhos:
        codigo, docs = expandir(args.caminhos)
    else:
        codigo, docs = codigo_padrao(), docs_versionados()

    if args.verbose:
        print(
            f"[tom] {len(codigo)} arquivo(s) de codigo, "
            f"{len(docs)} documento(s) .md",
            file=sys.stderr,
        )

    todas: list[Violacao] = []
    for p in codigo:
        todas.extend(auditar_codigo(p, rel_de(p)))
    for p in docs:
        todas.extend(auditar_documento(p, rel_de(p)))

    for v in todas:
        print(f"{v.arquivo}:{v.linha}:{v.coluna}: {v.tipo}: {v.detalhe}")

    if todas:
        n_emoji = sum(1 for v in todas if v.tipo == "emoji")
        n_excl = len(todas) - n_emoji
        print()
        print(
            f"ERRO: tom violado -- {n_emoji} emoji, {n_excl} exclamacao "
            f"em string de UI."
        )
        print(
            "Regra de Tom (docs/CONTEXTO.md Seção 5): zero emoji, zero "
            "exclamacao em feedback."
        )
        print(
            "Isencao por linha, com justificativa: 'tom-allow: <razao>' na "
            "mesma linha."
        )
        return 1

    print("OK: tom preservado (zero emoji, zero exclamacao em UI)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
