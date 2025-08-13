// Centralized DUST/MUD namespace for the app
// Keep <= 14 chars
export const DUST_NAMESPACE = "rg_dd_0001";

// Helper table name builders
export const tableName = (name: string) => `${DUST_NAMESPACE}__${name}`;
