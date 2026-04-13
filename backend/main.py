"""
FireSight AI — FastAPI Backend
Spatio-temporal wildfire prediction with resource optimization.

Endpoints
─────────
GET  /                       health check
POST /predict                12-hour spread forecast
POST /predict/multi          multi-ignition spread forecast
POST /optimize               resource allocation optimization
POST /simulate               stateless simulate (same as predict)
POST /assistant              rule-based + AI copilot bridge
GET  /terrain                terrain metadata for current grid
WS   /ws/fire-data           real-time WebSocket stream
"""

import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from mock_model import MockFireModel

app = FastAPI(title="FireSight AI API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singleton model (terrain is generated once, spread is computed per request)
fire_model = MockFireModel()


# ── REQUEST / RESPONSE MODELS ──────────────────────────────────────────────────

class PredictRequest(BaseModel):
    ignition_x:   int   = Field(default=20, ge=0, lt=40)
    ignition_y:   int   = Field(default=20, ge=0, lt=40)
    wind_speed:   float = Field(default=35.0, ge=0, le=150)
    wind_dir:     float = Field(default=45.0, ge=0, le=360)
    hours:        int   = Field(default=12, ge=1, le=12)
    temperature:  float = Field(default=30.0)
    humidity:     float = Field(default=15.0, ge=0, le=100)
    base_lat:     float = 37.7749
    base_lng:     float = -122.4194


class MultiIgnitionRequest(BaseModel):
    ignitions:    List[Dict[str, int]]
    wind_speed:   float = 35.0
    wind_dir:     float = 45.0
    hours:        int   = 12
    temperature:  float = 30.0
    humidity:     float = 15.0

class OptimizeRequest(BaseModel):
    prediction_grid:     List[Dict[str, Any]]
    available_resources: Dict[str, int]


class AssistantRequest(BaseModel):
    message: str
    context: Dict[str, Any] = {}


class AssistantResponse(BaseModel):
    message:       str
    action:        Optional[str]     = None
    mapHighlight:  Optional[Dict[str, float]] = None
    metrics:       Optional[Dict[str, Any]]   = None


# ── ROUTES ────────────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {
        "message": "FireSight AI v2 — Rothermel spread model active.",
        "endpoints": ["/predict", "/predict/multi", "/optimize", "/simulate", "/assistant", "/terrain"],
    }


@app.get("/terrain")
def get_terrain():
    """Return fuel-type and elevation metadata for the active grid."""
    terrain = fire_model._terrain
    cells = []
    for y in range(fire_model.grid_size):
        for x in range(fire_model.grid_size):
            cells.append({
                "x": x, "y": y,
                "fuel_type": terrain["fuel"][y][x],
                "elevation_m": round(terrain["slope"][y][x]["elevation"], 1),
            })
    return {"grid_size": fire_model.grid_size, "cells": cells}


@app.post("/predict")
def predict(req: PredictRequest):
    grid = fire_model.predict_spread(
        ignition={"x": req.ignition_x, "y": req.ignition_y},
        wind_speed=req.wind_speed,
        wind_dir_deg=req.wind_dir,
        hours=req.hours,
        temperature=req.temperature,
        humidity=req.humidity,
        base_lat=req.base_lat,
        base_lng=req.base_lng
    )
    area   = sum(1 for c in grid if c["intensity"] > 0)
    hot    = sum(1 for c in grid if c["intensity"] > 0.7)
    structs = sum(1 for c in grid if c["intensity"] > 0.2 and c["fuel_type"] == 4)
    return {
        "grid": grid,
        "summary": {
            "hours_forecast": req.hours,
            "fire_area_cells": area,
            "hotspot_cells": hot,
            "structures_at_risk": structs,
        },
    }


@app.post("/predict/multi")
def predict_multi(req: MultiIgnitionRequest):
    """Spread model seeded with multiple simultaneous ignition points."""
    from mock_model import RothermelSpreadModel, apply_geo_coords
    spreader = RothermelSpreadModel(fire_model._terrain)
    grid = spreader.compute(
        ignitions=req.ignitions,
        wind_speed=req.wind_speed,
        wind_dir_deg=req.wind_dir,
        temperature=req.temperature,
        humidity=req.humidity,
        hours=req.hours,
    )
    grid = apply_geo_coords(grid)
    return {"grid": grid, "ignition_count": len(req.ignitions)}


@app.post("/optimize")
def optimize(req: OptimizeRequest):
    return fire_model.optimize_resources(req.prediction_grid, req.available_resources)


@app.post("/simulate")
def simulate(req: PredictRequest):
    grid = fire_model.predict_spread(
        ignition={"x": req.ignition_x, "y": req.ignition_y},
        wind_speed=req.wind_speed,
        wind_dir_deg=req.wind_dir,
        hours=req.hours,
        temperature=req.temperature,
        humidity=req.humidity,
        base_lat=req.base_lat,
        base_lng=req.base_lng
    )
    return {"status": "Simulation updated", "grid": grid}


@app.post("/assistant", response_model=AssistantResponse)
def assistant(req: AssistantRequest):
    msg        = req.message.lower()
    wind_speed = req.context.get("windSpeed", 35.0)
    wind_dir   = req.context.get("windDir", 45.0)
    temp       = req.context.get("temperature", 30.0)
    humidity   = req.context.get("humidity", 15.0)
    base_lat   = req.context.get("baseLat", 37.7749)
    base_lng   = req.context.get("baseLng", -122.4194)

    # Calculate basic risk logic dynamically
    risk_level = "CRITICAL" if wind_speed > 40 or temp > 35 else "HIGH" if wind_speed > 25 else "MODERATE"
    compass = _deg_to_compass(wind_dir)

    # 1. Prediction / Spread Analysis
    if "predict" in msg or "spread" in msg or "trajectory" in msg or "forecast" in msg or "where" in msg:
        grid = fire_model.predict_spread(
            ignition={"x": 20, "y": 20},
            wind_speed=wind_speed, wind_dir_deg=wind_dir,
            temperature=temp, humidity=humidity, hours=12,
            base_lat=base_lat, base_lng=base_lng
        )
        area   = sum(1 for c in grid if c["intensity"] > 0)
        hot    = sum(1 for c in grid if c["intensity"] > 0.7)
        structs = sum(1 for c in grid if c["intensity"] > 0.2 and c["fuel_type"] == 4)
        
        return AssistantResponse(
            message=(
                f"I've analyzed the 12-hour trajectory. With {temp}°C temperatures and {humidity}% humidity, "
                f"combined with {wind_speed} km/h winds from the {compass}, the spread represents a {risk_level} threat. "
                f"It is projected to cover {area * 0.25:.1f} km² with {hot} high-intensity hotspots, putting {structs} structures at risk. "
                f"Immediate aerial retardant is recommended on the leading edge."
            ),
            action="predict",
            metrics={"area_km2": area * 0.25, "hotspots": hot, "structures": structs},
            mapHighlight={"lat": base_lat + 0.02, "lng": base_lng + 0.02} # Highlight predicted leading edge
        )
        
    # 2. Resource Allocation
    elif "optim" in msg or "resource" in msg or "deploy" in msg or "allocat" in msg or "unit" in msg:
        grid = fire_model.predict_spread(
            ignition={"x": 20, "y": 20},
            wind_speed=wind_speed, wind_dir_deg=wind_dir,
            temperature=temp, humidity=humidity, hours=12,
            base_lat=base_lat, base_lng=base_lng
        )
        result = fire_model.optimize_resources(
            grid, {"air_tankers": 4, "fire_engines": 12, "ground_crews": 45, "helicopters": 3}
        )
        m = result["metrics"]
        return AssistantResponse(
            message=(
                f"Optimization protocol executed. Based on the {risk_level} risk, I've assigned {m['resources_deployed']} total units. "
                f"This deployment plan mitigates projected damage by {m['damage_reduction_pct']}%. "
                f"Priority focus is on the {m['structures_at_risk']} structures at risk. Dispatching air tankers along the {compass} perimeter."
            ),
            action="optimize",
            metrics=m,
            mapHighlight={"lat": base_lat, "lng": base_lng}
        )

    # 3. Hotspots / High Risk Zones
    elif any(k in msg for k in ["danger", "high risk", "hotspot", "critical", "zone"]):
        return AssistantResponse(
            message=(
                f"Detecting extreme risk zones downstream from ignition. Heavy fuel buildup combined with {wind_speed} km/h "
                f"winds from the {compass} dictates a high ROS. High-priority target highlighted on the map."
            ),
            action="highlight",
            mapHighlight={"lat": base_lat + 0.015, "lng": base_lng + 0.015}
        )

    # 4. Evacuation
    elif "evacuat" in msg or "escape" in msg or "route" in msg:
        opp_compass = _deg_to_compass(wind_dir + 180)
        return AssistantResponse(
            message=(
                f"Evacuation corridors mapped. With wind pushing from the {compass}, the safest routes are towards the {opp_compass} "
                "or perpendicular to the spread axis. Recommending reverse-911 for all structure zones within the 6-hour burn perimeter."
            ),
            action=None,
        )

    # Fallback Catch-all
    else:
        return AssistantResponse(
            message=(
                f"I am processing current variables (Wind: {wind_speed}km/h {compass}, Temp: {temp}°C, Humidity: {humidity}%). "
                "You can ask me to 'predict spread', 'optimize resources', 'find hotspots', or determine 'evacuation routes'."
            ),
            action=None,
        )


def _deg_to_compass(deg: float) -> str:
    dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"]
    return dirs[round(deg / 22.5) % 16]


# ── WEBSOCKET ─────────────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, msg: str):
        for ws in self.active:
            await ws.send_text(msg)


manager = ConnectionManager()

@app.websocket("/ws/fire-data")
async def websocket_endpoint(websocket: WebSocket, lat: float = 37.7749, lng: float = -122.4194):
    await manager.connect(websocket)
    # Give initial defaults
    params = {
        "wind_speed": 35.0,
        "wind_dir_deg": 45.0,
        "temperature": 30.0,
        "humidity": 15.0
    }
    
    # Task to listen for updates from client
    async def listen_for_params():
        try:
            while True:
                data = await websocket.receive_text()
                new_params = json.loads(data)
                params.update(new_params)
        except WebSocketDisconnect:
            pass

    listener_task = asyncio.create_task(listen_for_params())

    try:
        hour = 1
        while True:
            grid = fire_model.predict_spread(
                ignition={"x": 20, "y": 20},
                wind_speed=params["wind_speed"], 
                wind_dir_deg=params["wind_dir_deg"],
                temperature=params["temperature"], 
                humidity=params["humidity"],
                hours=hour,
                base_lat=lat,
                base_lng=lng
            )
            area   = sum(1 for c in grid if c["intensity"] > 0)
            hot    = sum(1 for c in grid if c["intensity"] > 0.7)
            structs = sum(1 for c in grid if c["intensity"] > 0.2 and c["fuel_type"] == 4)

            await websocket.send_text(json.dumps({
                "hour": hour,
                "grid": grid,
                "summary": {"fire_area_cells": area, "hotspot_cells": hot, "structures_at_risk": structs},
            }))

            hour = (hour % 12) + 1
            await asyncio.sleep(1.5)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        listener_task.cancel()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)