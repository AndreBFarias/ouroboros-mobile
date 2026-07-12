// Boot hook auxiliar de B1 (AUDIT-T1-BUGS, 2026-05-15). Varre o vault
// em busca de arquivos `*.writing` orfaos deixados por writes
// interrompidos (app matado entre o writeAsStringAsync do .writing e o
// moveAsync do rename atomico) e apaga.
//
// Decisao: apenas branch file://. Em content:// (SAF persisted), nao
// usamos sufixo .writing (mantemos write direto) entao nao ha orfao
// para limpar.
//
// Estrategia conservadora:
//  - lista o vault root e a pasta canonica MARKDOWN_FOLDER
//  - para cada nome terminando em '.writing', apaga via
//    FileSystem.deleteAsync(idempotent)
//  - falha individual nao bloqueia: erro silenciado por arquivo
//  - falha de listagem (vault inacessivel) retorna sem efeito
//
// Idempotente: pode rodar todo boot sem efeito colateral alem do
// delete dos orfaos. Sem flag de "ja rodou" - cleanup leve e relevante
// em CADA arranque, ja que pode ter havido kill entre boots.
//
// Comentarios sem acento (convencao shell/CI).
import * as FileSystem from 'expo-file-system/legacy';
import { MARKDOWN_FOLDER } from '@/lib/vault/paths';
import { WRITING_SUFFIX } from '@/lib/vault/writer';

// Varre uma pasta file:// procurando nomes terminados em WRITING_SUFFIX
// e apaga cada um. Tolera erros (pasta ausente, sem permissao).
async function limparPasta(folderUri: string): Promise<number> {
  if (!folderUri.startsWith('file://')) return 0;
  let nomes: string[] = [];
  try {
    nomes = await FileSystem.readDirectoryAsync(folderUri);
  } catch {
    // Pasta inexistente ou sem permissao: nada a limpar.
    return 0;
  }
  const sep = folderUri.endsWith('/') ? '' : '/';
  let apagados = 0;
  for (const nome of nomes) {
    if (!nome.endsWith(WRITING_SUFFIX)) continue;
    const uri = `${folderUri}${sep}${encodeURIComponent(nome)}`;
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      apagados += 1;
    } catch {
      // Best-effort: proximo boot tenta de novo.
    }
  }
  return apagados;
}

// Limpa arquivos *.writing em vault root e na pasta MARKDOWN_FOLDER.
// Devolve o total apagado (somente diagnostico; caller ignora).
// content:// nao gera orfaos com este nome (writer-direto sem .writing).
export async function limparArquivosWritingOrfaos(
  vaultRoot: string
): Promise<number> {
  if (!vaultRoot || !vaultRoot.startsWith('file://')) {
    // content:// SAF e mock vault em web ficam fora do escopo.
    return 0;
  }
  const sep = vaultRoot.endsWith('/') ? '' : '/';
  const markdownDir = `${vaultRoot}${sep}${MARKDOWN_FOLDER}`;
  let total = 0;
  total += await limparPasta(vaultRoot);
  total += await limparPasta(markdownDir);
  return total;
}
