import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from mock_model import MockFireModel
from typing import Dict, Any

app = FastAPI(title="FireSight AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

fire_model = MockFireModel()

class PredictRequest(BaseModel):
    ignition_x: int = 10
    ignition_y: int = 10
    wind_speed: float = 20.0
    wind_dir: float = 45.0
    hours: int = 12

class OptimizeRequest(BaseModel):
    prediction_grid: list
    available_resources: Dict[str, int]

class AssistantRequest(BaseModel):
    message: str
    context: Dict[str, Any] = {}

class AssistantResponse(BaseModel):
    message: str
    action: str = None
    mapHighlight: Dict[str, float] = None

@app.get("/")
def read_root():
    return {"message": "FireSight AI Backend is running."}

@app.post("/predict")
def predict(req: PredictRequest):
    grid = fire_model.predict_spread(
        ignition={"x": req.ignition_x, "y": req.ignition_y},
        wind_speed=req.wind_speed,
        wind_dir_deg=req.wind_dir,
        hours=req.hours
    )
    return {"grid": grid}

@app.post("/optimize")
def optimize(req: OptimizeRequest):
    result = fire_model.optimize_resources(req.prediction_grid, req.available_resources)
    return result

@app.post("/simulate")
def simulate(req: PredictRequest):
    # For a stateless API, simulate is similar to predict but could update internal simulation state
    grid = fire_model.predict_spread(
        ignition={"x": req.ignition_x, "y": req.ignition_y},
        wind_speed=req.wind_speed,
        wind_dir_deg=req.wind_dir,
        hours=req.hours
    )
    return {"status": "Simulation updated", "grid": grid}

@app.post("/assistant", response_model=AssistantResponse)
def assistant(req: AssistantRequest):
    msg = req.message.lower()
    wind_speed = req.context.get("windSpeed", 20)
    wind_dir = req.context.get("windDir", 45)
    
    if "predict" in msg or "spread" in msg:
        return AssistantResponse(
            message=f"I am executing the predictive spread engine. Given current telemetry parameters (wind: {wind_speed}km/h at {wind_dir}°), the fire is likely to expand rapidly downwind.",
            action="predict"
        )
    elif "optimize" in msg or "resources" in msg:
        return AssistantResponse(
            message="Calculating optimal strategic distribution. I recommend maximizing aerial assault on the advancing perimeter while deploying ground crews to protect critical infrastructure assets.",
            action="optimize"
        )
    elif "high risk" in msg or "danger" in msg or "zones" in msg:
        return AssistantResponse(
            message="Focusing on Zone Alpha. Structural layout and dry vegetation density make this region critically volatile today.",
            action="highlight",
            mapHighlight={"lat": 37.7749, "lng": -122.4194}
        )
    else:
        return AssistantResponse(
            message="System is online. You can command me to 'predict fire spread', 'optimize resources', or 'show high-risk zones'.",
            action=None
        )

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/fire-data")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        hour = 1
        while True:
            # Simulate progression over time
            grid = fire_model.predict_spread(
                ignition={"x": 10, "y": 10},
                wind_speed=25.0,
                wind_dir_deg=90.0,
                hours=hour
            )
            # Send the grid update
            await websocket.send_text(json.dumps({"hour": hour, "grid": grid}))
            
            hour += 1
            if hour > 12:
                hour = 1 # loop simulation
                
            await asyncio.sleep(2) # send update every 2 seconds
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
