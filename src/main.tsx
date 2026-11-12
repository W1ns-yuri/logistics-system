import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { bootstrap } from './data/remote'
import { API_MODE } from './lib/api'

// Рабочая сборка: сразу спрашиваем сервер, вошёл ли уже человек
if (API_MODE) void bootstrap()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
