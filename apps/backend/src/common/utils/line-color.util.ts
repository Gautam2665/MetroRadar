/**
 * TransitOS — Shared Line Color Resolver Utility
 * Single source of truth for line hex color resolution and fallback mapping.
 */

export function resolveLineColor(color: string | null | undefined, lineName: string | null | undefined): string {
  const nameUpper = (lineName || '').toUpperCase();
  let resolved = (color || '#3b82f6').trim();

  if (
    !resolved ||
    ['#000000', '000000', '#ffffff', 'ffffff', '#3b82f6', '3b82f6'].includes(resolved.toLowerCase())
  ) {
    if (nameUpper.includes('YELLOW') || nameUpper.includes('LINE 2A') || nameUpper.includes('LINE 2B')) {
      resolved = '#facc15';
    } else if (nameUpper.includes('BLUE') || nameUpper.includes('LINE 1')) {
      resolved = '#3b82f6';
    } else if (nameUpper.includes('PINK')) {
      resolved = '#ec4899';
    } else if (nameUpper.includes('MAGENTA')) {
      resolved = '#d946ef';
    } else if (nameUpper.includes('RED') || nameUpper.includes('LINE 7') || nameUpper.includes('LINE 9')) {
      resolved = '#ef4444';
    } else if (nameUpper.includes('VIOLET')) {
      resolved = '#8b5cf6';
    } else if (nameUpper.includes('GREEN')) {
      resolved = '#22c55e';
    } else if (nameUpper.includes('AQUA') || nameUpper.includes('LINE 3')) {
      resolved = '#06b6d4';
    } else if (nameUpper.includes('ORANGE') || nameUpper.includes('AIRPORT')) {
      resolved = '#f97316';
    } else if (nameUpper.includes('RAPID')) {
      resolved = '#14b8a6';
    } else if (nameUpper.includes('GREY') || nameUpper.includes('GRAY')) {
      resolved = '#9ca3af';
    } else if (nameUpper.includes('KOCHI')) {
      resolved = '#0ea5e9';
    } else {
      resolved = '#3b82f6';
    }
  }
  return resolved;
}
