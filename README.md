
# FeelWise 🎭  
AI-powered Emotional Awareness & Journaling System  

## 📌 Overview  
FeelWise is a multi-modal emotional analysis and journaling system combining:  
- **Text Analysis** 📝  
- **Face Analysis** 😀  
- **Speech Analysis** 🎤  
- **Journal Module** 📓  

The system uses **FastAPI (Python)** for APIs, **Node.js** for the main server, and integrates with **MongoDB** for data storage.  

---

## ⚙️ System Requirements  
- **Python Versions**  
  - Face Analysis → **Python 3.10**  
  - Other APIs (Text, Speech, Journal) → **Python 3.12 or above**  
- **Node.js** (for main server, port 5000)  
- **MongoDB** (database)  

---

## 🚀 Installation & Setup  

### 1️⃣ Clone the Repository  
```bash
git clone https://github.com/your-username/feelwise.git
cd feelwise
```

---

### 2️⃣ Virtual Environments  

#### For **Python 3.12 (Text, Speech, Journal APIs)**  
```bash
C:\Users\Shary\AppData\Local\Programs\Python\Python312\python.exe -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

#### For **Python 3.10 (Face Analysis API)**  
```bash
C:\Python310\python.exe -m venv venv310
venv310\Scripts\activate
pip install -r requirements-of-face.txt
```

---

### 3️⃣ Running FastAPI Services  

Each API should be run in a **separate terminal**:

```bash
# 1. Text Analysis API
uvicorn text-analysis-api:app --reload --port 8001

# 2. Face Analysis API
uvicorn face-analysis-api:app --reload --port 8002

# 3. Speech Analysis API
uvicorn speech_analysis_fastapi:app --reload --port 8000

# 4. Journal API
uvicorn journal_api:app --reload --port 8004
```

---

### 4️⃣ Running Main Server  

The **Node.js main server** runs on **port 5000**:  

```bash
npm install
npm start
```

---

### 5️⃣ Special Notes ⚠️  

- **Speech Analysis API** may cause issues on a live server.  
  As a workaround, serve it using:  
  ```bash
  python -m http.server 5501
  ```
  Then access it on **port 5501**.  

- Ensure each API is running in its own environment with correct Python versions.  

---

## 📂 Example `.env` Configuration  

Create a `.env` file in the **project root** with the following variables:  

```env
# =======================
# MongoDB Configuration
# =======================
MONGO_URI=mongodb://localhost:27017/feelwise
MONGO_DB=feelwise

# =======================
# API Service Ports
# =======================
TEXT_API_PORT=8001
FACE_API_PORT=8002
SPEECH_API_PORT=8000
JOURNAL_API_PORT=8004

# =======================
# Node.js Main Server
# =======================
MAIN_SERVER_PORT=5000

# =======================
# JWT Authentication (Optional)
# =======================
JWT_SECRET=your_secret_key
JWT_ALGORITHM=HS256
```

---

## 📊 Module Summary  

- **Text Analysis API** → Analyzes sentiment, tone, and meaning of written input.  
- **Face Analysis API** → Uses facial recognition for emotion detection.  
- **Speech Analysis API** → Analyzes voice tone and pitch for emotional states.  
- **Journal API** → Supports text & voice journaling, mood tracking, and AI analysis.  
- **Main Server** → Integrates all APIs, manages user interaction, and connects frontend with backend.  

---

## 💡 Future Work  
- Improve speech-analysis deployment for production.  
- Add dashboards with mood-tracking charts.  
- Expand journaling with AI insights & recommendations.  

---

## 🛠️ Tech Stack  
- **Backend:** FastAPI (Python 3.10 / 3.12), Node.js  
- **Frontend:** HTML, CSS, JS  
- **Database:** MongoDB  
- **Deployment:** Uvicorn, NPM  
