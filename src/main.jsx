import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

// The Redux <Provider> is added in Phase 3, once the store exists.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#FFFFFF',
            color: '#0A0A0A',
            border: '1px solid #E5E5E5',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(10, 10, 10, 0.06)',
            fontFamily: '"Schibsted Grotesk", system-ui, sans-serif',
            fontSize: '14px',
            padding: '12px 16px',
          },
          success: { iconTheme: { primary: '#2F6B48', secondary: '#FFFFFF' } },
          error: { iconTheme: { primary: '#B4342F', secondary: '#FFFFFF' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
