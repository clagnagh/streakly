import { useStorageStatus } from '../hooks/useStorageStatus.ts';
import styles from './StorageNote.module.css';

const text = {
  persisted: 'Your habits are kept safe on this device.',
  'not-persisted':
    'Your habits are saved on this device, but the browser may clear them if space runs low.',
  unsupported: "This browser doesn't say whether it will keep your data.",
} as const;

/** One line in Settings saying whether the browser promised to keep our data. */
export function StorageNote() {
  const { status, ask } = useStorageStatus();
  if (!status) return null;
  return (
    <div className={styles.note} data-testid="storage-status" data-status={status}>
      <p>{text[status]}</p>
      {status === 'not-persisted' && (
        <button className={styles.button} onClick={ask}>
          Ask to keep it
        </button>
      )}
    </div>
  );
}
