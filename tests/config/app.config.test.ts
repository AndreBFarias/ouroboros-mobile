import appJson from '../../app.json';

// AUDIT-P0-3: trava a regra que mantem o Vault fora do Android Auto Backup.
//
// O @expo/config-plugins escreve `android:allowBackup` no AndroidManifest
// gerado usando `config.android?.allowBackup ?? true` — ou seja, omitir a
// chave NAO e' neutro: o plugin injeta "true" ativamente. Com o Vault em
// FileSystem.documentDirectory (= getFilesDir()), que e' exatamente o
// diretorio que o Auto Backup recolhe, o default faz diario, humor, ciclo
// menstrual e medidas subirem para o Drive do usuario — contradizendo a
// politica publicada em public/privacy.html ("Tudo o que voce registra fica
// em arquivos no seu dispositivo").
//
// Este teste existe para que a remocao acidental da chave falhe no CI em vez
// de passar despercebida, ja que o efeito e' invisivel no bundle JS: o
// atributo so aparece no manifesto do build nativo.

describe('app.json — bloco android', () => {
  it('allowBackup e explicitamente false (Vault fora do Auto Backup)', () => {
    expect(appJson.expo.android.allowBackup).toBe(false);
  });

  it('allowBackup esta declarado, e nao apenas ausente', () => {
    // Guard contra a regressao silenciosa: `undefined` faz o config-plugin
    // cair no default `true`, que e' o estado que esta sprint corrigiu.
    expect(Object.keys(appJson.expo.android)).toContain('allowBackup');
    expect(appJson.expo.android.allowBackup).not.toBeUndefined();
  });
});
