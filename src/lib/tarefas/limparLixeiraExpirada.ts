// Limpeza automática da lixeira soft de tarefas (M17). Roda no boot
// do app (BOOT_HOOKS) uma vez por dia: verifica timestamp da ultima
// limpeza em SecureStore (chave 'ouroboros.lixeira.ultimaLimpeza'),
// e se passou >= 24h, varre cacheDirectory/lixeira/tarefas/ removendo
// arquivos com prefixo de timestamp anterior a 30 dias.
//
// Os nomes de arquivos seguem o padrao YYYYMMDD-HHmmss-<basename>.md
// gerado por excluirTarefa em src/lib/vault/tarefas.ts. A limpeza
// extrai o YYYYMMDD do prefixo, compara com a data atual em UTC-3.
// Arquivos sem prefixo reconhecivel são ignorados (defensivo).
//
// Comentarios sem acento (convencao shell/CI).
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Chave SecureStore com timestamp ISO da ultima limpeza realizada.
export const KEY_ULTIMA_LIMPEZA = 'ouroboros.lixeira.ultimaLimpeza';

// Retencao em dias. 30 dias dao janela razoavel de recuperacao manual
// (usuario pode copiar de cacheDirectory antes de expirar).
export const RETENCAO_DIAS = 30;

// Intervalo minimo entre execucoes em horas. 24h evita varredura
// desnecessaria a cada cold boot (app abre varias vezes ao dia).
const INTERVALO_HORAS = 24;

const MS_POR_HORA = 60 * 60 * 1000;
const MS_POR_DIA = 24 * MS_POR_HORA;

// Le timestamp ISO em SecureStore (mobile) ou localStorage (web).
async function lerUltimaLimpeza(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(KEY_ULTIMA_LIMPEZA);
  }
  return (await SecureStore.getItemAsync(KEY_ULTIMA_LIMPEZA)) ?? null;
}

async function gravarUltimaLimpeza(iso: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(KEY_ULTIMA_LIMPEZA, iso);
    return;
  }
  await SecureStore.setItemAsync(KEY_ULTIMA_LIMPEZA, iso);
}

// Extrai data YYYYMMDD do prefixo do nome de arquivo. Retorna null
// quando o nome não bate com o padrao esperado.
function extrairDataPrefixo(nome: string): Date | null {
  const m = nome.match(/^(\d{4})(\d{2})(\d{2})-/);
  if (!m) return null;
  const y = Number(m[1]);
  const mes = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mes) || !Number.isFinite(d)) {
    return null;
  }
  // Trata como UTC-3 (mesmo fuso usado por formatTimestampLixeira).
  // Aproximacao: usa meia-noite UTC para comparar idade em dias.
  const date = new Date(Date.UTC(y, mes - 1, d));
  return Number.isNaN(date.getTime()) ? null : date;
}

// Resultado da limpeza para diagnostico/teste. Caller (boot hook)
// pode ignorar o retorno; exposto para testes.
export interface ResultadoLimpeza {
  rodou: boolean;
  arquivosRemovidos: number;
  motivo?: string;
}

// Função publica registrada em BOOT_HOOKS (M00.5). Idempotente:
// chamar duas vezes seguidas no mesmo dia não varre duas vezes.
export async function limparLixeiraExpirada(
  agora: Date = new Date()
): Promise<ResultadoLimpeza> {
  // Janela de execucao: rodar so se passou >= INTERVALO_HORAS desde
  // a ultima vez. Web/native compartilham essa logica.
  const ultima = await lerUltimaLimpeza();
  if (ultima) {
    const dt = new Date(ultima);
    if (
      !Number.isNaN(dt.getTime()) &&
      agora.getTime() - dt.getTime() < INTERVALO_HORAS * MS_POR_HORA
    ) {
      return { rodou: false, arquivosRemovidos: 0, motivo: 'janela ativa' };
    }
  }

  const cacheBase = FileSystem.cacheDirectory;
  if (!cacheBase) {
    // Web ou ambiente sem cacheDirectory; marcamos timestamp para não
    // ficar varrendo a cada boot.
    await gravarUltimaLimpeza(agora.toISOString());
    return {
      rodou: false,
      arquivosRemovidos: 0,
      motivo: 'cacheDirectory indisponivel',
    };
  }

  const lixeiraDir = `${cacheBase}lixeira/tarefas/`;

  // Pasta pode não existir ainda (nenhuma exclusao feita). Tratamos
  // como zero arquivos.
  let entradas: string[];
  try {
    entradas = await FileSystem.readDirectoryAsync(lixeiraDir);
  } catch {
    await gravarUltimaLimpeza(agora.toISOString());
    return {
      rodou: true,
      arquivosRemovidos: 0,
      motivo: 'pasta vazia ou ausente',
    };
  }

  let removidos = 0;
  for (const nome of entradas) {
    const dataPrefixo = extrairDataPrefixo(nome);
    if (!dataPrefixo) continue;
    const idadeMs = agora.getTime() - dataPrefixo.getTime();
    if (idadeMs >= RETENCAO_DIAS * MS_POR_DIA) {
      const path = `${lixeiraDir}${nome}`;
      try {
        await FileSystem.deleteAsync(path, { idempotent: true });
        removidos += 1;
      } catch {
        // Ignora falhas pontuais; próxima execucao tenta de novo.
      }
    }
  }

  await gravarUltimaLimpeza(agora.toISOString());
  return { rodou: true, arquivosRemovidos: removidos };
}
