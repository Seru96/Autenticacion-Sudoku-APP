from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext
from typing import Optional, List
from datetime import datetime
import models
from database import engine, SessionLocal

# Crear tablas en la BD
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Movilidad")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependencia de BD
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Seguridad (Hashing)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# --- ESQUEMAS PYDANTIC ---
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: str
    password: str
    remember_me: bool = False  # <-- Nuevo campo opcional

class ForgotPassword(BaseModel):
    email: str

class ScoreCreate(BaseModel):
    user_name: str
    difficulty: str
    points: int

# --- ENDPOINTS ---

@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    hashed_password = pwd_context.hash(user.password)
    new_user = models.User(
        email=user.email, 
        hashed_password=hashed_password, 
        full_name=user.full_name
    )
    db.add(new_user)
    db.commit()
    return {"message": "Usuario creado correctamente"}

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Credenciales incorrectas")
    
    # En una app real, aquí configurarías la expiración del token según user.remember_me
    return {"access_token": f"token-{db_user.email}", "token_type": "bearer"}

@app.post("/forgot-password")
def forgot_password(data: ForgotPassword):
    # Simulación de envío de correo
    # Aquí conectarías con un servicio SMTP real (SendGrid, Gmail, etc.)
    return {"message": f"Se ha enviado un correo de recuperación a {data.email}"}

@app.post("/score")
def save_score(score: ScoreCreate, db: Session = Depends(get_db)):
    now = datetime.now().strftime("%d/%m %H:%M")
    new_score = models.Score(
        user_name=score.user_name, 
        difficulty=score.difficulty, 
        points=score.points,
        date=now
    )
    db.add(new_score)
    db.commit()
    return {"msg": "Puntuación guardada"}

@app.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    return db.query(models.Score).order_by(models.Score.points.desc()).limit(15).all()