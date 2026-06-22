'use client';

import { useEffect } from 'react';
import { getCachedConfig, fetchConfig } from '@/lib/appConfigStore';
import { getCachedDatasetVersion, fetchDataset } from '@/lib/datasetStore';

/**
 * Invisible component mounted in the root layout.
 * On first render it:
 *   1. Fetches /api/public/config (updates cache)
 *   2. If the remote dataset_version differs from the cached version,
 *      downloads /api/public/dataset in the background.
 * Does NOT block the UI. Errors are silently swallowed.
 * Does NOT replace a valid cached dataset with a partial/failed download.
 */
export function SyncInit() {
  useEffect(() => {
    async function run() {
      const config = await fetchConfig();
      if (!config || !config.syncEnabled) return;

      const remoteDatasetVersion = config.datasetVersion;
      const cachedDatasetVersion = getCachedDatasetVersion();

      if (remoteDatasetVersion === '0.0.0') return; // no dataset published yet
      if (remoteDatasetVersion === cachedDatasetVersion) return; // already up to date

      // Fetch new dataset in background (non-blocking; result is stored in localStorage)
      fetchDataset().catch(() => { /* silently ignore */ });
    }

    run().catch(() => { /* silently ignore */ });

    // Also re-sync when the user comes back online
    const onOnline = () => { run().catch(() => {}); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  return null;
}
