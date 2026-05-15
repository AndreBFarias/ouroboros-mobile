// Wrapper sobre expo-location para detectar o bairro atual a partir
// das coordenadas GPS. Usado pela Tela 20 (registro de evento) no
// botao "Usar localizacao atual" e por ScannerPreview para preencher
// bairro automaticamente em notas escaneadas.
//
// Pipeline:
//  1. requestForegroundPermissionsAsync -> se negada, retorna razao
//     'permissao_negada' no detalhado, ou null no legado.
//  2. getCurrentPositionAsync com accuracy balanceado (Balanced).
//  3. reverseGeocodeAsync nas coords. Pega a primeira entrada e
//     extrai 'district' (bairro/sub-bairro) com fallback em
//     'subregion' (municipio/regiao). Cidade e estado ficam de fora
//     porque o usuario costuma querer "Pinheiros", não "São Paulo".
//  4. Se nada bate, devolve null.
//
// T1B3 (2026-05-15): introduzido getBairroAtualDetalhado que retorna
// um discriminator { ok, bairro | razao } para permitir ao caller
// distinguir entre "permissao negada" e "sem resultado". getBairroAtual
// (legado) continua devolvendo string | null para back-compat com
// ScannerPreview e testes. A Tela 20 (app/eventos.tsx) usa a versao
// detalhada para mostrar toast especifico de permissao.
import * as Location from 'expo-location';

// Resultado canonico: nome do bairro detectado ou null se não foi
// possivel determinar com confianca.
export type BairroResult = string | null;

// T1B3: resultado discriminado para callers que precisam distinguir
// causa da falha.
export type BairroDetalhe =
  | { ok: true; bairro: string }
  | {
      ok: false;
      razao: 'permissao_negada' | 'gps_indisponivel' | 'sem_resultado';
    };

export async function getBairroAtualDetalhado(): Promise<BairroDetalhe> {
  // Permissao foreground basta: o app so detecta enquanto a tela
  // esta aberta. locationAlways não e necessario.
  let perm: Location.LocationPermissionResponse;
  try {
    perm = await Location.requestForegroundPermissionsAsync();
  } catch {
    return { ok: false, razao: 'permissao_negada' };
  }
  if (!perm.granted) {
    return { ok: false, razao: 'permissao_negada' };
  }

  let coords: Location.LocationObject;
  try {
    coords = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch {
    return { ok: false, razao: 'gps_indisponivel' };
  }

  let lugares: Location.LocationGeocodedAddress[];
  try {
    lugares = await Location.reverseGeocodeAsync({
      latitude: coords.coords.latitude,
      longitude: coords.coords.longitude,
    });
  } catch {
    return { ok: false, razao: 'gps_indisponivel' };
  }

  if (lugares.length === 0) {
    return { ok: false, razao: 'sem_resultado' };
  }
  const primeiro = lugares[0];

  // 'district' tipicamente traz o bairro (Pinheiros, Lapa, Moema).
  // Em locais sem bairro mapeado, 'subregion' carrega municipio ou
  // regiao administrativa. Se ambos vazios, devolve sem_resultado.
  if (
    typeof primeiro.district === 'string' &&
    primeiro.district.trim().length > 0
  ) {
    return { ok: true, bairro: primeiro.district.trim() };
  }
  if (
    typeof primeiro.subregion === 'string' &&
    primeiro.subregion.trim().length > 0
  ) {
    return { ok: true, bairro: primeiro.subregion.trim() };
  }
  return { ok: false, razao: 'sem_resultado' };
}

// Versao legado: mantida para callers que so precisam do nome do
// bairro (ScannerPreview, testes existentes). Internamente delega
// ao detalhado.
export async function getBairroAtual(): Promise<BairroResult> {
  const detalhe = await getBairroAtualDetalhado();
  return detalhe.ok ? detalhe.bairro : null;
}
