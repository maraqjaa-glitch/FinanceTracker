import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'        // init i18next before anything renders
import './index.css'
import App from './App'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
