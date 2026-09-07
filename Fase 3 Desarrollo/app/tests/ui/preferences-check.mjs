import assert from "node:assert/strict";
import {resolve} from "node:path";
import {mkdir,readFile} from "node:fs/promises";
import {createServer} from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/postcss";
import {chromium} from "@playwright/test";
const src=p=>JSON.stringify("/@fs/"+resolve(p).replaceAll("\\","/"));
const stubs={
 link:"import {createElement} from 'react'; export default function Link({href,...props}){return createElement('a',{...props,href});}",
 image:"import {createElement} from 'react'; export default function Image({priority,...props}){return createElement('img',props);}",
 navigation:"const router={refresh(){},push(){}};export function useRouter(){return router;}",
 auth:"export async function signOutAction(){}",
 preferences:`import {DEFAULT_PREFERENCES,preferencesSchema} from ${src("src/modules/preferences/model.ts")}; export async function savePreferencesAction(state,form){const values=preferencesSchema.parse(form.get('mode')==='reset'?DEFAULT_PREFERENCES:Object.fromEntries(form));const revision=new Date().toISOString();const record={preferences:values,revision};const query=new URLSearchParams({...values,revision});history.replaceState({},'', '/?'+query);window.dispatchEvent(new CustomEvent('fixture:preferences',{detail:record}));return {status:'success',record,message:form.get('mode')==='reset'?'Preferencias predeterminadas restauradas.':'Preferencias guardadas.'}}`,
 dashboard:"export async function loadDashboardOptionsAction(){return {status:'unavailable'}}",
 transactions:"export async function saveTransactionAction(){return {status:'error'}};export async function deleteTransactionAction(){return {status:'error'}}"
};
const server=await createServer({configFile:false,root:resolve("tests/ui/preferences"),publicDir:resolve("public"),plugins:[{name:"preference-fixtures",enforce:"pre",
 resolveId(id,importer){const key=({"next/link":"link","next/image":"image","next/navigation":"navigation"})[id];if(key)return "\0fixture:"+key;if(id.endsWith("/modules/auth/actions"))return "\0fixture:auth";if(id.endsWith("/server/actions"))return "\0fixture:"+(importer?.includes("preferences")?"preferences":importer?.includes("dashboard")?"dashboard":"transactions");},
 load(id){if(id.startsWith("\0fixture:"))return stubs[id.slice(9)]},
 configureServer(vite){vite.middlewares.use(async(req,res,next)=>{const url=new URL(req.url??"/","http://localhost");if(req.method!=="GET"||url.pathname!=="/")return next();try{const {renderPreview}=await vite.ssrLoadModule("/server.tsx");const {markup,record}=renderPreview(url.search);let html=await readFile(resolve("tests/ui/preferences/index.html"),"utf8");html=html.replace('lang="es"','lang="'+record.preferences.locale+'" data-theme="'+record.preferences.theme+'"').replace('<div id="root"></div>',()=>'<div id="root">'+markup+'</div>');res.setHeader("Content-Type","text/html");res.end(await vite.transformIndexHtml(req.url,html));}catch(error){next(error)}})}
},react()],resolve:{alias:{"@":resolve("src")}},css:{postcss:{plugins:[tailwind()]}},ssr:{noExternal:["next"]},server:{host:"127.0.0.1",port:4178,strictPort:true,fs:{allow:[process.cwd()]}}});
let browser;
try{
 await server.listen();browser=await chromium.launch();await mkdir("test-results/preferences",{recursive:true});
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900},colorScheme:"light"});const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",e=>{if(e.type()==="error")errors.push(e.text())});
  await page.goto("http://127.0.0.1:4178/");await page.waitForFunction(()=>document.documentElement.dataset.hydrated==="true");
  assert.equal(await page.getByRole("button",{name:"Guardar cambios",exact:true}).isDisabled(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(width<1000){
   const nav=page.getByRole("navigation",{name:"Navegación móvil"});
   assert.equal(await nav.getByRole("link").count(),5);
   assert.equal(await nav.getByRole("link",{name:"Presupuestos",exact:true}).getAttribute("href"),"/budgets");
   for(const link of await nav.getByRole("link").all()){
    const bounds=await link.boundingBox();assert.ok(bounds.width>=44&&bounds.height>=44);
    assert.ok(await link.evaluate(e=>{const label=e.querySelector("span").getBoundingClientRect(),box=e.getBoundingClientRect();return label.left>=box.left&&label.right<=box.right;}),"Mobile navigation label must fit its button");
   }
   await nav.screenshot({path:`test-results/preferences/navigation-${width}.png`});
  }
  await page.screenshot({path:`test-results/preferences/light-${width}.png`,fullPage:true,animations:"disabled"});
  await page.getByRole("radio",{name:"Oscuro",exact:true}).check();
  await page.getByLabel("Idioma",{exact:true}).selectOption("en");await page.getByLabel("Moneda principal",{exact:true}).selectOption("USD");
  await page.getByLabel("Zona horaria",{exact:true}).selectOption("America/New_York");await page.getByLabel("Formato de fecha",{exact:true}).selectOption("MM/DD/YYYY");await page.getByLabel("Formato numérico",{exact:true}).selectOption("dot-comma");
  await page.getByRole("button",{name:"Guardar cambios",exact:true}).click();await page.getByRole("heading",{name:"Settings",exact:true}).waitFor();
  assert.equal(await page.locator("html").getAttribute("data-theme"),"dark");assert.equal(await page.locator("html").getAttribute("lang"),"en");
  assert.equal(await page.locator(".preferences-card").first().evaluate(e=>getComputedStyle(e).backgroundColor),"rgb(30, 33, 32)");
  assert.equal(await page.locator(".app-frame").evaluate(e=>getComputedStyle(e).backgroundColor),"rgb(20, 22, 21)");
  await page.getByText("Preferences saved.",{exact:true}).waitFor();
  assert.equal(await page.getByRole("button",{name:"Save changes",exact:true}).isDisabled(),true);
  await page.reload();await page.getByRole("heading",{name:"Settings",exact:true}).waitFor();
  assert.equal(await page.getByLabel("Primary currency",{exact:true}).inputValue(),"USD");assert.equal(await page.getByLabel("Number format",{exact:true}).inputValue(),"dot-comma");
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
  await page.screenshot({path:`test-results/preferences/dark-en-${width}.png`,fullPage:true,animations:"disabled"});
  const savedUrl=page.url();await page.goto(savedUrl+"&view=dashboard");await page.getByRole("heading",{name:"Hello, Alex"}).waitFor();await page.getByRole("heading",{name:"Cash flow"}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`test-results/preferences/dashboard-dark-en-${width}.png`,fullPage:true,animations:"disabled"});
  await page.goto(savedUrl);await page.getByRole("button",{name:"Restore defaults",exact:true}).click();await page.getByRole("dialog").waitFor();await page.getByRole("button",{name:"Cancel",exact:true}).click();await page.getByRole("dialog").waitFor({state:"hidden"});assert.equal(await page.getByLabel("Primary currency",{exact:true}).inputValue(),"USD");
  await page.getByRole("button",{name:"Restore defaults",exact:true}).click();await page.getByRole("button",{name:"Restore preferences",exact:true}).click();await page.getByRole("heading",{name:"Configuración",exact:true}).waitFor();
  assert.equal(await page.locator("html").getAttribute("data-theme"),"system");assert.equal(await page.getByLabel("Moneda principal",{exact:true}).inputValue(),"DOP");
  await page.emulateMedia({colorScheme:"dark"});await page.waitForFunction(()=>getComputedStyle(document.querySelector(".preferences-card")).backgroundColor==="rgb(30, 33, 32)");
  await page.emulateMedia({colorScheme:"light",reducedMotion:"reduce"});await page.waitForFunction(()=>getComputedStyle(document.querySelector(".preferences-card")).backgroundColor==="rgb(255, 255, 255)");
  assert.deepEqual(errors,[]);await page.close();console.log(`OK: preferencias ${width}px; SSR/hidratación, temas, inglés, formatos, guardado, recarga, restauración, dashboard y movimiento reducido.`);
 }
 const page=await browser.newPage({viewport:{width:390,height:844}});const pwaErrors=[];page.on("pageerror",e=>pwaErrors.push(e.message));
 await page.goto("http://127.0.0.1:4178/?pwa&theme=dark");
 await page.getByText("Pantalla sin conexión preparada en este navegador.",{exact:true}).waitFor();
 await page.evaluate(()=>{const offer=new Event("beforeinstallprompt",{cancelable:true});offer.prompt=async()=>{window.promptCalls=(window.promptCalls??0)+1};offer.userChoice=Promise.resolve({outcome:"dismissed"});window.dispatchEvent(offer)});
 const installation=page.locator("#installation");await installation.scrollIntoViewIfNeeded();
 await page.getByText("Cómo instalar en mi dispositivo",{exact:true}).click();
 await page.getByRole("button",{name:"Instalar PagaTo",exact:true}).click();
 assert.equal(await page.evaluate(()=>window.promptCalls),1);assert.equal(await page.getByRole("button",{name:"Instalar PagaTo",exact:true}).count(),0);
 for(const width of [390,320]){await page.setViewportSize({width,height:1000});await installation.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`test-results/preferences/pwa-install-${width}.png`,fullPage:true,animations:"disabled"});}
 await page.context().setOffline(true);await page.getByText(/Estás sin conexión. Necesitas internet/).waitFor();
 await page.context().setOffline(false);await page.getByText(/Estás sin conexión. Necesitas internet/).waitFor({state:"hidden"});
 assert.deepEqual(pwaErrors,[]);await page.close();console.log("OK: PWA en Ajustes; instalación por acción explícita, ayuda Android/iOS/escritorio, offline/online y 320/390px sin desbordes.");
}finally{await browser?.close();await server.close();}
