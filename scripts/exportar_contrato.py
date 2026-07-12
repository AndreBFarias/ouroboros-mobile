#!/usr/bin/env python3
"""
Q21 -- Exporta o contrato Mobile-Backend como CSV consumivel.

Parseia docs/CONTRACT-MOBILE-BACKEND.md (fonte canonica) extraindo as
tabelas "| Campo | Tipo | Obrigatorio | Notas |" de cada secao 5.N.
Gera CSV com colunas:

  schema_idx   -- numero da secao (5.1, 5.2, ...)
  schema_nome  -- nome canonico (humor, diario_emocional, ...)
  schema_versao -- versao atual extraida do bloco "Versao: N"
  campo        -- nome do campo
  tipo         -- tipo declarado (string, integer, etc.)
  obrigatorio  -- "sim" | "nao" | "sim (escrita)" etc.
  notas        -- coluna livre

Usado por:
  - Backend Python sibling (~/Desenvolvimento/protocolo-ouroboros)
    como referencia consumivel via pandas/csv.reader.
  - test_contract_drift.sh para detectar drift.

Saida default: stdout. Caller redireciona para
docs/CONTRACT-MOBILE-BACKEND.csv. Sem dependencias externas (stdlib
only) pra rodar em CI minimal.

Comentarios sem acento (convencao shell/CI).
"""

from __future__ import annotations

import csv
import re
import sys
from pathlib import Path
from typing import Iterator

RAIZ = Path(__file__).resolve().parent.parent
DOC = RAIZ / "docs" / "CONTRACT-MOBILE-BACKEND.md"

RE_SECAO = re.compile(r"^### (\d+\.\d+)\s+(.+?)\s*$")
RE_VERSAO = re.compile(r"\*\*Vers[aã]o\*\*\s*:\s*(\d+)")
RE_TABELA_INICIO = re.compile(r"^\|\s*Campo\s*\|\s*Tipo\s*\|\s*Obrigat[oó]rio\s*\|", re.IGNORECASE)
RE_LINHA_TABELA = re.compile(r"^\|(.+)\|\s*$")


def limpar_celula(s: str) -> str:
    return s.strip().strip("`")


def iter_linhas_tabela(linhas: list[str], inicio: int) -> Iterator[list[str]]:
    """Itera linhas validas (descarta o cabecalho e o divisor)."""
    idx = inicio + 1
    if idx < len(linhas) and re.match(r"^\|\s*---", linhas[idx]):
        idx += 1
    while idx < len(linhas):
        l = linhas[idx]
        if not l.startswith("|"):
            break
        m = RE_LINHA_TABELA.match(l)
        if not m:
            break
        # Markdown permite escape de pipe interno via "\|". Trocamos
        # por placeholder pra preservar valores como "pessoa_a | pessoa_b".
        bruto = m.group(1).replace("\\|", "\x00")
        partes = [limpar_celula(p).replace("\x00", "|") for p in bruto.split("|")]
        # Tabela esperada: 4 colunas (Campo, Tipo, Obrigatorio, Notas).
        if len(partes) >= 3:
            yield partes
        idx += 1


def extrair() -> Iterator[dict[str, str]]:
    if not DOC.exists():
        print(f"erro: {DOC} nao encontrado", file=sys.stderr)
        sys.exit(2)
    linhas = DOC.read_text(encoding="utf-8").splitlines()

    schema_idx = ""
    schema_nome = ""
    schema_versao = ""

    i = 0
    while i < len(linhas):
        l = linhas[i]
        m_sec = RE_SECAO.match(l)
        if m_sec:
            schema_idx = m_sec.group(1)
            schema_nome = m_sec.group(2).strip()
            schema_versao = ""
            i += 1
            continue
        m_ver = RE_VERSAO.search(l)
        if m_ver and schema_idx:
            schema_versao = m_ver.group(1)
        if RE_TABELA_INICIO.match(l) and schema_idx:
            for partes in iter_linhas_tabela(linhas, i):
                campo = partes[0]
                tipo = partes[1] if len(partes) > 1 else ""
                obrig = partes[2] if len(partes) > 2 else ""
                notas = partes[3] if len(partes) > 3 else ""
                yield {
                    "schema_idx": schema_idx,
                    "schema_nome": schema_nome,
                    "schema_versao": schema_versao,
                    "campo": campo,
                    "tipo": tipo,
                    "obrigatorio": obrig,
                    "notas": notas,
                }
        i += 1


def main() -> int:
    saida = csv.DictWriter(
        sys.stdout,
        fieldnames=[
            "schema_idx",
            "schema_nome",
            "schema_versao",
            "campo",
            "tipo",
            "obrigatorio",
            "notas",
        ],
        quoting=csv.QUOTE_MINIMAL,
    )
    saida.writeheader()
    total = 0
    for linha in extrair():
        saida.writerow(linha)
        total += 1
    print(f"# total: {total} campos auditados", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
