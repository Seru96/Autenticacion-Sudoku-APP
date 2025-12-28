import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SudokuGame from './SudokuGame';

// --- PALETA DE COLORES COZY ---
const colors = {
  bgGradient: 'linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%)',
  cardBg: 'rgba(255, 253, 250, 0.95)',
  textPrimary: '#5a4a42',
  textSecondary: '#8c7b70',
  accent: '#c19a6b',
  accentHover: '#a8855a',
  errorBg: '#e57373',
  successBg: '#81c784'
};

function App() {
  const [view, setView] = useState('login'); // login, register, forgot, game
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(false); // Nuevo estado
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Al cargar, buscamos token en localStorage O sessionStorage
  const [token, setToken] = useState(
    localStorage.getItem('token') || sessionStorage.getItem('token')
  );

  const API_URL = "http://localhost:8000";

  useEffect(() => {
    if (token) setView('game');
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setToken(null);
    setView('login');
    setEmail('');
    setPassword('');
    setMessage('');
    setError('');
  };

  const handleRegister = async () => {
    try {
      setError(''); setMessage('');
      await axios.post(`${API_URL}/register`, { email, password, full_name: fullName });
      setMessage('Registro exitoso. Inicia sesión.');
      setView('login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error en registro');
    }
  };

  const handleLogin = async () => {
    try {
      setError(''); setMessage('');
      const res = await axios.post(`${API_URL}/login`, { 
        email, 
        password,
        remember_me: rememberMe 
      });
      
      const newToken = res.data.access_token;
      setToken(newToken);
      
      // Lógica de "Recordar Contraseña"
      if (rememberMe) {
        localStorage.setItem('token', newToken); // Se guarda para siempre
      } else {
        sessionStorage.setItem('token', newToken); // Se borra al cerrar navegador
      }
      
      setView('game');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error en login');
    }
  };

  const handleForgot = async () => {
    try {
      setError(''); setMessage('');
      // Llamada al endpoint simulado
      const res = await axios.post(`${API_URL}/forgot-password`, { email });
      setMessage(res.data.message);
    } catch (err) {
      setError('No se pudo enviar el correo de recuperación.');
    }
  };

  // --- VISTAS ---
  if (view === 'game') {
    return (
      <div style={styles.background}>
        <SudokuGame onLogout={handleLogout} username={fullName || email.split('@')[0]} />
      </div>
    );
  }

  return (
    <div style={styles.background}>
      <div style={styles.card}>
        <h2 style={styles.title}>
          {view === 'login' ? 'Bienvenido' : view === 'register' ? 'Crear Cuenta' : 'Recuperar Cuenta'}
        </h2>

        {message && <div style={styles.success}>{message}</div>}
        {error && <div style={styles.error}>{error}</div>}

        {/* --- VISTA LOGIN --- */}
        {view === 'login' && (
          <>
            <input style={styles.input} type="email" placeholder="Correo Electrónico" value={email} onChange={e => setEmail(e.target.value)} />
            <input style={styles.input} type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />
            
            {/* Checkbox Recordar */}
            <div style={styles.checkboxContainer}>
              <label style={{cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={e => setRememberMe(e.target.checked)} 
                  style={{accentColor: colors.accent, marginRight: '8px', transform: 'scale(1.2)'}}
                />
                Recordar contraseña
              </label>
            </div>

            <button style={styles.button} onClick={handleLogin}>Entrar</button>
            
            <p style={styles.footerText}>
              <span style={styles.link} onClick={() => setView('forgot')}>¿Olvidaste tu contraseña?</span>
            </p>
            <p style={styles.footerText}>
              ¿No tienes cuenta? <span style={styles.link} onClick={() => setView('register')}>Regístrate aquí</span>
            </p>
          </>
        )}

        {/* --- VISTA REGISTRO --- */}
        {view === 'register' && (
          <>
             <input style={styles.input} type="text" placeholder="Nombre Completo" value={fullName} onChange={e => setFullName(e.target.value)} />
             <input style={styles.input} type="email" placeholder="Correo Electrónico" value={email} onChange={e => setEmail(e.target.value)} />
             <input style={styles.input} type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />

             <button style={styles.button} onClick={handleRegister}>Registrarme</button>
             <p style={styles.footerText}>
               <span style={styles.link} onClick={() => setView('login')}>Volver al Login</span>
             </p>
          </>
        )}

        {/* --- VISTA OLVIDÉ CONTRASEÑA --- */}
        {view === 'forgot' && (
          <>
             <p style={{color: colors.textSecondary, marginBottom: '15px', textAlign: 'center'}}>
               Introduce tu correo y te enviaremos un enlace para restablecer tu contraseña.
             </p>
             <input style={styles.input} type="email" placeholder="Correo Electrónico" value={email} onChange={e => setEmail(e.target.value)} />

             <button style={styles.button} onClick={handleForgot}>Recuperar Contraseña</button>
             <p style={styles.footerText}>
               <span style={styles.link} onClick={() => setView('login')}>Volver al Login</span>
             </p>
          </>
        )}

      </div>
    </div>
  );
}

// --- ESTILOS MEJORADOS ---
const styles = {
  background: {
    minHeight: '100vh', width: '100vw', background: colors.bgGradient,
    display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: "'Segoe UI', Roboto, sans-serif"
  },
  card: {
    backgroundColor: colors.cardBg, padding: '40px', borderRadius: '20px',
    boxShadow: '0 10px 25px rgba(90, 74, 66, 0.1)', width: '100%', maxWidth: '420px',
    display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.4)'
  },
  title: { textAlign: 'center', marginBottom: '25px', color: colors.textPrimary, fontWeight: '600' },
  input: {
    padding: '14px', margin: '10px 0', border: `2px solid ${colors.textSecondary}33`,
    borderRadius: '12px', fontSize: '16px', backgroundColor: '#fffaf5',
    color: colors.textPrimary, outline: 'none'
  },
  checkboxContainer: {
    margin: '10px 0', color: colors.textSecondary, fontSize: '15px', display: 'flex', alignItems: 'center'
  },
  button: {
    padding: '14px', marginTop: '20px', backgroundColor: colors.accent, color: 'white',
    border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: '600',
    cursor: 'pointer', boxShadow: '0 4px 10px rgba(193, 154, 107, 0.3)'
  },
  link: { color: colors.accent, cursor: 'pointer', fontWeight: 'bold' },
  footerText: { textAlign: 'center', marginTop: '15px', fontSize: '15px', color: colors.textSecondary },
  error: { color: 'white', backgroundColor: colors.errorBg, padding: '12px', borderRadius: '10px', marginBottom: '15px', textAlign: 'center' },
  success: { color: 'white', backgroundColor: colors.successBg, padding: '12px', borderRadius: '10px', marginBottom: '15px', textAlign: 'center' }
};

export default App;