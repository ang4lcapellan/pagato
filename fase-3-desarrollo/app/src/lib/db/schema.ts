import { pgSchema } from "drizzle-orm/pg-core";

// La migración SQL existente sigue siendo la fuente de verdad mientras el
// mapeo tipado se incorpora de manera incremental por módulo.
export const pagatoSchema = pgSchema("pagato");
