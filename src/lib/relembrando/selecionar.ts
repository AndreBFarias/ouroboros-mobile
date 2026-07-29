// Nucleo puro do card "Relembrando" (R-HOME-4d). Recebe um pool de
// candidatos (reflexao / humor / conquista antigos, normalizados) e a
// data de hoje, e devolve UMA lembranca contemplativa do dia -- ou null
// (cold start, tratado como boas-vindas na UI).
//
// Regra (spec R-HOME-4d §2):
//   1. Filtra por idade: mantem apenas idade >= LIMIAR_DIAS (item de
//      hoje/ontem nao e "relembrar").
//   2. Efeméride (prioridade maxima): entre os filtrados, os que batem o
//      mesmo mes/dia de hoje e tem idade >= LIMIAR_EFEMERIDE_DIAS.
//      Havendo, escolhe o MAIS ANTIGO (ha mais anos vence ha 1 mes).
//   3. Sem efeméride: rotacao ESTAVEL POR DIA -- ordena o pool desc por
//      data e escolhe pool[hashDia(ymd) % pool.length]. Deterministico
//      (mesma escolha o dia inteiro) mas varia dia a dia.
//   4. Pool vazio (ou tudo abaixo do limiar) -> null.
//
// Sobre `hoje`: espera-se um Date cujos campos de calendario UTC
// representem o "hoje" no fuso do app (o hook passa o Date ajustado a
// BRT). O modulo reduz esse Date a YYYY-MM-DD UMA vez (ymdDeHoje) e
// compara sempre string-contra-string com as datas do Vault.
//
// AUDIT-P1-2-DIASENTRE-FUSO (2026-07-28): diasEntre passou a converter
// Date para dia civil local via Intl. Como o `hoje` daqui JA vem
// deslocado -180min pelo hook, passar o Date direto aplicaria o
// deslocamento duas vezes (entre 00:00 e 02:59 BRT cairia no dia
// anterior). Passamos o YMD ja derivado, que diasEntre aceita
// inalterado -- resultado bit-a-bit igual ao anterior.
//
// Comentarios sem acento (convencao shell/CI).
import { diasEntre } from '@/lib/util/diasEntre';

export type OrigemRelembranca = 'reflexao' | 'humor' | 'conquista';

export interface CandidatoRelembranca {
  origem: OrigemRelembranca;
  // id estavel para navegacao (espelha os ids do Recap; ver useRelembrando).
  id: string;
  // YYYY-MM-DD (nao ISO com hora: diasEntre exige o formato de dia puro).
  data: string;
  frase: string;
}

export interface Relembranca {
  origem: OrigemRelembranca;
  id: string;
  frase: string;
  data: string;
  // Rotulo de tempo PT-BR calmo (sem "· nesta data": a UI acrescenta o
  // sufixo de efeméride quando efemeride === true).
  rotuloTempo: string;
  efemeride: boolean;
}

// Item de hoje/ontem nao e "relembrar". Constante ajustavel.
export const LIMIAR_DIAS = 2;

// Efeméride so faz sentido a partir de ~1 mes (mesmo mes/dia de um
// periodo anterior). Abaixo disso, "mesmo dia do mes" seria ruido.
export const LIMIAR_EFEMERIDE_DIAS = 28;

// Rotulo de tempo derivado da idade em dias. Fronteiras da spec §2:
//   2..27   -> "ha N dias"
//   28..59  -> "ha 1 mes"
//   60..364 -> "ha N meses" (round(dias/30))
//   365..729-> "ha 1 ano"
//   >=730   -> "ha N anos" (round(dias/365))
export function rotuloTempo(idadeDias: number): string {
  if (idadeDias < 28) return `há ${idadeDias} dias`;
  if (idadeDias < 60) return 'há 1 mês';
  if (idadeDias < 365) return `há ${Math.round(idadeDias / 30)} meses`;
  if (idadeDias < 730) return 'há 1 ano';
  return `há ${Math.round(idadeDias / 365)} anos`;
}

// Hash simples e estavel de string (acumulador h = h*31 + charCode).
// Sempre nao-negativo para uso direto em modulo. Deterministico: mesma
// string -> mesmo numero (a semente de rotacao por dia).
export function hashDia(ymd: string): number {
  let h = 0;
  for (let i = 0; i < ymd.length; i += 1) {
    h = (h * 31 + ymd.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// YYYY-MM-DD a partir dos campos UTC de `hoje` (que ja representam o dia
// local no fuso do app -- ver nota do topo).
function ymdDeHoje(hoje: Date): string {
  const y = hoje.getUTCFullYear();
  const m = String(hoje.getUTCMonth() + 1).padStart(2, '0');
  const d = String(hoje.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// mes/dia (1-based) de uma string YYYY-MM-DD.
function mesDiaDe(ymd: string): { mes: number; dia: number } | null {
  const partes = ymd.split('-');
  if (partes.length !== 3) return null;
  const mes = Number(partes[1]);
  const dia = Number(partes[2]);
  if (!Number.isFinite(mes) || !Number.isFinite(dia)) return null;
  return { mes, dia };
}

interface CandidatoComIdade extends CandidatoRelembranca {
  idade: number;
}

export function selecionarRelembranca(
  candidatos: CandidatoRelembranca[],
  hoje: Date,
  limiarDias: number = LIMIAR_DIAS
): Relembranca | null {
  // YMD de hoje derivado uma unica vez: alimenta a idade, a efeméride e
  // a semente de rotacao (ver nota AUDIT-P1-2 no topo do arquivo).
  const hojeYmd = ymdDeHoje(hoje);

  // 1. Normaliza idade e filtra por limiar.
  const filtrados: CandidatoComIdade[] = [];
  for (const c of candidatos) {
    let idade: number;
    try {
      idade = diasEntre(c.data, hojeYmd);
    } catch {
      // Data malformada: descarta em silencio (mesmo espirito dos
      // listadores do Vault, que ignoram registros invalidos).
      continue;
    }
    if (idade >= limiarDias) {
      filtrados.push({ ...c, idade });
    }
  }
  if (filtrados.length === 0) return null;

  // 2. Efeméride (prioridade maxima): mesmo mes/dia de hoje + idade
  //    suficiente. Vence o mais antigo (maior idade).
  const hojeMd = mesDiaDe(hojeYmd);
  if (hojeMd) {
    let efemeride: CandidatoComIdade | null = null;
    for (const c of filtrados) {
      if (c.idade < LIMIAR_EFEMERIDE_DIAS) continue;
      const md = mesDiaDe(c.data);
      if (!md) continue;
      if (md.mes === hojeMd.mes && md.dia === hojeMd.dia) {
        if (!efemeride || c.idade > efemeride.idade) {
          efemeride = c;
        }
      }
    }
    if (efemeride) {
      return montar(efemeride, true);
    }
  }

  // 3. Rotacao estavel por dia. Ordena desc por data (tiebreak por id
  //    para estabilidade total) e escolhe pelo hash do dia.
  const pool = [...filtrados].sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? 1 : -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const seed = hashDia(hojeYmd);
  const escolhido = pool[seed % pool.length];
  return montar(escolhido, false);
}

function montar(c: CandidatoComIdade, efemeride: boolean): Relembranca {
  return {
    origem: c.origem,
    id: c.id,
    frase: c.frase,
    data: c.data,
    rotuloTempo: rotuloTempo(c.idade),
    efemeride,
  };
}
