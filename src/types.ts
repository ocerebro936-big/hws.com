/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: number;
  name: string;
  price: string;
  description?: string;
  category?: string;
  image?: string;
  imageUrl?: string;
}

export type TenantTheme = 'light' | 'dark' | 'cyberpunk';

export interface Tenant {
  id: string; // e.g. "moda", "tech", "hub"
  name: string;
  type: 'hub' | 'store';
  description: string;
  theme: TenantTheme;
  domain: string; // e.g. "moda.hws.com", "tech.hws.com", "hws.com"
  products: Product[];
  tagline?: string;
  accentColor?: string;
  
  // Bluewhite Corporation Legal & Financial Parameters
  licenseStatus?: 'PAID' | 'SUSPENDED';
  ownerId?: string;
  balance?: string;
  monthlyRent?: string;
  nextPaymentDate?: string;
  nuitCorporate?: string; // Tax ID for Moçambique compliance
  customDomain?: string | null; // e.g. "vanguardmoda.com"
  plan?: 'Starter' | 'Pro' | 'Enterprise';
  accumulatedSales?: number; // accumulated revenue in MT digits
}

export interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warning';
  message: string;
}
