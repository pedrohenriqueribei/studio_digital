/**
 * Utilitários de geolocalização e cálculo de distância entre clientes e estabelecimentos.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Coordenadas de referência para as principais cidades e polos comerciais brasileiros
export const KNOWN_LOCATION_COORDINATES: Record<string, Coordinates> = {
  // São Paulo
  'sao paulo': { latitude: -23.5505, longitude: -46.6333 },
  'sao paulo - sp': { latitude: -23.5505, longitude: -46.6333 },
  'jardins, sao paulo': { latitude: -23.5615, longitude: -46.666 },
  'moema, sao paulo': { latitude: -23.6025, longitude: -46.6625 },
  'pinheiros, sao paulo': { latitude: -23.567, longitude: -46.6934 },
  'vila madalena, sao paulo': { latitude: -23.5489, longitude: -46.689 },
  'morumbi, sao paulo': { latitude: -23.601, longitude: -46.7212 },
  'santana, sao paulo': { latitude: -23.5042, longitude: -46.6265 },
  'itaim bibi, sao paulo': { latitude: -23.5855, longitude: -46.678 },

  // Campinas
  campinas: { latitude: -22.9099, longitude: -47.0626 },
  'campinas - sp': { latitude: -22.9099, longitude: -47.0626 },
  'cambui, campinas': { latitude: -22.898, longitude: -47.051 },

  // Rio de Janeiro
  'rio de janeiro': { latitude: -22.9068, longitude: -43.1729 },
  'rio de janeiro - rj': { latitude: -22.9068, longitude: -43.1729 },
  'copacabana, rio de janeiro': { latitude: -22.9698, longitude: -43.1868 },
  'ipanema, rio de janeiro': { latitude: -22.984, longitude: -43.2045 },
  'barra da tijuca, rio de janeiro': { latitude: -23.0003, longitude: -43.3658 },

  // Belo Horizonte
  'belo horizonte': { latitude: -19.9167, longitude: -43.9345 },
  'belo horizonte - mg': { latitude: -19.9167, longitude: -43.9345 },
  'savassi, belo horizonte': { latitude: -19.9375, longitude: -43.935 },
  'lourdes, belo horizonte': { latitude: -19.929, longitude: -43.945 },

  // Curitiba
  curitiba: { latitude: -25.4284, longitude: -49.2733 },
  'curitiba - pr': { latitude: -25.4284, longitude: -49.2733 },
  'batel, curitiba': { latitude: -25.4431, longitude: -49.2882 },

  // Brasília
  brasilia: { latitude: -15.7975, longitude: -47.8919 },
  'brasilia - df': { latitude: -15.7975, longitude: -47.8919 },
  'asa sul, brasilia': { latitude: -15.803, longitude: -47.9 },
  'asa norte, brasilia': { latitude: -15.768, longitude: -47.882 },

  // Porto Alegre
  'porto alegre': { latitude: -30.0346, longitude: -51.2177 },
  'porto alegre - rs': { latitude: -30.0346, longitude: -51.2177 },
  'moinhos de vento, porto alegre': { latitude: -30.0245, longitude: -51.2014 },

  // Salvador
  salvador: { latitude: -12.9777, longitude: -38.5016 },
  'salvador - ba': { latitude: -12.9777, longitude: -38.5016 },
  'pituba, salvador': { latitude: -12.9984, longitude: -38.459 },

  // Florianópolis
  florianopolis: { latitude: -27.5954, longitude: -48.548 },
  'florianopolis - sc': { latitude: -27.5954, longitude: -48.548 },

  // Fortaleza
  fortaleza: { latitude: -3.7319, longitude: -38.5267 },
  'fortaleza - ce': { latitude: -3.7319, longitude: -38.5267 },
  'meireles, fortaleza': { latitude: -3.73, longitude: -38.498 },

  // Goiânia
  goiania: { latitude: -16.6869, longitude: -49.2648 },
  'goiania - go': { latitude: -16.6869, longitude: -49.2648 },

  // Recife
  recife: { latitude: -8.0476, longitude: -34.877 },
  'recife - pe': { latitude: -8.0476, longitude: -34.877 },
  'boa viagem, recife': { latitude: -8.1189, longitude: -34.898 },
};

/**
 * Normaliza termos geográficos para busca de chave
 */
function cleanGeoKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Tenta resolver coordenadas para uma cidade, estado ou bairro
 */
export function resolveLocationCoordinates(loc: {
  latitude?: number;
  longitude?: number;
  city?: string;
  state?: string;
  neighborhood?: string;
}): Coordinates | null {
  if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
    return { latitude: loc.latitude, longitude: loc.longitude };
  }

  // Composição bairro + cidade
  if (loc.neighborhood && loc.city) {
    const key = cleanGeoKey(`${loc.neighborhood}, ${loc.city}`);
    if (KNOWN_LOCATION_COORDINATES[key]) {
      return KNOWN_LOCATION_COORDINATES[key];
    }
  }

  // Composição cidade + estado
  if (loc.city && loc.state) {
    const key = cleanGeoKey(`${loc.city} - ${loc.state}`);
    if (KNOWN_LOCATION_COORDINATES[key]) {
      return KNOWN_LOCATION_COORDINATES[key];
    }
  }

  // Apenas cidade
  if (loc.city) {
    const key = cleanGeoKey(loc.city);
    if (KNOWN_LOCATION_COORDINATES[key]) {
      return KNOWN_LOCATION_COORDINATES[key];
    }

    // Busca parcial por chaves conhecidas
    for (const [knownKey, coords] of Object.entries(KNOWN_LOCATION_COORDINATES)) {
      if (knownKey.includes(key) || key.includes(knownKey)) {
        return coords;
      }
    }
  }

  return null;
}

/**
 * Calcula a distância em quilômetros usando a fórmula de Haversine
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formata a distância de forma humanizada (ex: "850 m" ou "2.4 km")
 */
export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined || isNaN(km)) return '';
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Tenta obter a localização atual do usuário via Geolocation API
 */
export function getCurrentUserLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocalização não é suportada por este navegador.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let msg = 'Não foi possível obter sua localização.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Permissão de localização não concedida no navegador.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Informações de localização indisponíveis no momento.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Tempo limite esgotado ao buscar localização.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  });
}
