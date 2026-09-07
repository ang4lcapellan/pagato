import { getCategoryIcon } from "../model";

const paths = {
  utensils: "M4 3v5c0 3 5 3 5 0V3M6.5 3v14M16 17V3c-4 2-4 7 0 7",
  bus: "M4 14V5c0-3 12-3 12 0v9H4ZM4 9h12M6 14v3M14 14v3M6 11h1M13 11h1",
  house: "M2 9 10 3l8 6M4 8v9h12V8M8 17v-6h4v6",
  receipt: "M5 3h10v14l-2-1-3 1-3-1-2 1V3ZM8 7h4M8 10h4",
  "heart-pulse": "M10 17 3 10C-1 5 5 0 10 6c5-6 11-1 7 4l-7 7ZM3 10h4l2-3 2 6 2-3h4",
  "graduation-cap": "m2 7 8-4 8 4-8 4-8-4ZM5 9v5c3 3 7 3 10 0V9M18 7v7",
  popcorn: "M5 8 7 17h6l2-9H5ZM6 8C2 6 5 2 8 4c1-4 5-3 5 0 4-2 6 3 1 4M8 10l1 5M12 10l-1 5",
  "wallet-cards": "M3 6h14v11H3V6Zm0 2h12M13 10h5v4h-5a2 2 0 1 1 0-4ZM4 6V3h11v3",
  "circle-plus": "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM10 6v8M6 10h8",
  ellipsis: "M4 10h.1M10 10h.1M16 10h.1",
  briefcase: "M3 6h14v11H3V6ZM7 6V3h6v3M3 10c4 3 10 3 14 0M9 11v2h2v-2",
  gift: "M3 8h14v3H3zM5 11v6h10v-6M10 8v9M10 8C1 8 4 0 10 8c6-8 9 0 0 0",
  shopping: "M4 7h12l1 10H3L4 7ZM7 7V5a3 3 0 0 1 6 0v2",
  pet: "M6 12c2-5 6-5 8 0 5 5-1 7-4 4-3 3-9 1-4-4ZM4 8V7M8 5V4M12 5V4M16 8V7",
} as const;

export function CategoryIcon({ name }: { name: string | null }) {
  return <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[getCategoryIcon(name)]} /></svg>;
}
