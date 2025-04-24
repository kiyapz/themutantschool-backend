// utils/event-manager.js
import { EventEmitter } from 'node:events';

const eventEmitter = new EventEmitter();

export default Object.freeze(eventEmitter);
