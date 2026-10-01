// Asks the browser to keep our data. Without this, a browser may delete a
// site's storage when the device runs low on space (Safari also clears sites
// that haven't been used for a while, unless they're installed to the home
// screen). Chrome decides without asking; Firefox may show a prompt.

export type StorageStatus = 'persisted' | 'not-persisted' | 'unsupported';

export async function storageStatus(): Promise<StorageStatus> {
  try {
    if (!navigator.storage?.persisted) return 'unsupported';
    return (await navigator.storage.persisted()) ? 'persisted' : 'not-persisted';
  } catch {
    return 'unsupported';
  }
}

export async function requestPersistence(): Promise<StorageStatus> {
  try {
    if (!navigator.storage?.persist) return 'unsupported';
    return (await navigator.storage.persist()) ? 'persisted' : 'not-persisted';
  } catch {
    return 'unsupported';
  }
}
