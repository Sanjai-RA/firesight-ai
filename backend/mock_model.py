import math
import random
from typing import List, Dict, Any

class MockFireModel:
    def __init__(self, grid_size: int = 20):
        self.grid_size = grid_size
        
        # We'll use a coordinate system around San Francisco for visual interest
        self.base_lat = 37.7749
        self.base_lng = -122.4194
        self.lat_step = 0.01
        self.lng_step = 0.01

    def generate_grid_coords(self) -> List[Dict[str, float]]:
        coords = []
        for x in range(self.grid_size):
            for y in range(self.grid_size):
                lat = self.base_lat + (y - self.grid_size/2) * self.lat_step
                lng = self.base_lng + (x - self.grid_size/2) * self.lng_step
                coords.append({"x": x, "y": y, "lat": lat, "lng": lng, "intensity": 0.0})
        return coords

    def predict_spread(self, ignition: Dict[str, float], wind_speed: float, wind_dir_deg: float, hours: int = 12) -> List[Dict[str, Any]]:
        # A simple directional cellular automata or gaussian mock
        # Convert wind dir to radians
        wind_dir_rad = math.radians(wind_dir_deg)
        wind_vx = math.cos(wind_dir_rad)
        wind_vy = math.sin(wind_dir_rad)
        
        grid = self.generate_grid_coords()
        
        # Use ignition as x,y indices (0 to grid_size-1)
        ign_x = ignition.get("x", self.grid_size // 2)
        ign_y = ignition.get("y", self.grid_size // 2)
        
        for p in grid:
            dx = p["x"] - ign_x
            dy = p["y"] - ign_y
            distance = math.sqrt(dx**2 + dy**2)
            
            # Wind influence (dot product)
            # Normalize vector to point
            if distance > 0:
                dir_x = dx / distance
                dir_y = dy / distance
                wind_factor = (dir_x * wind_vx + dir_y * wind_vy)
            else:
                wind_factor = 1.0
                
            # Base spread probability based on distance and wind
            # Wind speed stretches the spread in wind direction
            effective_dist = distance * (1.0 - 0.5 * wind_factor * (wind_speed / 100.0))
            
            # Predict intensity based on hours (spreads outward over time)
            if effective_dist < (hours * 0.5):
                # Inner area is burnt/high intensity
                intensity = max(0.0, 1.0 - (effective_dist / (hours * 0.5)))
                # Add some randomness
                intensity *= random.uniform(0.7, 1.0)
                p["intensity"] = intensity
            else:
                p["intensity"] = 0.0
                
        return grid

    def optimize_resources(self, prediction_grid: List[Dict[str, Any]], available_resources: Dict[str, int]) -> Dict[str, Any]:
        """
        Allocate resources greedily to highest intensity spots.
        """
        sorted_grid = sorted(prediction_grid, key=lambda p: p["intensity"], reverse=True)
        high_risk_spots = [p for p in sorted_grid if p["intensity"] > 0.5]
        
        allocations = []
        resources_left = {k: v for k, v in available_resources.items()}
        
        for item in high_risk_spots:
            allocated = False
            for r_type, count in resources_left.items():
                if count > 0:
                    allocations.append({
                        "type": r_type,
                        "lat": item["lat"],
                        "lng": item["lng"],
                        "target_intensity": item["intensity"]
                    })
                    resources_left[r_type] -= 1
                    allocated = True
                    break
            if sum(resources_left.values()) == 0:
                break
                
        # Calculate reduction in damage
        initial_risk = sum(p["intensity"] for p in high_risk_spots)
        mitigated_risk = sum(a["target_intensity"] * 0.8 for a in allocations) # assume 80% effectiveness
        
        return {
            "allocations": allocations,
            "metrics": {
                "initial_risk_score": round(initial_risk, 2),
                "mitigated_risk_score": round(initial_risk - mitigated_risk, 2),
                "optimization_efficiency": round((mitigated_risk / initial_risk) * 100 if initial_risk > 0 else 0, 1)
            }
        }
