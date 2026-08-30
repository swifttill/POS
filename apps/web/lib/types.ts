export type Station =
  | "BAR"
  | "GRILL"
  | "FRY"
  | "MAIN"
  | "DESSERT"
  | "EXPO";

export type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";

export interface ModifierDTO {
  id: string;
  name: string;
  priceDelta: number;
}

export interface ModifierGroupDTO {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
  modifiers: ModifierDTO[];
}

export interface MenuItemDTO {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  available: boolean;
  printerStation: Station;
  modifierGroups: ModifierGroupDTO[];
}

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  items: MenuItemDTO[];
}

export interface CompanyDTO {
  name: string;
  address: string | null;
  tagline: string | null;
  currency: string;
  gstEnabled: boolean;
  gstRate: number;
}

export interface MenuResponse {
  company: CompanyDTO;
  categories: CategoryDTO[];
  deals: DealDTO[];
}

export interface DealDTO {
  id: string;
  name: string;
  type: "BOGO" | "BUNDLE" | "PERCENT";
  value: number; // BUNDLE: paisa; PERCENT: percent as integer
  items: {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    quantity: number;
  }[];
}

// Client-side cart shape
export interface CartModifier {
  id: string;
  name: string;
  priceDelta: number;
}

export interface CartLine {
  lineId: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  notes: string;
  seat: number | null;
  station: Station;
  modifiers: CartModifier[];
}
