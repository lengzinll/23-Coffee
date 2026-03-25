import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import moment from "moment";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string, format: string = "DD-MM-YYYY HH:mm A") {
  return moment(date).format(format);
}
