// Wrapper sobre expo-location para detectar o bairro atual a partir
// das coordenadas GPS. Usado pela Tela 20 (registro de evento) no
// botao "Usar localizacao atual". A função e silenciosa em qualquer
// erro: permission negada, GPS desligado, reverse geocode sem
// resultado -> devolve null. Caller decide se mostra toast info.
//
// Pipeline:
//  1. requestForegroundPermissionsAsync -> se negada, null.
//  2. getCurrentPositionAsync com accuracy balanceado (Balanced).
//  3. reverseGeocodeAsync nas coords. Pega a primeira entrada e
//     extrai 'district' (bairro/sub-bairro) com fallback em
//     'subregion' (municipio/regiao). Cidade e estado ficam de fora
//     porque o usuario costuma querer "Pinheiros", não "São Paulo".
//  4. Se nada bate, devolve null.
import * as Location from 'expo-location';

// Resultado canonico: nome do bairro detectado ou null se não foi
// possivel determinar com confianca.
export type BairroResult = string | null;

export async function getBairroAtual(): Promise<BairroResult> {
  // Permissao foreground basta: o app so detecta enquanto a tela
  // esta aberta. locationAlways não e necessario.
  let perm: Location.LocationPermissionResponse;
  try {
    perm = await Location.requestForegroundPermissionsAsync();
  } catch {
    return null;
  }
  if (!perm.granted) return null;

  let coords: Location.LocationObject;
  try {
    coords = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch {
    return null;
  }

  let lugares: Location.LocationGeocodedAddress[];
  try {
    lugares = await Location.reverseGeocodeAsync({
      latitude: coords.coords.latitude,
      longitude: coords.coords.longitude,
    });
  } catch {
    return null;
  }

  if (lugares.length === 0) return null;
  const primeiro = lugares[0];

  // 'district' tipicamente traz o bairro (Pinheiros, Lapa, Moema).
  // Em locais sem bairro mapeado, 'subregion' carrega municipio ou
  // regiao administrativa. Se ambos vazios, devolve null para o
  // caller decidir como sinalizar.
  if (typeof primeiro.district === 'string' && primeiro.district.trim().length > 0) {
    return primeiro.district.trim();
  }
  if (typeof primeiro.subregion === 'string' && primeiro.subregion.trim().length > 0) {
    return primeiro.subregion.trim();
  }
  return null;
}
