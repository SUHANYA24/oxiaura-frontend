import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import store from './store'
import App from './App'
import RouteErrorBoundary from './components/ErrorBoundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        {/*
          Inside the router so the boundary can reset itself on navigation, but
          outside <Routes> so a throw in the route table itself is still caught.
          The Toaster stays outside it: if a page crashes, the toast that
          explained why should survive the fallback.
        */}
        <RouteErrorBoundary>
          <App />
        </RouteErrorBoundary>
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
    </Provider>
  </React.StrictMode>,
)
