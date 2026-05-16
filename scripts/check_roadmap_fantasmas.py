#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check_roadmap_fantasmas.py
==========================

Detector de sprints fantasmas no ROADMAP.md. Sprint fantasma e linha
marcada como `[todo]`, `[backlog]`, `[spec]` ou `[wip]` mas cuja
entrega ja existe no codigo, no git ou em FEATURES-CANONICAS.

Cruza 3 fontes de evidencia:

1. **Intra-ROADMAP**: se o mesmo Sprint ID aparece em linha `[ok]`
   em algum lugar do proprio arquivo, a linha `[todo]` da mesma ID
   e fantasma direto.
2. **Git log**: `git log --all --oneline --grep="<id>"`.
3. **Codigo**: arquivos em `src/`, `app/`, `tests/` que mencionam o
   ID (word-boundary).
4. **FEATURES-CANONICAS**: mencao do ID em
   `docs/FEATURES-CANONICAS.md`.

Classificacao:

- **FANTASMA** (alta confianca): >= 3 evidencias OU evidencia intra-roadmap.
- **SUSPEITO** (media): 1-2 evidencias externas.
- **REAL** (baixa): 0 evidencias.

Saida: texto humano-legivel agrupado por classificacao.

Uso:
    python3 scripts/check_roadmap_fantasmas.py             # report
    python3 scripts/check_roadmap_fantasmas.py --warn-only # exit 0 sempre
    python3 scripts/check_roadmap_fantasmas.py --fix       # marca [ok] no arquivo
    python3 scripts/check_roadmap_fantasmas.py --json      # saida json

Sem dependencias externas. Python 3.10+.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Iterable

REPO_ROOT = Path(__file__).resolve().parent.parent
ROADMAP_PATH = REPO_ROOT / "ROADMAP.md"
FEATURES_PATH = REPO_ROOT / "docs" / "FEATURES-CANONICAS.md"

# Diretorios alvo para cross-reference de codigo
TARGETS = ("src", "app", "tests")
EXTENSOES = (".ts", ".tsx", ".py", ".sh", ".md")

# Regex de Sprint ID. Cobre formatos canonicos:
# - M01, M01.1, M01.1.a
# - M-GAUNTLET, M-PT-BR-AUDIT, M-AUDIT-MIGUE-FRASE-WEB-MOCK
# - Q0, Q11.a, Q24.b.a
# - R0, R-CRIT-1, R-RECAP-1, R-SEC-1, R-A11Y-TALKBACK
# - G1, G2.1
# - AUDIT-T1, AUDIT-T1B7-DRAFT-EXPORT-FIX
# - I-DIARIO-REFLEXAO
# - INFRA-acentuacao-comentarios
# - V4.0.2-1
# - S1, S4
# - L1
# - O1
# - MOB-bridge-1, MOB-bridge-2
# - F-14, F-15, F-16, F-17 (funcoes, nao sprints)
#
# Mantemos os IDs minimamente especificos (>= 2 chars, hifen ou ponto)
# para evitar capturar coisas comuns ("v1.0", "B2", etc).
# IDs terminam com letra/digito (nao hifen, nao ponto). Lookahead
# negativo `(?![A-Za-z0-9.-])` garante separacao forte do contexto.
SPRINT_ID_REGEX = re.compile(
    r"""
    \b
    (
        # M-prefixados nominais (M-GAUNTLET, M-PT-BR-AUDIT...)
        M-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*
      |
        # M numericos com sufixo nominal (M14-FOLLOWUP-BACKEND-DELTA-TEXTUAL)
        M\d+(?:\.\d+)?-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*
      |
        # AUDIT-prefixados
        AUDIT-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*
      |
        # I-prefixados (I-DIARIO-REFLEXAO)
        I-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*
      |
        # INFRA-prefixados (com letras minusculas permitidas)
        INFRA-[a-zA-Z][a-zA-Z0-9]*(?:-[a-zA-Z0-9]+)*
      |
        # MOB-bridge-N
        MOB-bridge-\d+
      |
        # R-prefixados (R-CRIT-1, R-RECAP-1, R-A11Y-TALKBACK)
        R-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*
      |
        # V4.0.2-N
        V\d+\.\d+\.\d+(?:-\d+)?
      |
        # M numericos: M01, M01.1, M01.1.a (M14 SEM hifen seguinte)
        M\d+(?:\.\d+)?(?:\.[a-z])?
      |
        # Q numericos: Q0, Q11.a, Q24.b.a
        Q\d+(?:\.[a-z])?(?:\.[a-z])?
      |
        # R0 sem hifen
        R\d+
      |
        # G-numericos
        G\d+(?:\.\d+)?
      |
        # S-numericos
        S\d+
      |
        # F-NN (funcoes)
        F-\d+
      |
        # L1, O1 (numero unico)
        [LO]\d+
    )
    (?![A-Za-z0-9.-])
    """,
    re.VERBOSE,
)

# Status sinalizadores
STATUS_PENDENTE = {"todo", "backlog", "spec", "wip"}
STATUS_OK = {"ok", "ok mvp", "done", "para", "v1.1", "v2"}

# Linhas de tabela markdown comecam com `|`
LINHA_TABELA_REGEX = re.compile(r"^\s*\|")

# Status entre colchetes: `[todo]`, `[ok]`, `[ok mvp]`, etc.
STATUS_REGEX = re.compile(r"\[([a-z][a-z0-9 ]*)\]")


@dataclass
class LinhaSprint:
    """Linha de ROADMAP com tabela contendo sprint."""

    numero_linha: int
    texto: str
    sprint_ids: list[str]
    statuses: list[str]

    @property
    def tem_pendente(self) -> bool:
        return any(s in STATUS_PENDENTE for s in self.statuses)

    @property
    def tem_ok(self) -> bool:
        return any(s in STATUS_OK for s in self.statuses)


@dataclass
class EvidenciaSprint:
    """Evidencias coletadas para uma sprint."""

    sprint_id: str
    intra_roadmap_ok_linhas: list[int] = field(default_factory=list)
    commits: list[str] = field(default_factory=list)
    arquivos_codigo: list[str] = field(default_factory=list)
    mencoes_features: int = 0

    @property
    def total_evidencias_externas(self) -> int:
        """Numero de fontes externas (max 3) com evidencia positiva."""
        return (
            (1 if self.commits else 0)
            + (1 if self.arquivos_codigo else 0)
            + (1 if self.mencoes_features > 0 else 0)
        )

    def classificar(self, pendente_em_linhas: list[int]) -> str:
        """Retorna 'FANTASMA' / 'SUSPEITO' / 'REAL'."""
        if self.intra_roadmap_ok_linhas:
            # Mesmo arquivo afirma `[ok]` em outra linha — fantasma direto.
            return "FANTASMA"
        if self.total_evidencias_externas >= 3:
            return "FANTASMA"
        if self.total_evidencias_externas >= 1:
            return "SUSPEITO"
        return "REAL"


# Mapping canonico de Sprint ID -> arquivo no codigo (manual). Usado
# como fallback quando a busca textual nao encontra menca direta mas
# a feature foi entregue sob outro nome de arquivo.
SPRINT_MAP_CANONICO: dict[str, list[str]] = {
    "M11": [
        "src/components/screens/SaudeFisicaScreen.tsx",
        "src/components/screens/MemoriasScreen.tsx",
    ],
    "M40": ["app/index.tsx"],
    "M30": ["src/lib/alarmes/"],
    "M31": ["src/lib/tarefas/"],
    "M32": ["src/lib/contadores/"],
    "M29": ["src/lib/stores/settings.ts"],
    "M27": ["src/components/chrome/MenuLateral.tsx", "src/components/chrome/FABMenu.tsx"],
    "M20": ["src/lib/widgets/"],
    "M28": ["src/lib/stores/pessoa.ts"],
    "M37.1": ["src/lib/integracoes/googleAuthFlow.ts"],
    "M14.5": ["src/components/screens/CicloMenstrualScreen.tsx"],
}


def listar_arquivos_para_grep(roots: Iterable[str]) -> list[Path]:
    """Lista arquivos relevantes para cross-reference."""
    arquivos: list[Path] = []
    for root in roots:
        base = REPO_ROOT / root
        if not base.is_dir():
            continue
        for entrada in base.rglob("*"):
            if not entrada.is_file():
                continue
            if entrada.suffix not in EXTENSOES:
                continue
            arquivos.append(entrada)
    return arquivos


def extrair_celulas(linha: str) -> list[str]:
    """Divide linha tabela markdown em celulas (sem pipes externos)."""
    # Remove pipes inicial/final, depois divide.
    stripped = linha.strip()
    if stripped.startswith("|"):
        stripped = stripped[1:]
    if stripped.endswith("|"):
        stripped = stripped[:-1]
    return [c.strip() for c in stripped.split("|")]


def parse_roadmap(path: Path) -> list[LinhaSprint]:
    """
    Le ROADMAP.md e retorna linhas-tabela com sprint IDs.

    Para reduzir falsos positivos, captura ID **apenas das celulas
    adjacentes ao status** (mesma celula do status ou celulas
    imediatamente vizinhas). IDs em texto livre da descricao sao
    ignorados.
    """
    if not path.exists():
        raise FileNotFoundError(f"ROADMAP nao encontrado em {path}")
    linhas: list[LinhaSprint] = []
    for idx, texto in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not LINHA_TABELA_REGEX.match(texto):
            continue
        statuses = [m.group(1).lower() for m in STATUS_REGEX.finditer(texto)]
        if not statuses:
            continue
        # Separa em celulas e descobre quais contem status
        celulas = extrair_celulas(texto)
        indices_status = [i for i, c in enumerate(celulas) if STATUS_REGEX.search(c)]
        if not indices_status:
            continue
        # Coleta IDs **apenas** das celulas adjacentes ao status: mesma
        # ou +/-1. Janela maior captura ID dentro da descricao da sprint,
        # gerando falsos positivos (M41 em "Bloqueia M41 (release final)").
        # Cobre as 3 estruturas principais:
        # - "| Status | ID | Descr ...": status idx 0, ID idx 1 -> +1
        # - "| ID | Descr | ... | Status |": status na ultima, ID idx 0
        #   -> proximo do final eh status, mas no formato canonico do
        #   roadmap ID fica na primeira posicao; relax via padrao "+/-1"
        #   pegaria apenas a celula 0 quando status estiver na N-1 e a
        #   tabela for de 4 colunas (Status na coluna 3, ID na 0) — caso
        #   nao adjacente. Solucao: tambem buscar o **primeiro** ID nao-F
        #   da linha como fallback.
        celulas_alvo: set[int] = set()
        for i_status in indices_status:
            for delta in (-1, 0, 1):
                idx_celula = i_status + delta
                if 0 <= idx_celula < len(celulas):
                    celulas_alvo.add(idx_celula)
        # Fallback: tabelas com ID na primeira coluna e status na ultima
        # (formato Onda R: "| ID | Descr | Estim | Status |"). Se status
        # ja esta no fim da linha, inclui a primeira celula.
        if max(indices_status) >= len(celulas) - 2:
            celulas_alvo.add(0)
        textos_alvo = " | ".join(celulas[i] for i in sorted(celulas_alvo))
        ids_brutos = SPRINT_ID_REGEX.findall(textos_alvo)
        sprint_ids: list[str] = []
        for match in ids_brutos:
            if isinstance(match, tuple):
                sprint_ids.append(match[0])
            else:
                sprint_ids.append(match)
        # Dedup preservando ordem
        sprint_ids = list(dict.fromkeys(sprint_ids))
        # Excluir IDs F-N (funcoes — referencias a features, nao sprints)
        # e versoes em tags (v1.0, v0.1)
        sprint_ids = [
            sid for sid in sprint_ids
            if not sid.startswith("F-")
            and not re.fullmatch(r"v\d+(\.\d+)*", sid, re.IGNORECASE)
        ]
        if not sprint_ids:
            continue
        linhas.append(
            LinhaSprint(
                numero_linha=idx,
                texto=texto,
                sprint_ids=sprint_ids,
                statuses=statuses,
            )
        )
    return linhas


def coletar_commits_git(sprint_id: str, ativo: bool = True) -> list[str]:
    """Retorna lista de hashes que mencionam o ID no log."""
    if not ativo:
        return []
    try:
        out = subprocess.run(
            [
                "git",
                "log",
                "--all",
                "--oneline",
                f"--grep={re.escape(sprint_id)}",
                "--extended-regexp",
            ],
            capture_output=True,
            text=True,
            check=False,
            cwd=REPO_ROOT,
        )
    except FileNotFoundError:
        return []
    if out.returncode != 0:
        return []
    hashes: list[str] = []
    pattern = re.compile(r"\b" + re.escape(sprint_id) + r"\b")
    for linha in out.stdout.splitlines():
        linha = linha.strip()
        if not linha:
            continue
        if not pattern.search(linha):
            # `--grep` pode dar match parcial sem word-boundary; filtramos.
            continue
        sha = linha.split(maxsplit=1)[0]
        hashes.append(sha)
    return hashes


def coletar_arquivos_codigo(sprint_id: str, arquivos: list[Path]) -> list[str]:
    """Retorna paths relativos que mencionam ID com word-boundary."""
    if not sprint_id:
        return []
    pattern = re.compile(r"\b" + re.escape(sprint_id) + r"\b")
    encontrados: list[str] = []
    for arquivo in arquivos:
        try:
            conteudo = arquivo.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        if pattern.search(conteudo):
            encontrados.append(str(arquivo.relative_to(REPO_ROOT)))
    # Mapping canonico (paths fixos por sprint conhecida)
    for path_canonico in SPRINT_MAP_CANONICO.get(sprint_id, []):
        candidato = REPO_ROOT / path_canonico
        if candidato.exists():
            rel = str(candidato.relative_to(REPO_ROOT))
            if rel not in encontrados:
                encontrados.append(rel)
    return encontrados


def coletar_mencoes_features(sprint_id: str, conteudo_features: str) -> int:
    """Conta ocorrencias word-boundary em FEATURES-CANONICAS.md."""
    if not conteudo_features:
        return 0
    pattern = re.compile(r"\b" + re.escape(sprint_id) + r"\b")
    return len(pattern.findall(conteudo_features))


def construir_indice_status(linhas: list[LinhaSprint]) -> dict[str, list[int]]:
    """Para cada sprint_id, lista de numeros de linha onde aparece [ok]."""
    indice: dict[str, list[int]] = {}
    for linha in linhas:
        if not linha.tem_ok:
            continue
        for sid in linha.sprint_ids:
            indice.setdefault(sid, []).append(linha.numero_linha)
    return indice


def auditar(
    linhas: list[LinhaSprint],
    arquivos_codigo: list[Path],
    conteudo_features: str,
    git_ativo: bool = True,
) -> dict[tuple[int, str], tuple[str, EvidenciaSprint]]:
    """
    Auditoria principal. Retorna mapa
        (numero_linha, sprint_id) -> (classificacao, evidencia)
    cobrindo apenas linhas com status pendente.
    """
    indice_ok = construir_indice_status(linhas)
    resultado: dict[tuple[int, str], tuple[str, EvidenciaSprint]] = {}

    # Cache por sprint_id para nao recolher evidencias varias vezes
    cache_evidencia: dict[str, EvidenciaSprint] = {}

    for linha in linhas:
        if not linha.tem_pendente:
            continue
        for sid in linha.sprint_ids:
            if sid in cache_evidencia:
                evid_base = cache_evidencia[sid]
            else:
                evid_base = EvidenciaSprint(sprint_id=sid)
                evid_base.commits = coletar_commits_git(sid, ativo=git_ativo)
                evid_base.arquivos_codigo = coletar_arquivos_codigo(sid, arquivos_codigo)
                evid_base.mencoes_features = coletar_mencoes_features(sid, conteudo_features)
                cache_evidencia[sid] = evid_base
            # Copia rasa para isolar evidencia intra-roadmap por contexto
            evid = EvidenciaSprint(
                sprint_id=sid,
                commits=list(evid_base.commits),
                arquivos_codigo=list(evid_base.arquivos_codigo),
                mencoes_features=evid_base.mencoes_features,
                intra_roadmap_ok_linhas=[
                    ln for ln in indice_ok.get(sid, []) if ln != linha.numero_linha
                ],
            )
            classificacao = evid.classificar([linha.numero_linha])
            resultado[(linha.numero_linha, sid)] = (classificacao, evid)
    return resultado


def formatar_relatorio(
    resultado: dict[tuple[int, str], tuple[str, EvidenciaSprint]],
    linhas: list[LinhaSprint],
) -> str:
    """Formata saida humano-legivel."""
    indexado_por_linha = {linha.numero_linha: linha for linha in linhas}
    grupos: dict[str, list[tuple[int, str, EvidenciaSprint]]] = {
        "FANTASMA": [],
        "SUSPEITO": [],
        "REAL": [],
    }
    for (num_linha, sid), (classificacao, evid) in resultado.items():
        grupos[classificacao].append((num_linha, sid, evid))

    out: list[str] = []
    titulo = "Auditoria de fantasmas no ROADMAP.md"
    out.append(titulo)
    out.append("=" * len(titulo))
    out.append("")
    out.append(
        f"Pendentes auditados: {len(resultado)} | "
        f"FANTASMA: {len(grupos['FANTASMA'])} | "
        f"SUSPEITO: {len(grupos['SUSPEITO'])} | "
        f"REAL: {len(grupos['REAL'])}"
    )
    out.append("")
    for nivel in ("FANTASMA", "SUSPEITO", "REAL"):
        itens = grupos[nivel]
        if not itens:
            continue
        out.append(f"--- {nivel} ({len(itens)}) ---")
        for num_linha, sid, evid in sorted(itens, key=lambda x: (x[0], x[1])):
            linha_obj = indexado_por_linha.get(num_linha)
            if linha_obj:
                texto = linha_obj.texto.strip()
                if len(texto) > 110:
                    texto = texto[:107] + "..."
            else:
                texto = "(linha nao encontrada)"
            out.append(f"  {nivel}: {sid} (linha {num_linha})")
            out.append(f"    texto: {texto}")
            if evid.intra_roadmap_ok_linhas:
                out.append(
                    f"    intra_roadmap_ok: linhas {evid.intra_roadmap_ok_linhas[:3]}"
                    + (" ..." if len(evid.intra_roadmap_ok_linhas) > 3 else "")
                )
            if evid.commits:
                amostra = evid.commits[:3]
                resto = f" (+{len(evid.commits) - 3} mais)" if len(evid.commits) > 3 else ""
                out.append(f"    commits: {', '.join(amostra)}{resto}")
            if evid.arquivos_codigo:
                amostra = evid.arquivos_codigo[:3]
                resto = (
                    f" (+{len(evid.arquivos_codigo) - 3} mais)"
                    if len(evid.arquivos_codigo) > 3
                    else ""
                )
                out.append(f"    codigo: {', '.join(amostra)}{resto}")
            if evid.mencoes_features > 0:
                out.append(f"    features: {evid.mencoes_features} mencao(oes)")
            if nivel == "FANTASMA":
                out.append("    acao: marcar [ok] no ROADMAP")
            elif nivel == "SUSPEITO":
                out.append("    acao: revisao manual")
            else:
                out.append("    acao: manter [todo]")
            out.append("")
    if not any(grupos.values()):
        out.append("Nenhuma pendencia detectada — ROADMAP sem fantasmas.")
    return "\n".join(out)


def formatar_json(
    resultado: dict[tuple[int, str], tuple[str, EvidenciaSprint]],
) -> str:
    items = []
    for (num_linha, sid), (classificacao, evid) in resultado.items():
        items.append(
            {
                "linha": num_linha,
                "sprint_id": sid,
                "classificacao": classificacao,
                "intra_roadmap_ok_linhas": evid.intra_roadmap_ok_linhas,
                "commits": evid.commits,
                "codigo": evid.arquivos_codigo,
                "features_mencoes": evid.mencoes_features,
            }
        )
    return json.dumps({"resultado": items}, indent=2, ensure_ascii=False)


def aplicar_fix(
    resultado: dict[tuple[int, str], tuple[str, EvidenciaSprint]],
    linhas: list[LinhaSprint],
    roadmap_path: Path,
    dry_run: bool = False,
) -> tuple[int, list[int]]:
    """
    Substitui `[todo]`/`[backlog]`/`[spec]`/`[wip]` por `[ok]` nas linhas
    classificadas como FANTASMA (alta confianca). Adiciona comentario
    inline com evidencia. Retorna (numero_substituicoes, linhas_modificadas).
    """
    indexado_por_linha = {linha.numero_linha: linha for linha in linhas}
    # Linhas alvo: somente FANTASMA, agrupadas por linha (uma linha pode ter
    # mais de um ID; basta uma classificacao FANTASMA para marcar).
    linhas_alvo: dict[int, EvidenciaSprint] = {}
    for (num_linha, sid), (classificacao, evid) in resultado.items():
        if classificacao != "FANTASMA":
            continue
        if num_linha not in linhas_alvo:
            linhas_alvo[num_linha] = evid
    if not linhas_alvo:
        return (0, [])

    textos = roadmap_path.read_text(encoding="utf-8").splitlines(keepends=False)
    data_hoje = date.today().isoformat()
    modificadas: list[int] = []

    for num_linha, evid in linhas_alvo.items():
        idx = num_linha - 1
        if idx < 0 or idx >= len(textos):
            continue
        texto_original = textos[idx]
        if "[ok]" in texto_original:
            continue
        # Substitui apenas o primeiro status pendente encontrado na linha
        substituido = False
        novo_texto = texto_original
        for status_pendente in ("[todo]", "[backlog]", "[spec]", "[wip]"):
            if status_pendente in novo_texto:
                novo_texto = novo_texto.replace(status_pendente, "[ok]", 1)
                substituido = True
                break
        if not substituido:
            # `[todo]` pode estar dentro de crase: `\`[todo]\``
            for status_pendente in ("`[todo]`", "`[backlog]`", "`[spec]`", "`[wip]`"):
                if status_pendente in novo_texto:
                    novo_texto = novo_texto.replace(status_pendente, "`[ok]`", 1)
                    substituido = True
                    break
        if not substituido:
            continue
        # Append comentario inline
        evidencia_resumo: list[str] = []
        if evid.intra_roadmap_ok_linhas:
            evidencia_resumo.append(
                f"intra-roadmap ok em linha {evid.intra_roadmap_ok_linhas[0]}"
            )
        if evid.commits:
            evidencia_resumo.append(f"{len(evid.commits)} commit(s)")
        if evid.arquivos_codigo:
            evidencia_resumo.append(f"{len(evid.arquivos_codigo)} arquivo(s) de codigo")
        if evid.mencoes_features > 0:
            evidencia_resumo.append(f"{evid.mencoes_features} mencao(oes) FEATURES")
        resumo = "; ".join(evidencia_resumo) if evidencia_resumo else "evidencias coletadas"
        comentario = f" <!-- auto-marcado [ok] {data_hoje}: {resumo} -->"
        novo_texto = novo_texto + comentario
        textos[idx] = novo_texto
        modificadas.append(num_linha)

    if not modificadas:
        return (0, [])

    if not dry_run:
        roadmap_path.write_text("\n".join(textos) + "\n", encoding="utf-8")
    return (len(modificadas), modificadas)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Detecta sprints fantasmas no ROADMAP.md."
    )
    parser.add_argument(
        "--roadmap",
        type=Path,
        default=ROADMAP_PATH,
        help=f"Caminho do ROADMAP.md (default: {ROADMAP_PATH})",
    )
    parser.add_argument(
        "--features",
        type=Path,
        default=FEATURES_PATH,
        help="Caminho do FEATURES-CANONICAS.md",
    )
    parser.add_argument(
        "--code-root",
        type=Path,
        default=None,
        help="Raiz para busca de codigo (default: REPO_ROOT). Util em testes.",
    )
    parser.add_argument(
        "--no-git",
        action="store_true",
        help="Desabilita git log lookup (util em testes em sandbox).",
    )
    parser.add_argument(
        "--warn-only",
        action="store_true",
        help="Sempre exit 0; nunca falha mesmo com fantasmas.",
    )
    parser.add_argument(
        "--fix",
        action="store_true",
        help="Auto-marca linhas FANTASMA como [ok] (com comentario inline).",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Saida formato JSON.",
    )
    args = parser.parse_args()

    if not args.roadmap.exists():
        print(f"ERRO: {args.roadmap} nao existe.", file=sys.stderr)
        return 2

    linhas = parse_roadmap(args.roadmap)
    if args.code_root is not None:
        # Override de roots: usa apenas o code_root passado.
        arquivos_codigo = []
        if args.code_root.is_dir():
            for entrada in args.code_root.rglob("*"):
                if entrada.is_file() and entrada.suffix in EXTENSOES:
                    arquivos_codigo.append(entrada)
    else:
        arquivos_codigo = listar_arquivos_para_grep(TARGETS)
    conteudo_features = (
        args.features.read_text(encoding="utf-8") if args.features.exists() else ""
    )

    resultado = auditar(
        linhas,
        arquivos_codigo,
        conteudo_features,
        git_ativo=not args.no_git,
    )

    if args.fix:
        n_alteradas, linhas_modificadas = aplicar_fix(resultado, linhas, args.roadmap)
        print(f"Linhas modificadas: {n_alteradas}")
        if linhas_modificadas:
            print(f"  Numeros: {linhas_modificadas}")
        return 0

    if args.json:
        print(formatar_json(resultado))
    else:
        print(formatar_relatorio(resultado, linhas))

    fantasmas = sum(1 for (_, (c, _)) in resultado.items() if c == "FANTASMA")
    if args.warn_only:
        return 0
    return 1 if fantasmas > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
