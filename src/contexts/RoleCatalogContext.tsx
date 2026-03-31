/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_ROLE_CATALOG, mergeRoleCatalog, sortRoleCatalog } from '@/lib/role-catalog';
import type { RoleCatalogItem } from '@/types/roleCatalog';
import type { Role } from '@/types/user';

type RoleCatalogUpdate = Pick<
  RoleCatalogItem,
  'displayName' | 'description' | 'sortOrder' | 'isActive'
>;

interface RoleCatalogContextValue {
  roleCatalog: RoleCatalogItem[];
  activeRoles: RoleCatalogItem[];
  isLoading: boolean;
  refreshRoleCatalog: () => Promise<void>;
  saveRoleCatalogItem: (roleKey: Role, updates: RoleCatalogUpdate) => Promise<void>;
  getRoleLabel: (roleKey: string) => string;
  getRoleDescription: (roleKey: string) => string;
  getAssignableRoles: (includeRoleKey?: string) => RoleCatalogItem[];
}

interface RoleCatalogRow {
  role_key: Role;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const RoleCatalogContext = createContext<RoleCatalogContextValue | undefined>(undefined);

function mapRowToCatalogItem(row: RoleCatalogRow): Partial<RoleCatalogItem> {
  return {
    roleKey: row.role_key,
    displayName: row.display_name,
    description: row.description ?? '',
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function RoleCatalogProvider({ children }: { children: React.ReactNode }) {
  const [roleCatalog, setRoleCatalog] = useState<RoleCatalogItem[]>(
    sortRoleCatalog(DEFAULT_ROLE_CATALOG),
  );
  const [isLoading, setIsLoading] = useState(true);

  const refreshRoleCatalog = useCallback(async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('fdc_role_catalog')
        .select('*')
        .order('sort_order')
        .order('role_key');

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        setRoleCatalog(sortRoleCatalog(DEFAULT_ROLE_CATALOG));
        return;
      }

      setRoleCatalog(
        mergeRoleCatalog((data as RoleCatalogRow[]).map((row) => mapRowToCatalogItem(row))),
      );
    } catch (error) {
      console.error('Failed to fetch fdc_role_catalog, falling back to defaults:', error);
      setRoleCatalog(sortRoleCatalog(DEFAULT_ROLE_CATALOG));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRoleCatalog();
  }, [refreshRoleCatalog]);

  const roleCatalogMap = useMemo(
    () => new Map(roleCatalog.map((item) => [item.roleKey, item])),
    [roleCatalog],
  );

  const activeRoles = useMemo(
    () => roleCatalog.filter((item) => item.isActive),
    [roleCatalog],
  );

  const getRoleItem = useCallback(
    (roleKey: string) =>
      roleCatalogMap.get(roleKey as Role) ??
      DEFAULT_ROLE_CATALOG.find((item) => item.roleKey === roleKey),
    [roleCatalogMap],
  );

  const getRoleLabel = useCallback(
    (roleKey: string) => getRoleItem(roleKey)?.displayName ?? roleKey,
    [getRoleItem],
  );

  const getRoleDescription = useCallback(
    (roleKey: string) => getRoleItem(roleKey)?.description ?? '',
    [getRoleItem],
  );

  const getAssignableRoles = useCallback(
    (includeRoleKey?: string) => {
      const options = [...activeRoles];

      if (!includeRoleKey) {
        return options;
      }

      const included = getRoleItem(includeRoleKey);
      if (!included) {
        return options;
      }

      if (!options.some((item) => item.roleKey === included.roleKey)) {
        options.push(included);
      }

      return sortRoleCatalog(options);
    },
    [activeRoles, getRoleItem],
  );

  const saveRoleCatalogItem = useCallback(
    async (roleKey: Role, updates: RoleCatalogUpdate) => {
      const payload = {
        role_key: roleKey,
        display_name: updates.displayName.trim(),
        description: updates.description.trim() || null,
        sort_order: updates.sortOrder,
        is_active: updates.isActive,
      };

      const { error } = await supabase
        .from('fdc_role_catalog')
        .upsert(payload, { onConflict: 'role_key' });

      if (error) {
        throw error;
      }

      setRoleCatalog((currentCatalog) =>
        mergeRoleCatalog([
          ...currentCatalog,
          {
            roleKey,
            displayName: payload.display_name,
            description: payload.description ?? '',
            sortOrder: payload.sort_order,
            isActive: payload.is_active,
          },
        ]),
      );
    },
    [],
  );

  const contextValue = useMemo<RoleCatalogContextValue>(
    () => ({
      roleCatalog,
      activeRoles,
      isLoading,
      refreshRoleCatalog,
      saveRoleCatalogItem,
      getRoleLabel,
      getRoleDescription,
      getAssignableRoles,
    }),
    [
      roleCatalog,
      activeRoles,
      isLoading,
      refreshRoleCatalog,
      saveRoleCatalogItem,
      getRoleLabel,
      getRoleDescription,
      getAssignableRoles,
    ],
  );

  return (
    <RoleCatalogContext.Provider value={contextValue}>
      {children}
    </RoleCatalogContext.Provider>
  );
}

export function useRoleCatalog() {
  const context = useContext(RoleCatalogContext);
  if (!context) {
    throw new Error('useRoleCatalog must be used within a RoleCatalogProvider');
  }

  return context;
}
