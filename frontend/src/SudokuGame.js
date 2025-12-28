import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// --- PALETA COZY ---
const theme = {
  text: '#5a4a42',
  textLight: '#8c7b70',
  boardBorder: '#a89b93',
  cellBg: '#fffaf5',
  fixedBg: '#eee0d5',
  selected: '#ffe0b2',
  highlight: '#fff3e0',
  error: '#ffccbc',
  accent: '#d7ccc8',
  accentDark: '#a1887f',
  cardBg: 'rgba(255, 255, 255, 0.6)',
  success: '#81c784'
};

const API_URL = "http://localhost:8000";

// --- LÓGICA DE DIFICULTAD (Basada en tu código Swift) ---
const DIFFICULTY_SETTINGS = {
  'Fácil': { id: 0, holes: 20, multiplier: 1, timeBase: 720, winBonus: 5 },
  'Medio': { id: 1, holes: 35, multiplier: 2, timeBase: 1440, winBonus: 10 },
  'Difícil': { id: 2, holes: 50, multiplier: 3, timeBase: 2160, winBonus: 15 }
};

// --- GENERADOR SUDOKU ---
const SudokuGenerator = {
  generate: (diffName) => {
    let grid = Array(9).fill().map(() => Array(9).fill(0));
    fillGrid(grid);
    const solution = grid.map(row => [...row]);
    
    const settings = DIFFICULTY_SETTINGS[diffName] || DIFFICULTY_SETTINGS['Medio'];
    let attempts = settings.holes;
    
    while (attempts > 0) {
      let r = Math.floor(Math.random() * 9);
      let c = Math.floor(Math.random() * 9);
      if (grid[r][c] !== 0) {
        grid[r][c] = 0;
        attempts--;
      }
    }
    
    let cells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        cells.push({
          id: `${r}-${c}`, row: r, col: c,
          value: grid[r][c] === 0 ? null : grid[r][c],
          solution: solution[r][c],
          isFixed: grid[r][c] !== 0,
          isError: false
        });
      }
    }
    return cells;
  }
};

function fillGrid(grid) {
  for (let i = 0; i < 81; i++) {
    let r = Math.floor(i / 9);
    let c = i % 9;
    if (grid[r][c] === 0) {
      let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
      for (let n of nums) {
        if (isValid(grid, r, c, n)) {
          grid[r][c] = n;
          if (fillGrid(grid)) return true;
          grid[r][c] = 0;
        }
      }
      return false;
    }
  }
  return true;
}

function isValid(grid, r, c, n) {
  for (let i = 0; i < 9; i++) {
    if (grid[r][i] === n || grid[i][c] === n) return false;
  }
  let sr = Math.floor(r / 3) * 3;
  let sc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (grid[sr + i][sc + j] === n) return false;
    }
  }
  return true;
}

// --- COMPONENTE PRINCIPAL ---
export default function SudokuGame({ onLogout, username }) {
  const [gameState, setGameState] = useState('menu');
  const [difficulty, setDifficulty] = useState('Medio');
  const [cells, setCells] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [score, setScore] = useState(0); // Puntos actuales
  const [timeElapsed, setTimeElapsed] = useState(0); // Cronómetro
  const [leaderboard, setLeaderboard] = useState([]);
  const timerRef = useRef(null);

  // Cargar ranking al iniciar
  useEffect(() => {
    fetchLeaderboard();
    return () => clearInterval(timerRef.current);
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get(`${API_URL}/leaderboard`);
      setLeaderboard(res.data);
    } catch (e) { console.error("Error leaderboard"); }
  };

  const startGame = (diff) => {
    setDifficulty(diff);
    setCells(SudokuGenerator.generate(diff));
    setMistakes(0);
    setScore(0);
    setTimeElapsed(0);
    setGameState('playing');
    setSelected(null);

    // Iniciar Cronómetro
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeElapsed(t => t + 1);
    }, 1000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleInput = (num) => {
    if (selected === null || gameState !== 'playing') return;
    const newCells = [...cells];
    const cell = newCells[selected];
    const settings = DIFFICULTY_SETTINGS[difficulty];

    if (cell.isFixed) return;

    if (cell.solution === num) {
      // LOGICA DE PUNTUACIÓN DE TU CÓDIGO SWIFT
      // score += 10 * difficulty.scoreMultiplier
      if (cell.value !== num) { // Solo sumar si no estaba ya puesto
          setScore(s => s + (10 * settings.multiplier));
      }
      
      cell.value = num;
      cell.isError = false;
      
      // Comprobar victoria
      if (newCells.every(c => c.value === c.solution)) {
        clearInterval(timerRef.current);
        
        // BONUS POR TIEMPO Y VICTORIA (Tu fórmula)
        // score + max(0, timeBase - timeElapsed) + (10 * winBonusBase)
        const timeBonus = Math.max(0, settings.timeBase - timeElapsed);
        const winBonus = 10 * settings.winBonus;
        const finalScore = score + (10 * settings.multiplier) + timeBonus + winBonus; // Sumamos también el punto del último movimiento
        
        setScore(finalScore);
        setGameState('won');
        saveScore(finalScore);
      }
    } else {
      setMistakes(m => m + 1);
      cell.isError = true;
      cell.value = num;
    }
    setCells(newCells);
  };

  const saveScore = async (finalScore) => {
    try {
      await axios.post(`${API_URL}/score`, {
        user_name: username,
        difficulty: difficulty,
        points: finalScore
      });
      fetchLeaderboard();
    } catch (e) { console.error(e); }
  };

  // --- VISTAS ---
  const renderMenu = () => (
    <div style={styles.menuContainer}>
      <h2 style={{color: theme.text, fontSize: '2rem'}}>Hola, {username} 👋</h2>
      <p style={{color: theme.textLight}}>¿Listo para superar tu récord?</p>
      
      <div style={styles.difficultyGrid}>
        {['Fácil', 'Medio', 'Difícil'].map(diff => (
          <button key={diff} style={styles.diffBtn} onClick={() => startGame(diff)}>
            <div style={{fontSize: '1.2rem', fontWeight: 'bold'}}>{diff}</div>
            <div style={{fontSize: '0.8rem', opacity: 0.8}}>x{DIFFICULTY_SETTINGS[diff].multiplier} Puntos</div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderGame = () => (
    <div style={styles.gameBoardContainer}>
      <div style={styles.gameHeader}>
        <div style={styles.statBox}>
           <span style={{fontWeight:'bold'}}>Tiempo</span>
           <span>{formatTime(timeElapsed)}</span>
        </div>
        <div style={styles.statBox}>
           <span style={{fontWeight:'bold'}}>Puntos</span>
           <span>{score}</span>
        </div>
        <div style={{...styles.statBox, color: mistakes >= 3 ? 'red' : theme.text}}>
           <span style={{fontWeight:'bold'}}>Fallos</span>
           <span>{mistakes}/3</span>
        </div>
      </div>

      <div style={styles.board}>
        {cells.map((cell, idx) => (
          <div
            key={cell.id}
            onClick={() => setSelected(idx)}
            style={{
              ...styles.cell,
              borderRight: (cell.col + 1) % 3 === 0 && cell.col !== 8 ? `2px solid ${theme.boardBorder}` : '1px solid #e0e0e0',
              borderBottom: (cell.row + 1) % 3 === 0 && cell.row !== 8 ? `2px solid ${theme.boardBorder}` : '1px solid #e0e0e0',
              backgroundColor: cell.isError ? theme.error : (selected === idx ? theme.selected : (cell.isFixed ? theme.fixedBg : theme.cellBg)),
              fontWeight: cell.isFixed ? 'bold' : 'normal',
              color: cell.isFixed ? theme.text : (cell.isError ? '#d32f2f' : theme.textLight)
            }}
          >
            {cell.value}
          </div>
        ))}
      </div>

      <div style={styles.numpad}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} style={styles.numBtn} onClick={() => handleInput(n)}>{n}</button>
        ))}
      </div>

      <button style={styles.backBtn} onClick={() => {clearInterval(timerRef.current); setGameState('menu')}}>Rendirse</button>
    </div>
  );

  const renderWon = () => (
    <div style={styles.menuContainer}>
      <h1 style={{fontSize: '3rem', margin: '10px 0'}}>¡Victoria! 🏆</h1>
      <div style={styles.scoreCard}>
         <div style={{fontSize: '0.9rem', color: theme.textLight}}>Puntuación Final</div>
         <div style={{fontSize: '2.5rem', fontWeight: 'bold', color: theme.text}}>{score}</div>
         <div style={{fontSize: '0.8rem', color: theme.success}}>¡Nuevo récord guardado!</div>
      </div>
      <button style={styles.diffBtn} onClick={() => setGameState('menu')}>Continuar</button>
    </div>
  );

  return (
    <div style={styles.mainLayout}>
      {/* SIDEBAR RANKING */}
      <div style={styles.sidebar}>
        <h3 style={{color: theme.text, borderBottom: `2px solid ${theme.accentDark}`, paddingBottom: '10px'}}>🏆 Top Jugadores</h3>
        <div style={styles.rankingList}>
          {leaderboard.map((score, i) => (
            <div key={score.id} style={styles.rankItem}>
              <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                 <span style={{fontWeight: 'bold', color: i<3 ? theme.accentDark : theme.textLight}}>#{i+1}</span>
                 <div style={{display:'flex', flexDirection:'column'}}>
                    <span style={{fontWeight: 'bold', fontSize:'0.9rem'}}>{score.user_name}</span>
                    <span style={{fontSize: '0.7rem', color: theme.textLight}}>{score.difficulty} • {score.date || 'Hoy'}</span>
                 </div>
              </div>
              <span style={{fontWeight: 'bold', color: theme.text}}>{score.points} pts</span>
            </div>
          ))}
        </div>
        
        <div style={{marginTop: 'auto'}}>
            <div style={styles.userInfo}>👤 {username}</div>
            <button style={styles.logoutBtn} onClick={onLogout}>Cerrar Sesión</button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={styles.contentArea}>
        {gameState === 'menu' && renderMenu()}
        {gameState === 'playing' && renderGame()}
        {gameState === 'won' && renderWon()}
      </div>
    </div>
  );
}

// --- ESTILOS ---
const styles = {
  mainLayout: { display: 'flex', width: '900px', height: '600px', backgroundColor: theme.cardBg, borderRadius: '25px', boxShadow: '0 10px 30px rgba(90, 74, 66, 0.1)', overflow: 'hidden', backdropFilter: 'blur(10px)' },
  
  sidebar: { width: '280px', backgroundColor: 'rgba(255,255,255,0.5)', padding: '20px', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.8)' },
  rankingList: { marginTop: '15px', overflowY: 'auto', flex: 1, paddingRight: '5px' },
  rankItem: { padding: '10px', backgroundColor: 'rgba(255,255,255,0.6)', marginBottom: '8px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { marginBottom: '10px', fontWeight: 'bold', color: theme.text },
  logoutBtn: { width: '100%', padding: '8px', border: 'none', backgroundColor: '#ef9a9a', color: 'white', borderRadius: '8px', cursor: 'pointer' },

  contentArea: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  
  menuContainer: { textAlign: 'center' },
  difficultyGrid: { display: 'flex', gap: '15px', marginTop: '20px' },
  diffBtn: { padding: '15px 20px', border: 'none', backgroundColor: theme.accent, color: theme.text, borderRadius: '15px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' },
  
  gameBoardContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  gameHeader: { display: 'flex', justifyContent: 'space-between', width: '400px', marginBottom: '15px' },
  statBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.5)', padding: '5px 15px', borderRadius: '10px', fontSize: '0.9rem', color: theme.text },
  
  board: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(9, 1fr)', 
    width: '400px', height: '400px', 
    border: `3px solid ${theme.boardBorder}`, 
    backgroundColor: theme.boardBorder,
    borderRadius: '4px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
  },
  cell: { display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', cursor: 'pointer', userSelect: 'none' },
  
  numpad: { display: 'flex', gap: '10px', marginTop: '20px' },
  numBtn: { width: '40px', height: '40px', borderRadius: '50%', border: 'none', backgroundColor: 'white', fontSize: '1.2rem', color: theme.text, cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
  backBtn: { marginTop: '20px', border: 'none', background: 'none', color: theme.textLight, cursor: 'pointer', textDecoration: 'underline' },
  
  scoreCard: { backgroundColor: 'white', padding: '20px', borderRadius: '20px', margin: '20px 0', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }
};