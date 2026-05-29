export interface Product {
  id: number;
  name: string;
  price: string;
  description: string;
  category: string;
  imageUrl?: string;
}

export type TenantTheme = 'light' | 'dark' | 'cyberpunk';

export interface Tenant {
  id: string;
  name: string;
  type: "hub" | "store";
  description: string;
  theme: TenantTheme;
  domain: string;
  tagline: string;
  accentColor: string;
  products: Product[];
  licenseStatus?: 'PAID' | 'SUSPENDED';
  ownerId?: string;
  balance?: string;
  monthlyRent?: string;
  nextPaymentDate?: string;
  nuitCorporate?: string;
  customDomain?: string | null;
  plan?: 'Starter' | 'Pro' | 'Enterprise';
  accumulatedSales?: number;
  latitude?: number;
  longitude?: number;
}

export interface DropshippingLink {
  id: string;
  productId: number;
  productName: string;
  sourceStoreId: string;
  targetStoreId: string;
  costPrice: number;
  finalPrice: number;
  resellerProfit: number;
  bluewhiteCommission: number;
  createdAt: string;
  status: "ACTIVE" | "SOLD";
}

export interface PendingOrder {
  orderId: string;
  tenantId: string;
  amount: number;
  currency: string;
  gateway: string;
  scope: string;
  status: "PENDING" | "PAID" | "FAILED";
  metadata: Record<string, string>;
  createdAt: string;
}

export interface AdCampaign {
  id: string;
  clientName: string;
  targetUrl: string;
  imageUrl: string;
  placement: "FEED_TOP" | "STORE_SIDEBAR" | "FEED_GRID";
  costPerClick: number;
  budget: number;
  spent: number;
  clicks: number;
  impressions: number;
  totalImpressions: number;
  revenueEarned: number;
  isActive: boolean;
  createdAt: string;
}
