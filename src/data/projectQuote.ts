import { type AddOn, type Package } from './pricing';

export const projectQuoteStorageKey = 'samuelStudioProjectQuote';

export type StoredPackageSelection = {
  id: string;
  name: string;
  price: number;
};

export type StoredAddOnSelection = {
  id: string;
  name: string;
  internalName: string;
  price: number;
};

export type StoredProjectQuote = {
  selectedPackage: StoredPackageSelection | null;
  selectedAddons: StoredAddOnSelection[];
  estimatedTotal: number;
};

export type LoadedProjectQuote = {
  selectedPackageId: string | null;
  visualSelectedPackageId: string | null;
  selectedAddonIds: string[];
};

export function loadStoredQuote(): LoadedProjectQuote {
  if (typeof window === 'undefined') {
    return { selectedPackageId: null, visualSelectedPackageId: null, selectedAddonIds: [] };
  }

  try {
    const raw = window.localStorage.getItem(projectQuoteStorageKey);

    if (!raw) {
      return { selectedPackageId: null, visualSelectedPackageId: null, selectedAddonIds: [] };
    }

    const parsed = JSON.parse(raw) as Partial<StoredProjectQuote>;
    const selectedPackageId = typeof parsed.selectedPackage?.id === 'string' ? parsed.selectedPackage.id : null;
    const selectedAddonIds = Array.isArray(parsed.selectedAddons)
      ? parsed.selectedAddons
          .map((addon) => (typeof addon?.id === 'string' ? addon.id : null))
          .filter((id): id is string => Boolean(id))
      : [];

    return { selectedPackageId, visualSelectedPackageId: selectedPackageId, selectedAddonIds };
  } catch {
    return { selectedPackageId: null, visualSelectedPackageId: null, selectedAddonIds: [] };
  }
}

export function buildStoredQuote(selectedPackage: Package | null, selectedAddOns: AddOn[]): StoredProjectQuote {
  const selectedPackagePayload = selectedPackage
    ? {
        id: selectedPackage.id,
        name: selectedPackage.title,
        price: selectedPackage.priceValue ?? 0,
      }
    : null;

  const selectedAddOnsPayload = selectedAddOns.map((addon) => ({
    id: addon.id,
    name: addon.name,
    internalName: addon.internalName,
    price: addon.priceValue,
  }));

  const oneTimeAddOnTotal = selectedAddOns
    .filter((addon) => addon.billing === 'one-time')
    .reduce((sum, addon) => sum + addon.priceValue, 0);

  return {
    selectedPackage: selectedPackagePayload,
    selectedAddons: selectedAddOnsPayload,
    estimatedTotal: (selectedPackage?.priceValue ?? 0) + oneTimeAddOnTotal,
  };
}

export function getProjectQuoteItemCount(selectedPackage: Package | null, selectedAddOns: AddOn[]) {
  return (selectedPackage ? 1 : 0) + selectedAddOns.length;
}
