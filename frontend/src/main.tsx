import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProviders } from '@/core/providers/AppProviders'
import '@/core/styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders />
  </React.StrictMode>,
)
