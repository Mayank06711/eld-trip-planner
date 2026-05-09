import os
import requests


class RoutingService:
    """Wrapper around OpenRouteService directions API."""

    HGV_URL = "https://api.openrouteservice.org/v2/directions/driving-hgv"
    CAR_URL = "https://api.openrouteservice.org/v2/directions/driving-car"

    def __init__(self):
        self.api_key = os.getenv('ORS_API_KEY', '')

    def get_route(self, start, end):
        """
        Get driving route. Tries HGV profile first, falls back to car.
        Returns dict with distance_miles, duration_hours, geometry, start, end.
        """
        # Try HGV first (truck-specific routing)
        result = self._fetch_route(self.HGV_URL, start, end)
        if result:
            return result

        # Fallback to car profile (wider coverage)
        return self._fetch_route(self.CAR_URL, start, end)

    def _fetch_route(self, url, start, end):
        try:
            resp = requests.post(
                url,
                json={
                    'coordinates': [
                        [start['lng'], start['lat']],
                        [end['lng'], end['lat']],
                    ],
                },
                headers={
                    'Authorization': self.api_key,
                    'Content-Type': 'application/json',
                },
                timeout=20,
            )
            resp.raise_for_status()
            data = resp.json()

            routes = data.get('routes', [])
            if not routes:
                return None

            route = routes[0]
            summary = route.get('summary', {})

            distance_miles = summary.get('distance', 0) / 1609.34
            duration_hours = summary.get('duration', 0) / 3600.0

            geometry_encoded = route.get('geometry', '')
            geometry = self._decode_polyline(geometry_encoded)

            return {
                'start': start,
                'end': end,
                'distance_miles': distance_miles,
                'duration_hours': duration_hours,
                'geometry': geometry,
            }

        except requests.RequestException as e:
            # Log for debugging but return None to try fallback
            return None

    def _decode_polyline(self, encoded):
        """Decode Google-style encoded polyline to [[lat, lng], ...] for Leaflet."""
        decoded = []
        i = 0
        lat = 0
        lng = 0

        while i < len(encoded):
            shift = 0
            result = 0
            while True:
                b = ord(encoded[i]) - 63
                i += 1
                result |= (b & 0x1F) << shift
                shift += 5
                if b < 0x20:
                    break
            lat += (~(result >> 1) if result & 1 else result >> 1)

            shift = 0
            result = 0
            while True:
                b = ord(encoded[i]) - 63
                i += 1
                result |= (b & 0x1F) << shift
                shift += 5
                if b < 0x20:
                    break
            lng += (~(result >> 1) if result & 1 else result >> 1)

            decoded.append([lat / 1e5, lng / 1e5])

        return decoded
