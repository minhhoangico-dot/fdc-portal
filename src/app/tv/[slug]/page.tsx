/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Monitor } from 'lucide-react';
import { useTvScreenPublic } from '@/viewmodels/useTvScreens';

export default function TvDisplayPage() {
  const { slug } = useParams<{ slug: string }>();
  const { screen, loading, error } = useTvScreenPublic(slug ?? '');

  // Internal redirect
  useEffect(() => {
    if (screen && screen.contentType === 'internal') {
      window.location.replace(screen.contentUrl);
    }
  }, [screen]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-gray-950 text-white">
        <Monitor className="h-12 w-12 text-gray-600" />
        <p className="text-lg text-gray-400">{error}</p>
      </div>
    );
  }

  if (!screen) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-gray-950 text-white">
        <Monitor className="h-12 w-12 text-gray-600" />
        <p className="text-lg text-gray-400">TV chưa được cấu hình</p>
        <p className="text-sm text-gray-600">Slug: {slug}</p>
      </div>
    );
  }

  // Internal type shows loading while redirecting
  if (screen.contentType === 'internal') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-white" />
      </div>
    );
  }

  // URL type → full-screen iframe
  return (
    <iframe
      src={screen.contentUrl}
      title={screen.name}
      className="h-screen w-screen border-0"
      allow="fullscreen; autoplay"
    />
  );
}
