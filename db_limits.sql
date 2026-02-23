CREATE TABLE tenant_limits (
  tenant_id TEXT PRIMARY KEY,
  max_os INTEGER DEFAULT 999,
  max_products INTEGER DEFAULT 999,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
