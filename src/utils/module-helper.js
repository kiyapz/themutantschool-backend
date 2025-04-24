// src/utils/module-helper.js
import { createRequire } from 'module';
export const requireFn = createRequire(import.meta.url);
