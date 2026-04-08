# FireSight AI

FireSight AI is an advanced predictive wildfire intelligence platform equipped with real-time 3D geospatial telemetry, resource optimization logic, and an embedded FireSight Copilot AI assistant framework.

## Project Architecture

This is a full-stack project utilizing:
*   **Frontend**: React (Vite), Three.js (`@react-three/fiber`), Mapbox GL JS, Tailwind CSS, Framer Motion. 
*   **Backend**: Python FastAPI with WebSocket streaming.

## Setup Instructions

### 1. Environment Configurations
In your `frontend` directory, copy the `.env.example` into a `.env` file. You must supply a valid Mapbox API Token for geospatial rendering:
```env
VITE_MAPBOX_TOKEN=your_real_mapbox_token
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws/fire-data
```

### 2. Booting the Intelligence Backend
The backend runs the API endpoints and streams simulated fire trajectories over WebSocket.
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Running the Visualization Frontend
Run the Vite development server in a separate terminal.
```bash
cd frontend
npm install
npm run dev
```

Visit the `localhost` URL provided by Vite.

---

### Features Highlights
- **3D Globe Boot Sequence**: Immersive startup environment using Three.js particles.
- **FireSight Copilot**: Conversational AI (Voice + Text) embedded into the layout routing system intents.
- **Live WebSocket Data**: Dynamic representation of fire hotspots natively painted through Mapbox heatmap overlays.
- **Resource Modeler**: Visual allocation routines for Tankers, Trucks, and Crew. 
