export type FinancialProfile = {
  id: string;
  displayName: string;
  email: string;
  preferences: {
    theme: "light" | "dark" | "system";
    locale: "es" | "en";
    baseCurrency: string;
    timezone: string;
    dateFormat: string;
  };
  defaultCategories: { income: number; expense: number };
};

export type FinancialProfileResult =
  | { status: "ready"; profile: FinancialProfile }
  | { status: "unavailable" | "inactive" | "invalid-session" };
