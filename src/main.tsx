import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  // Supprime StrictMode pour éviter le double rendu
  <App />
)
