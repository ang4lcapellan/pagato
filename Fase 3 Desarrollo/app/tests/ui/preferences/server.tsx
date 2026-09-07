import { renderToString } from "react-dom/server";
import { Preview, fromSearch } from "./fixture";
export function renderPreview(search:string) { return {markup:renderToString(<Preview search={search}/>),record:fromSearch(search)}; }
