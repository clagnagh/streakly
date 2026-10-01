import { useCallback, useEffect, useState } from 'react';
import { requestPersistence, storageStatus, type StorageStatus } from '../db/storage.ts';

/** Whether the browser has promised to keep our data, plus a way to ask. */
export function useStorageStatus() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  useEffect(() => {
    void storageStatus().then(setStatus);
  }, []);
  const ask = useCallback(() => void requestPersistence().then(setStatus), []);
  return { status, ask };
}
