"""
FireSight AI — Spatio-Temporal Wildfire Spread Model
Implements a Rothermel-inspired cellular automaton with:
  - Wind vector field influence
  - Topographic slope acceleration
  - Fuel-type loading (grass / shrub / forest / structure)
  - Environmental modifiers (temperature, humidity)
  - Greedy + priority-score resource optimization
"""

import math
import random
import heapq
from typing import List, Dict, Any, Tuple


<<<<<<< HEAD
# ── CONSTANTS ──────────────────────────────────────────────────────────────────
GRID_SIZE       = 40          # cells
A_FACTOR        = 0.0165      # base Rothermel spread constant
WIND_COEFF      = 0.012       # wind speed → spread multiplier
SLOPE_COEFF     = 0.008       # slope rise/run → spread multiplier

FUEL_TYPES = {
    0: {"name": "Non-burnable",  "load": 0.0,  "moisture_ext": 0.30},
    1: {"name": "Grass",         "load": 0.40, "moisture_ext": 0.15},
    2: {"name": "Shrub",         "load": 0.70, "moisture_ext": 0.25},
    3: {"name": "Timber",        "load": 1.00, "moisture_ext": 0.30},
    4: {"name": "Structure",     "load": 1.30, "moisture_ext": 0.10},
}

RESOURCE_EFFECTIVENESS = {
    "air_tankers":   0.85,
    "helicopters":   0.75,
    "fire_engines":  0.60,
    "ground_crews":  0.45,
}

DIRECTIONS_8 = [
    (1, 0), (-1, 0), (0, 1), (0, -1),
    (1, 1), (-1, 1), (1, -1), (-1, -1),
]


# ── TERRAIN GENERATOR ──────────────────────────────────────────────────────────
def _noise(x: float, y: float, seed: int = 0) -> float:
    v = math.sin(x * 37.3 + y * 59.1 + seed) * 10000
    return v - math.floor(v)


def generate_terrain(seed: int = 42) -> Dict[str, Any]:
    """Generate elevation, slope, and fuel maps using deterministic noise."""
    elev = []
    for y in range(GRID_SIZE):
        row = []
        for x in range(GRID_SIZE):
            e = (
                _noise(x, y, seed) * 0.50
                + _noise(x * 0.5, y * 0.5, seed + 1) * 0.30
                + _noise(x * 0.25, y * 0.25, seed + 2) * 0.20
            )
            row.append(e)
        elev.append(row)

    slope = []
    for y in range(GRID_SIZE):
        row = []
        for x in range(GRID_SIZE):
            sx = elev[y][x + 1] - elev[y][x] if x < GRID_SIZE - 1 else 0.0
            sy = elev[y + 1][x] - elev[y][x] if y < GRID_SIZE - 1 else 0.0
            row.append({"sx": sx * 10, "sy": sy * 10, "elevation": elev[y][x] * 800})
        slope.append(row)

    rng = random.Random(seed)
    fuel = []
    for y in range(GRID_SIZE):
        row = []
        for x in range(GRID_SIZE):
            e = elev[y][x]
            r = rng.random()
            if e < 0.15:
                row.append(0)   # water / bare rock
            elif e > 0.80:
                row.append(1)   # rocky alpine → light grass
            elif r > 0.88:
                row.append(4)   # structure
            elif r > 0.70:
                row.append(3)   # heavy timber
            elif r > 0.40:
                row.append(2)   # shrub
            elif r > 0.40:
                row.append(2)   # shrub
            else:
                row.append(1)   # grass
        fuel.append(row)

    return {"slope": slope, "fuel": fuel, "elevation": elev}


# ── ROTHERMEL SPREAD ENGINE ────────────────────────────────────────────────────
class RothermelSpreadModel:
    """
    Dijkstra-based fire spread using Rothermel-style rate-of-spread per cell edge.
    """

    def __init__(self, terrain: Dict[str, Any]):
        self.terrain = terrain

    def _edge_ros(
        self,
        src_x: int, src_y: int,
        dst_x: int, dst_y: int,
        wind_vx: float, wind_vy: float,
        wind_speed: float,
        env_mod: float,
    ) -> float:
        """Return Rate of Spread (cells/step) along one edge."""
        fuel_code = self.terrain["fuel"][dst_y][dst_x]
        if fuel_code == 0:
            return 0.0   # non-burnable

        cell = self.terrain["slope"][src_y][src_x]
        fuel_mod = FUEL_TYPES[fuel_code]["load"]

        dx, dy = dst_x - src_x, dst_y - src_y

        # Wind alignment (cosine similarity)
        if wind_speed > 0:
            wind_dot = dx * wind_vx + dy * wind_vy
            wind_mod = 1.0 + WIND_COEFF * wind_speed * (wind_dot * 0.5 + 0.5)
        else:
            wind_mod = 1.0

        # Slope effect (uphill acceleration)
        slope_dot = dx * cell["sx"] + dy * cell["sy"]
        slope_mod = 1.0 + SLOPE_COEFF * max(0.0, slope_dot)

        # Diagonal cells are √2 farther
        diag_factor = 1.0 / math.sqrt(2) if abs(dx) + abs(dy) > 1 else 1.0

        ros = A_FACTOR * wind_mod * slope_mod * fuel_mod * env_mod * diag_factor
        return max(ros, 1e-6)

    def compute(
        self,
        ignitions: List[Dict[str, int]],
        wind_speed: float,
        wind_dir_deg: float,
        temperature: float,
        humidity: float,
        hours: int,
    ) -> List[Dict[str, Any]]:
        wind_rad = math.radians(wind_dir_deg)
        wind_vx  = math.cos(wind_rad)
        wind_vy  = math.sin(wind_rad)

        temp_factor  = 1.0 + (temperature - 20) * 0.015
        humid_factor = max(0.1, 1.0 - humidity * 0.008)
        env_mod      = temp_factor * humid_factor

        steps = hours * 3   # sub-hour resolution

        INF = float("inf")
        burn_time = [[INF] * GRID_SIZE for _ in range(GRID_SIZE)]

        pq: List[Tuple[float, int, int]] = []
        for ig in ignitions:
            ix, iy = ig.get("x", GRID_SIZE // 2), ig.get("y", GRID_SIZE // 2)
            if 0 <= ix < GRID_SIZE and 0 <= iy < GRID_SIZE:
                burn_time[iy][ix] = 0.0
                heapq.heappush(pq, (0.0, ix, iy))

        while pq:
            t, x, y = heapq.heappop(pq)
            if t > burn_time[y][x]:
                continue   # stale entry

            for dx, dy in DIRECTIONS_8:
                nx, ny = x + dx, y + dy
                if not (0 <= nx < GRID_SIZE and 0 <= ny < GRID_SIZE):
                    continue

                ros = self._edge_ros(x, y, nx, ny, wind_vx, wind_vy, wind_speed, env_mod)
                if ros <= 0:
                    continue

                arrival = t + 1.0 / ros
                if arrival < steps and arrival < burn_time[ny][nx]:
                    burn_time[ny][nx] = arrival
                    heapq.heappush(pq, (arrival, nx, ny))

        # Build output grid
        result = []
        for y in range(GRID_SIZE):
            for x in range(GRID_SIZE):
                bt = burn_time[y][x]
                fuel_code = self.terrain["fuel"][y][x]
                if bt == INF or bt >= steps:
                    intensity = 0.0
                else:
                    age = steps - bt
                    fuel_mod = FUEL_TYPES[fuel_code]["load"]
                    raw = max(0.0, 1.0 - age / (steps * 0.5)) * fuel_mod
                    intensity = min(1.0, raw + (0.3 if bt < 2 else 0.0))

                cell = self.terrain["slope"][y][x]
                result.append({
                    "x": x,
                    "y": y,
                    "lat": 0.0,   # replaced by coordinate mapper in production
                    "lng": 0.0,
                    "intensity": round(intensity, 4),
                    "fuel_type": fuel_code,
                    "fuel_name": FUEL_TYPES[fuel_code]["name"],
                    "elevation_m": round(cell["elevation"], 1),
                    "burn_time_step": None if bt == INF else round(bt, 2),
                })
        return result


# ── COORDINATE MAPPER ──────────────────────────────────────────────────────────
def apply_geo_coords(
    grid: List[Dict[str, Any]],
    base_lat: float = 37.7749,
    base_lng: float = -122.4194,
    lat_step: float = 0.01,
    lng_step: float = 0.01,
) -> List[Dict[str, Any]]:
    mid = GRID_SIZE // 2
    for cell in grid:
        cell["lat"] = round(base_lat + (cell["y"] - mid) * lat_step, 6)
        cell["lng"] = round(base_lng + (cell["x"] - mid) * lng_step, 6)
    return grid


# ── RESOURCE OPTIMIZER ─────────────────────────────────────────────────────────
class ResourceOptimizer:
    """
    Priority-score greedy allocation with per-resource-type effectiveness.
    Score = intensity × fuel_load_factor
    Structure cells receive 2× priority weight.
    """

    def optimize(
        self,
        grid: List[Dict[str, Any]],
        available_resources: Dict[str, int],
    ) -> Dict[str, Any]:
        # Score cells
        scored = []
        for cell in grid:
            if cell["intensity"] <= 0.1:
                continue
            fuel_factor = FUEL_TYPES.get(cell.get("fuel_type", 1), {}).get("load", 0.5)
            struct_bonus = 2.0 if cell.get("fuel_type") == 4 else 1.0
            score = cell["intensity"] * fuel_factor * struct_bonus
            scored.append({**cell, "priority_score": round(score, 4)})

        scored.sort(key=lambda c: c["priority_score"], reverse=True)

        # Greedy allocation: highest-effectiveness resource type first
        sorted_res = sorted(available_resources.items(), key=lambda kv: RESOURCE_EFFECTIVENESS.get(kv[0], 0.5), reverse=True)
        res_left = {k: v for k, v in sorted_res}
        total_left = sum(res_left.values())

        allocations = []
        initial_risk = sum(c["priority_score"] for c in scored)

        for i, cell in enumerate(scored):
            if total_left <= 0:
                break
            for r_type, _ in sorted_res:
                if res_left.get(r_type, 0) <= 0:
                    continue
                eff = RESOURCE_EFFECTIVENESS.get(r_type, 0.5)
                allocations.append({
                    "priority": i + 1,
                    "type": r_type,
                    "x": cell["x"],
                    "y": cell["y"],
                    "lat": cell["lat"],
                    "lng": cell["lng"],
                    "target_intensity": cell["intensity"],
                    "priority_score": cell["priority_score"],
                    "effectiveness": eff,
                    "fuel_type": cell.get("fuel_type"),
                })
                res_left[r_type] -= 1
                total_left -= 1
                break

        mitigated = sum(a["priority_score"] * a["effectiveness"] for a in allocations)
        struct_at_risk = sum(1 for c in scored if c.get("fuel_type") == 4)

        return {
            "allocations": allocations,
            "metrics": {
                "initial_risk_score":    round(initial_risk, 2),
                "mitigated_risk_score":  round(initial_risk - mitigated, 2),
                "damage_reduction_pct":  round(min(99.0, (mitigated / initial_risk) * 100) if initial_risk > 0 else 0, 1),
                "structures_at_risk":    struct_at_risk,
                "lives_at_risk_est":     round(struct_at_risk * 3.2),
                "resources_deployed":    len(allocations),
            },
        }


# ── MOCK FIRE MODEL (API façade) ───────────────────────────────────────────────
class MockFireModel:
    """
    Backward-compatible façade used by main.py.
    Internally uses the Rothermel spread model and Dijkstra solver.
    """

    def __init__(self, grid_size: int = GRID_SIZE):
        self.grid_size = grid_size
        self.base_lat  = 37.7749
        self.base_lng  = -122.4194
        self.lat_step  = 0.01
        self.lng_step  = 0.01
        self._terrain  = generate_terrain(seed=42)
        self._spreader = RothermelSpreadModel(self._terrain)
        self._optimizer = ResourceOptimizer()

    def predict_spread(
        self,
        ignition: Dict[str, float],
        wind_speed: float,
        wind_dir_deg: float,
        hours: int = 12,
        temperature: float = 30.0,
        humidity: float = 15.0,
        base_lat: float = 37.7749,
        base_lng: float = -122.4194,
    ) -> List[Dict[str, Any]]:
        grid = self._spreader.compute(
            ignitions=[ignition],
            wind_speed=wind_speed,
            wind_dir_deg=wind_dir_deg,
            temperature=temperature,
            humidity=humidity,
            hours=hours,
        )
        return apply_geo_coords(grid, base_lat, base_lng, self.lat_step, self.lng_step)

    def optimize_resources(
        self,
        prediction_grid: List[Dict[str, Any]],
        available_resources: Dict[str, int],
    ) -> Dict[str, Any]:
        return self._optimizer.optimize(prediction_grid, available_resources)