import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import AgentDetail from './components/AgentDetail';
import Login from './components/Login';

import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("token");
    delete axios.defaults.headers.common['Authorization'];
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }

    // Add interceptor for 401 Unauthorized
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          handleLogout();
        }
        return Promise.reject(error);
      }
    );


    // Cleanup
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const handleLoginSuccess = (newToken) => {
    setToken(newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    localStorage.setItem("token", newToken);
  };


  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {!token ? (
            <Route path="*" element={<Login onLoginSuccess={handleLoginSuccess} />} />
          ) : (
            <>
              <Route path="/" element={<DashboardWrapper onLogout={handleLogout} />} />
              <Route path="/agent/:id" element={<AgentDetail />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

// Wrapper to handle navigation from Dashboard logic
function DashboardWrapper({ onLogout }) {
  const navigate = useNavigate();
  return (
    <Dashboard
      onSelectAgent={(agent) => navigate(`/agent/${agent.hostname}`)}
      onLogout={onLogout}
    />
  );
}

export default App;
