export interface PhotoMeta {
  takenAt:        Date | null;
  lat:            number | null;
  lng:            number | null;
  hasGps:         boolean;
  hasTimestamp:   boolean;
}

export interface PhotoFreshnessCheck {
  isFresh:      boolean;
  minutesAgo:   number | null;
  maxMinutes:   number;
}

export interface PhotoLocationCheck {
  matchesLocation: boolean;
  distanceFeet:    number | null;
  hasGpsData:      boolean;
}

// Extract EXIF metadata from JPEG binary.
// Install `exifr` for full GPS extraction: npm install exifr
// Falls back to no-metadata if package is unavailable.
export async function extractPhotoMeta(base64: string): Promise<PhotoMeta> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const exifr = require("exifr");
    const buffer = Buffer.from(base64, "base64");
    const exif = await exifr.parse(buffer, { gps: true, pick: ["DateTimeOriginal", "latitude", "longitude"] });

    const lat     = exif?.latitude  ?? null;
    const lng     = exif?.longitude ?? null;
    const takenAt = exif?.DateTimeOriginal ? new Date(exif.DateTimeOriginal) : null;

    return { takenAt, lat, lng, hasGps: lat !== null && lng !== null, hasTimestamp: takenAt !== null };
  } catch {
    return { takenAt: null, lat: null, lng: null, hasGps: false, hasTimestamp: false };
  }
}

export function checkPhotoFreshness(meta: PhotoMeta, maxMinutes = 30): PhotoFreshnessCheck {
  if (!meta.takenAt) return { isFresh: false, minutesAgo: null, maxMinutes };
  const minutesAgo = (Date.now() - meta.takenAt.getTime()) / 60000;
  return { isFresh: minutesAgo <= maxMinutes, minutesAgo: Math.round(minutesAgo), maxMinutes };
}

export function checkPhotoLocation(
  meta:        PhotoMeta,
  poolLat:     number,
  poolLng:     number,
  radiusFeet = 300
): PhotoLocationCheck {
  if (!meta.hasGps || meta.lat === null || meta.lng === null) {
    return { matchesLocation: false, distanceFeet: null, hasGpsData: false };
  }
  const { isAtLocation, distanceFeet } = require("./gps").isAtLocation(
    { lat: meta.lat, lng: meta.lng },
    { lat: poolLat,  lng: poolLng  },
    radiusFeet
  );
  return { matchesLocation: isAtLocation, distanceFeet, hasGpsData: true };
}
