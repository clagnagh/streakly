import type { Db } from './adapter.ts';
import { completionsRepo } from './completionsRepo.ts';
import { habitsRepo } from './habitsRepo.ts';
import { settingsRepo } from './settingsRepo.ts';

/** Every repository, over one database. */
export function createRepos(db: Db) {
  return {
    habits: habitsRepo(db),
    completions: completionsRepo(db),
    settings: settingsRepo(db),
  };
}

export type Repos = ReturnType<typeof createRepos>;
