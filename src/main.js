import './style.css';
import { boot } from './app.js';

boot().catch((e) => console.error('[just-right] boot failed', e));
