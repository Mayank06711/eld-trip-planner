import os
import re
import requests

# Layers for city search (excludes states/countries)
CITY_LAYERS = 'locality,localadmin,neighbourhood'
# Layers when input looks like a ZIP code
ZIP_LAYERS = 'postalcode,locality'


def _is_zip(text):
    """Check if input looks like a US ZIP code (3-5 digits)."""
    return bool(re.match(r'^\d{3,5}$', text.strip()))


class GeocodingService:
    """OpenRouteService geocoding — supports city names AND ZIP codes."""

    AUTOCOMPLETE_URL = "https://api.openrouteservice.org/geocode/autocomplete"
    SEARCH_URL = "https://api.openrouteservice.org/geocode/search"
    STRUCTURED_URL = "https://api.openrouteservice.org/geocode/search/structured"
    SNAP_URL = "https://api.openrouteservice.org/v2/snap/driving-hgv"

    def __init__(self):
        self.api_key = os.getenv('ORS_API_KEY', '')

    def search(self, query, limit=6):
        """
        Autocomplete for the location input.
        Dynamically picks layers based on input type:
          - ZIP code input → postalcode + locality
          - City/text input → locality + localadmin
        """
        trimmed = query.strip()
        if len(trimmed) < 2:
            return []

        # Pick layers based on input type
        layers = ZIP_LAYERS if _is_zip(trimmed) else CITY_LAYERS

        # For full 5-digit ZIP, use structured search (more accurate)
        if re.match(r'^\d{5}$', trimmed):
            results = self._structured_zip_search(trimmed)
            if results:
                return results

        # Standard autocomplete
        try:
            resp = requests.get(
                self.AUTOCOMPLETE_URL,
                params={
                    'api_key': self.api_key,
                    'text': trimmed,
                    'boundary.country': 'US',
                    'layers': layers,
                    'size': limit,
                },
                timeout=10,
            )
            resp.raise_for_status()
            return self._extract_results(resp.json())
        except requests.RequestException:
            return []

    def _structured_zip_search(self, zipcode):
        """Use ORS structured search for pure ZIP codes — most reliable."""
        try:
            resp = requests.get(
                self.STRUCTURED_URL,
                params={
                    'api_key': self.api_key,
                    'postalcode': zipcode,
                    'country': 'US',
                },
                timeout=10,
            )
            resp.raise_for_status()
            return self._extract_results(resp.json())
        except requests.RequestException:
            return []

    def snap_to_road(self, lat, lng, radius=5000):
        """Snap coordinates to the nearest truck-routable road."""
        try:
            resp = requests.post(
                self.SNAP_URL,
                json={
                    'locations': [[lng, lat]],
                    'radius': radius,
                },
                headers={
                    'Authorization': self.api_key,
                    'Content-Type': 'application/json',
                },
                timeout=10,
            )
            resp.raise_for_status()
            locations = resp.json().get('locations', [])
            if locations and locations[0]:
                snapped = locations[0].get('location', [])
                if len(snapped) == 2:
                    return {'lat': snapped[1], 'lng': snapped[0]}
        except requests.RequestException:
            pass
        return {'lat': lat, 'lng': lng}

    def _extract_results(self, data):
        results = []
        seen = set()
        for feature in data.get('features', []):
            props = feature.get('properties', {})
            coords = feature.get('geometry', {}).get('coordinates', [])
            layer = props.get('layer', '')

            # Reject state/country level results
            if layer in ('region', 'country', 'macroregion', 'macrocounty', 'dependency'):
                continue

            if len(coords) == 2:
                label = props.get('label', '')
                # Deduplicate by label
                if label in seen:
                    continue
                seen.add(label)

                results.append({
                    'name': label,
                    'lat': coords[1],
                    'lng': coords[0],
                    'layer': layer,
                })
        return results
