import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/session";
import { getSqlClient } from "@/lib/db/client";
import { getFinancialProfile } from "@/modules/users/server/profile-service";
import { readPreferences } from "@/modules/preferences/server/repository";
import { PreferencesScreen } from "@/modules/preferences/components/preferences-screen";
import { Text } from "@/modules/preferences/components/presentation-provider";
import { preferencesSchema } from "@/modules/preferences/model";
import { privatePageMetadata } from "@/lib/page-metadata";

export const metadata = privatePageMetadata("Preferencias · Settings", "Configura apariencia, idioma, moneda, zona horaria y formatos de PagaTo.");
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireSession();
  await getFinancialProfile();
  let record = null;
  try { record = await readPreferences(getSqlClient(), { userId: session.user.id, sessionId: session.session.id }); }
  catch { console.error("[preferences] No se pudieron cargar las preferencias."); }
  const valid = record && preferencesSchema.safeParse(record.preferences);
  return <AppShell active="/settings" name={session.user.name || "Mi cuenta"}>
    {record && valid?.success ? <PreferencesScreen record={{ ...record, preferences: valid.data }} name={session.user.name || "Mi cuenta"} email={session.user.email} timezones={Intl.supportedValuesOf("timeZone")} /> : <section role="alert" className="account-alert"><h1><Text value="Preferencias no disponibles" /></h1><p><Text value="No pudimos cargar tus preferencias. Recarga la página para reintentar." /></p><a className="button button-secondary mt-4" href="/settings"><Text value="Reintentar" /></a></section>}
  </AppShell>;
}
