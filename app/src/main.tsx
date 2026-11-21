import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// font installati come pacchetti: funzionano anche offline (vedi docs/GRAFICA.md)
import '@fontsource/bitter/latin-500.css'
import '@fontsource/bitter/latin-600.css'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-700.css'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
