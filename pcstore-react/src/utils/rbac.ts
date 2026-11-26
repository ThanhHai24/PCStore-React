export type AdminRole = 'ADMIN' | 'MANAGER' | 'STAFF_WAREHOUSE' | 'STAFF_TECH' | 'STAFF_SALES';

interface RoutePermissionRule {
  prefixes: string[];
  roles: AdminRole[];
}

/**
 * Client-side RBAC rules aligned with backend SecurityConfig.java.
 * ADMIN has full access to all /admin routes.
 */
const ROUTE_PERMISSION_RULES: RoutePermissionRule[] = [
  // System & User administration (ADMIN only)
  {
    prefixes: ['/admin/users', '/admin/user', '/admin/logs', '/admin/system-logs', '/admin/log'],
    roles: ['ADMIN'],
  },
  // Catalog & Analytics (ADMIN only in BE SecurityConfig /api/admin/**)
  {
    prefixes: [
      '/admin/product',
      '/admin/products',
      '/admin/brand',
      '/admin/brands',
      '/admin/category',
      '/admin/categories',
      '/admin/pcconfig',
      '/admin/pc-config',
      '/admin/reviews',
      '/admin/review',
      '/admin/comments',
      '/admin/supplier',
      '/admin/suppliers',
      '/admin/reports',
      '/admin/analytics',
    ],
    roles: ['ADMIN'],
  },
  // Warranty management
  {
    prefixes: ['/admin/warranty', '/admin/warranty-policies', '/admin/warranty-products', '/admin/warranty-requests'],
    roles: ['ADMIN', 'MANAGER', 'STAFF_TECH', 'STAFF_SALES'],
  },
  // Purchase orders
  {
    prefixes: ['/admin/import', '/admin/imports', '/admin/purchase-order', '/admin/purchase-orders'],
    roles: ['ADMIN', 'MANAGER', 'STAFF_WAREHOUSE'],
  },
  // Goods receipts, warehouse, supplier returns & deliveries
  {
    prefixes: [
      '/admin/import-ticket',
      '/admin/import-tickets',
      '/admin/goods-receipt',
      '/admin/goods-receipts',
      '/admin/warehouse/inbound',
      '/admin/warehouse/supplier-return',
      '/admin/supplier-return',
      '/admin/warehouse/inventory',
      '/admin/warehouse/products',
      '/admin/inventory',
      '/admin/warehouse/packaging',
      '/admin/packaging',
      '/admin/warehouse/handover',
      '/admin/handover',
      '/admin/shipping',
      '/admin/delivery',
      '/admin/deliveries',
    ],
    roles: ['ADMIN', 'MANAGER', 'STAFF_WAREHOUSE'],
  },
  // Product serials
  {
    prefixes: ['/admin/warehouse/serial', '/admin/serial'],
    roles: ['ADMIN', 'MANAGER', 'STAFF_WAREHOUSE', 'STAFF_TECH', 'STAFF_SALES'],
  },
  // Orders, invoices, payments & customers
  {
    prefixes: [
      '/admin/sales/orders',
      '/admin/order',
      '/admin/orders',
      '/admin/sales/invoices',
      '/admin/invoice',
      '/admin/invoices',
      '/admin/payment',
      '/admin/payments',
    ],
    roles: ['ADMIN', 'MANAGER', 'STAFF_WAREHOUSE', 'STAFF_SALES'],
  },
  {
    prefixes: ['/admin/sales/customers', '/admin/customers'],
    roles: ['ADMIN'],
  },
];

export function canAccessAdminPath(role: string | undefined | null, pathname: string): boolean {
  if (!role || role === 'CUSTOMER') return false;
  if (role === 'ADMIN') return true;

  const normalizedPath = pathname.toLowerCase().replace(/\/+$/, '') || '/admin';
  if (normalizedPath === '/admin' || normalizedPath === '/admin/dashboard' || normalizedPath === '/admin/admin') {
    return true;
  }

  const matchedRule = ROUTE_PERMISSION_RULES.find((rule) =>
    rule.prefixes.some((prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`))
  );

  if (!matchedRule) {
    return false;
  }

  return matchedRule.roles.includes(role as AdminRole);
}
