import type { SVGProps } from "react";

const paths = {
  home: "M3 10.5 10 4l7 6.5V18H5v-7.5M8 18v-5h4v5",
  wallet: "M3 6h14v11H3V6Zm0 2h12M13 10h5v4h-5a2 2 0 1 1 0-4Z",
  movements: "M4 7h12M13 4l3 3-3 3M16 13H4M7 10l-3 3 3 3",
  budget: "M10 3v7h7M17 10a7 7 0 1 1-7-7",
  settings: "M10 2v2M10 16v2M2 10h2M16 10h2M4.4 4.4l1.4 1.4M14.2 14.2l1.4 1.4M15.6 4.4l-1.4 1.4M5.8 14.2l-1.4 1.4M13 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  plus: "M10 4v12M4 10h12", close: "M5 5l10 10M15 5 5 15",
  edit: "m12 4 4 4M4 12 14 2l4 4L8 16l-5 1 1-5Z",
  archive: "M3 4h14v4H3zM5 8v9h10V8M8 11h4",
  arrow: "M4 10h12M11 5l5 5-5 5",
  categories: "M3 3h5v5H3zM12 3h5v5h-5zM3 12h5v5H3zM12 12h5v5h-5z",
  expense: "M5 5l10 10M6 15h9V6",
  income: "M5 15 15 5M6 5h9v9",
} as const;
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
