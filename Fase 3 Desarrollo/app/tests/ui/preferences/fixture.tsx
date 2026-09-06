import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PresentationProvider } from "@/modules/preferences/components/presentation-provider";
import { PreferencesScreen } from "@/modules/preferences/components/preferences-screen";
import { DEFAULT_PREFERENCES, preferencesSchema, type PreferenceRecord } from "@/modules/preferences/model";
import { DashboardScreen } from "@/modules/dashboard/components/dashboard-screen";
import { data, filters } from "../dashboard/fixtures";
import { PwaProvider } from "@/modules/pwa/components/pwa-provider";
export function fromSearch(search: string) {
 const params = new URLSearchParams(search);
 return { preferences: preferencesSchema.parse({ ...DEFAULT_PREFERENCES, ...Object.fromEntries(params) }), revision: params.get("revision") ?? "2026-09-03T10:00:00.000001Z" };
}
export function Preview({ search }: { search: string }) {
 const [record,setRecord] = useState<PreferenceRecord>(()=>fromSearch(search));
 useEffect(()=>{ document.documentElement.dataset.hydrated="true"; const saved=(e:Event)=>setRecord((e as CustomEvent).detail); window.addEventListener("fixture:preferences",saved); return()=>window.removeEventListener("fixture:preferences",saved); },[]);
 const dashboard=new URLSearchParams(search).get("view")==="dashboard";
 return <PresentationProvider preferences={record.preferences}><PwaProvider enabled={new URLSearchParams(search).has("pwa")}><AppShell active={dashboard?"/dashboard":"/settings"} name="Alex Prueba">{dashboard?<DashboardScreen data={data} filters={filters} name="Alex"/>:<PreferencesScreen record={record} name="Alex Prueba" email="alex@example.test" timezones={["America/Santo_Domingo","America/New_York","Europe/Madrid","Pacific/Auckland","UTC"]}/>}</AppShell></PwaProvider></PresentationProvider>;
}
