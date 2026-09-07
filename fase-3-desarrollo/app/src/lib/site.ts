export const siteName = "PagaTo'";
export const siteDescription = "Organiza tus cuentas, movimientos y presupuestos con claridad y privacidad.";

export function publicSiteUrl() {
  try {
    return new URL(process.env.APP_URL ?? "http://localhost:3000").origin;
  } catch {
    return "http://localhost:3000";
  }
}

export function configuredSupportEmail() {
  const value = process.env.SUPPORT_EMAIL?.trim();
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}
