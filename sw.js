import { bindServiceWorker } from './js/offline/worker.js';

// Bump DEPLOY_SALT on every deploy. Browsers check this file, not its imports,
// and the salt is part of the cache name so activate can drop the previous cache.
const DEPLOY_SALT = '20261015g';

bindServiceWorker(self, DEPLOY_SALT);
