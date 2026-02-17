// Logo: import base64 as raw text - bundled by Vite, no prebuild script needed (works on Vercel)
import logoBase64 from './logo-base64.txt?raw';
export const LOGO_DATA_URL = `data:image/png;base64,${logoBase64.trim()}`;
