// Address of our backend (the Node server). Money settings are saved through it, never straight into Firestore.
// To change it without editing code, create admin/.env with:  VITE_BACKEND_URL=https://your-backend-address
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8790';
