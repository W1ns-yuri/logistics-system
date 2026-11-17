import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadCatalog } from './data/catalog'
import { bootstrap } from './data/remote'
import { API_MODE } from './lib/api'

// Рабочая сборка: сразу спрашиваем сервер, вошёл ли уже человек
if (API_MODE) {
  void bootstrap()
  // Справочники владельца платформы (свои города, типы транспорта и т. п.)
  void loadCatalog()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
