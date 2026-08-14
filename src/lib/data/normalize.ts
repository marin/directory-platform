import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { Address } from "../validation/entry-schema.ts";

export interface Nap {
  name: string;
  phone: string | undefined;
  address: Address | undefined;
  formattedAddress: string | undefined;
  formattedPhone: string | undefined;
}

export function normalizePhone(
  phone: string | undefined,
  region: string,
): string | undefined {
  if (!phone?.trim()) return undefined;
  const parsed = parsePhoneNumberFromString(phone, region as "US");
  if (!parsed?.isValid()) return phone.trim();
  return parsed.format("E.164");
}

export function formatPhoneForDisplay(
  phone: string | undefined,
  region: string,
): string | undefined {
  if (!phone?.trim()) return undefined;
  const parsed = parsePhoneNumberFromString(phone, region as "US");
  if (!parsed?.isValid()) return phone.trim();
  return parsed.formatNational();
}

export function formatAddress(address: Address): string {
  const cityLine = [address.postalCode, address.locality].filter(Boolean).join(" ");
  return [address.street, cityLine].filter(Boolean).join(", ");
}

export function buildNap(
  name: string,
  phone: string | undefined,
  address: Address | undefined,
  phoneRegion: string,
): Nap {
  const normalizedPhone = normalizePhone(phone, phoneRegion);
  return {
    name: name.trim(),
    phone: normalizedPhone,
    address,
    formattedAddress: address ? formatAddress(address) : undefined,
    formattedPhone: formatPhoneForDisplay(normalizedPhone, phoneRegion),
  };
}

export function stripEmpty<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (value === "" || value === null || value === undefined) {
      delete result[key];
    }
    if (Array.isArray(value) && value.length === 0) {
      delete result[key];
    }
  }
  return result;
}
