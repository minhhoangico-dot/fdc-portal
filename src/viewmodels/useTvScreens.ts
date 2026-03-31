/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { TvScreen, TvContentType } from '@/types/tvScreen';

interface TvScreenRow {
  id: string;
  slug: string;
  name: string;
  location: string | null;
  content_type: TvContentType;
  content_url: string;
  is_active: boolean;
  refresh_interval_seconds: number;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function mapRow(row: TvScreenRow): TvScreen {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    location: row.location,
    contentType: row.content_type,
    contentUrl: row.content_url,
    isActive: row.is_active,
    refreshIntervalSeconds: row.refresh_interval_seconds,
    settings: row.settings ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Admin hook — CRUD for the TvScreensTab
// ---------------------------------------------------------------------------

export function useTvScreensAdmin() {
  const [screens, setScreens] = useState<TvScreen[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchScreens = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fdc_tv_screens')
      .select('*')
      .order('name');

    if (error) {
      console.error('[useTvScreensAdmin] fetch error:', error);
      setMessage({ type: 'error', text: 'Không thể tải danh sách TV.' });
    } else {
      setScreens((data as TvScreenRow[]).map(mapRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchScreens();
  }, [fetchScreens]);

  const saveScreen = useCallback(
    async (screen: Partial<TvScreen> & { slug: string; name: string; contentUrl: string }) => {
      setMessage(null);

      const payload: Record<string, unknown> = {
        slug: screen.slug,
        name: screen.name,
        location: screen.location ?? null,
        content_type: screen.contentType ?? 'url',
        content_url: screen.contentUrl,
        is_active: screen.isActive ?? true,
        refresh_interval_seconds: screen.refreshIntervalSeconds ?? 300,
        settings: screen.settings ?? {},
      };

      let error;
      if (screen.id) {
        ({ error } = await supabase
          .from('fdc_tv_screens')
          .update(payload)
          .eq('id', screen.id));
      } else {
        ({ error } = await supabase.from('fdc_tv_screens').insert(payload));
      }

      if (error) {
        console.error('[useTvScreensAdmin] save error:', error);
        setMessage({ type: 'error', text: `Lỗi: ${error.message}` });
        return false;
      }

      setMessage({ type: 'success', text: `Đã lưu "${screen.name}".` });
      await fetchScreens();
      return true;
    },
    [fetchScreens],
  );

  const deleteScreen = useCallback(
    async (id: string) => {
      setMessage(null);
      const { error } = await supabase.from('fdc_tv_screens').delete().eq('id', id);

      if (error) {
        console.error('[useTvScreensAdmin] delete error:', error);
        setMessage({ type: 'error', text: `Không thể xoá: ${error.message}` });
        return;
      }

      setMessage({ type: 'success', text: 'Đã xoá TV.' });
      await fetchScreens();
    },
    [fetchScreens],
  );

  const toggleActive = useCallback(
    async (id: string) => {
      const target = screens.find((s) => s.id === id);
      if (!target) return;

      const { error } = await supabase
        .from('fdc_tv_screens')
        .update({ is_active: !target.isActive })
        .eq('id', id);

      if (error) {
        console.error('[useTvScreensAdmin] toggleActive error:', error);
        return;
      }

      await fetchScreens();
    },
    [screens, fetchScreens],
  );

  return { screens, loading, message, setMessage, fetchScreens, saveScreen, deleteScreen, toggleActive };
}

// ---------------------------------------------------------------------------
// Public hook — used by the /tv/:slug display page
// ---------------------------------------------------------------------------

export function useTvScreenPublic(slug: string) {
  const [screen, setScreen] = useState<TvScreen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevContentUrl = useRef<string | null>(null);

  const fetchScreen = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('fdc_tv_screens')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (fetchError) {
      console.error('[useTvScreenPublic] fetch error:', fetchError);
      setError('Không thể tải cấu hình TV.');
      setLoading(false);
      return;
    }

    if (!data) {
      setScreen(null);
      setError(null);
      setLoading(false);
      return;
    }

    const mapped = mapRow(data as TvScreenRow);

    // Detect content URL change → force iframe reload
    if (prevContentUrl.current !== null && prevContentUrl.current !== mapped.contentUrl) {
      window.location.reload();
      return;
    }

    prevContentUrl.current = mapped.contentUrl;
    setScreen(mapped);
    setError(null);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    fetchScreen();
  }, [fetchScreen]);

  // Poll for config changes
  useEffect(() => {
    if (!screen) return;

    const interval = setInterval(fetchScreen, screen.refreshIntervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [screen, fetchScreen]);

  return { screen, loading, error };
}
