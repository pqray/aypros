import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Central class combiner: clsx + tailwind-merge (specs/03-design-system.md). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
