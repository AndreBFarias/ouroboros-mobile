// Aba Foto do MidiaPicker (M07.x). Layout: dois botoes empilhados,
// "Escolher da galeria" e "Tirar foto". Usa expo-image-picker com
// mediaTypes: ['images'] (A4 do BRIEF: MediaTypeOptions deprecado em
// SDK 54). A foto retornada e copiada para assets/ no Vault no
// formato YYYY-MM-DD-HHmm-conquista-<sufixo>.jpg antes de emitir
// via onAdd. Sufixo random curto evita colisao quando o usuario
// adiciona varias fotos no mesmo minuto.
//
// Erro silencioso: permissao negada nao mostra toast (consistente
// com FotosBlock M07); cancel do picker tambem nao notifica. So
// erro de copia para o Vault dispara toast.
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Button, useToast } from '@/components/ui';
import { spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useVault } from '@/lib/stores/vault';
import { fotoPath } from '@/lib/vault/paths';
import type { MidiaFoto } from '@/lib/schemas/midia';

export interface MidiaFotoTabProps {
  onAdd: (m: MidiaFoto) => void;
  desabilitado?: boolean;
}

// Concatena root SAF e path relativo, normalizando barras. Mesma
// logica usada em recordAudio.ts e saveEvento.ts.
function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Sufixo aleatorio curto (4 chars hex) para evitar colisao no mesmo
// minuto. Math.random e suficiente: colisao em 4 hex = 1/65536.
function suffixCurto(): string {
  return Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0');
}

export function MidiaFotoTab({
  onAdd,
  desabilitado = false,
}: MidiaFotoTabProps) {
  const toast = useToast();
  const vaultRoot = useVault((s) => s.vaultRoot);
  const [carregando, setCarregando] = useState<boolean>(false);

  // Logica comum de copia para o Vault e emissao ao caller. Recebe
  // a URI da foto (file:// ou content://) e cuida do resto.
  const persistirEEmitir = useCallback(
    async (uriOrigem: string) => {
      if (!vaultRoot) {
        toast.show('Vault não disponível.', 'error');
        return;
      }
      // V4.0.2: layout-por-tipo (jpg/foto-YYYY-MM-DD-<rand>.jpg).
      // Pasta jpg/ esta em SUBPASTAS_CANONICAS, criada por
      // garantirSubpastas em init.
      const relPath = fotoPath(new Date(), suffixCurto(), 'jpg');
      const destinoUri = joinUri(vaultRoot, relPath);
      try {
        await FileSystem.copyAsync({ from: uriOrigem, to: destinoUri });
      } catch {
        toast.show('Falha ao salvar foto.', 'error');
        return;
      }
      const midia: MidiaFoto = { tipo: 'foto', path: relPath };
      haptics.light().catch(() => undefined);
      onAdd(midia);
      toast.show('Mídia adicionada.', 'success');
    },
    [onAdd, toast, vaultRoot]
  );

  const escolherGaleria = useCallback(async () => {
    if (desabilitado || carregando) return;
    setCarregando(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.7,
      });
      if (result.canceled || result.assets.length === 0) return;
      await persistirEEmitir(result.assets[0].uri);
    } finally {
      setCarregando(false);
    }
  }, [carregando, desabilitado, persistirEEmitir]);

  const tirarFoto = useCallback(async () => {
    if (desabilitado || carregando) return;
    setCarregando(true);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (result.canceled || result.assets.length === 0) return;
      await persistirEEmitir(result.assets[0].uri);
    } finally {
      setCarregando(false);
    }
  }, [carregando, desabilitado, persistirEEmitir]);

  return (
    <View style={{ gap: spacing.sm }} accessibilityLabel="aba foto">
      <Button
        variant="primary"
        label="Escolher da galeria"
        onPress={escolherGaleria}
        disabled={desabilitado || carregando}
      />
      <Button
        variant="ghost"
        label="Tirar foto"
        onPress={tirarFoto}
        disabled={desabilitado || carregando}
      />
    </View>
  );
}
