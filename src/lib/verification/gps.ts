const EARTH_RADIUS_MILES = 3958.8;

export interface GpsCoords {
  lat: number;
  lng: number;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistance(a: GpsCoords, b: GpsCoords): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

export function haversineDistanceFeet(a: GpsCoords, b: GpsCoords): number {
  return haversineDistance(a, b) * 5280;
}

export interface LocationCheck {
  isAtLocation:  boolean;
  distanceFeet:  number;
  distanceMiles: number;
  withinRadius:  number; // feet threshold used
}

export function isAtLocation(
  techCoords:    GpsCoords,
  poolCoords:    GpsCoords,
  radiusFeet = 200
): LocationCheck {
  const distanceMiles = haversineDistance(techCoords, poolCoords);
  const distanceFeet  = distanceMiles * 5280;
  return {
    isAtLocation: distanceFeet <= radiusFeet,
    distanceFeet:  Math.round(distanceFeet),
    distanceMiles: Math.round(distanceMiles * 100) / 100,
    withinRadius:  radiusFeet,
  };
}

export function isTravelSpeedSuspicious(
  prevCoords:    GpsCoords,
  currCoords:    GpsCoords,
  elapsedSeconds:number,
  maxMph = 80
): boolean {
  if (elapsedSeconds <= 0) return false;
  const distMiles = haversineDistance(prevCoords, currCoords);
  const hours     = elapsedSeconds / 3600;
  const mph       = distMiles / hours;
  return mph > maxMph;
}
