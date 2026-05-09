import time
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


def api_response(data=None, message="", status_code=200, metadata=None):
    """Standard API response envelope."""
    return Response(
        {
            "status": "success" if status_code < 400 else "error",
            "message": message,
            "metadata": metadata or {},
            "data": data,
        },
        status=status_code,
    )


def _parse_location(loc_data):
    """
    Parse a location from request data.
    Accepts either:
      - {name, lat, lng} dict (from frontend autocomplete selection)
      - plain string (fallback — will be geocoded)
    Returns {name, lat, lng} dict or None.
    """
    if isinstance(loc_data, dict):
        lat = loc_data.get('lat')
        lng = loc_data.get('lng')
        name = loc_data.get('name', '')
        if lat is not None and lng is not None:
            return {'name': name, 'lat': float(lat), 'lng': float(lng)}

    # Fallback: treat as string and geocode
    if isinstance(loc_data, str) and loc_data.strip():
        from .services.geocoding import GeocodingService
        geo = GeocodingService()
        results = geo.search(loc_data.strip(), limit=1)
        if results:
            return results[0]

    return None


@api_view(['GET'])
def health_check(request):
    return api_response(message="Server is running")


@api_view(['GET'])
def geocode(request):
    from .services.geocoding import GeocodingService

    query = request.query_params.get('q', '').strip()
    if not query:
        return api_response(
            message="Query parameter 'q' is required",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    svc = GeocodingService()
    results = svc.search(query)
    return api_response(
        data={"results": results},
        message=f"Found {len(results)} results",
    )


@api_view(['POST'])
def plan_trip(request):
    from .services.routing import RoutingService
    from .services.hos_engine import HOSEngine
    from .services.log_generator import LogGenerator

    start_time = time.time()

    current_cycle_used = request.data.get('current_cycle_used', 0)

    try:
        current_cycle_used = float(current_cycle_used)
        if not (0 <= current_cycle_used <= 70):
            raise ValueError
    except (ValueError, TypeError):
        return api_response(
            message="current_cycle_used must be a number between 0 and 70",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # Parse locations — accepts {name, lat, lng} objects or strings
    current_coords = _parse_location(request.data.get('current_location'))
    pickup_coords = _parse_location(request.data.get('pickup_location'))
    dropoff_coords = _parse_location(request.data.get('dropoff_location'))

    if not current_coords or not pickup_coords or not dropoff_coords:
        return api_response(
            message="All three locations are required. Please select from the dropdown suggestions.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Snap all coordinates to truck-routable road network
        from .services.geocoding import GeocodingService
        geo = GeocodingService()
        for coords in [current_coords, pickup_coords, dropoff_coords]:
            snapped = geo.snap_to_road(coords['lat'], coords['lng'])
            coords['lat'] = snapped['lat']
            coords['lng'] = snapped['lng']

        routing = RoutingService()

        # Same-location check
        same_start = (
            abs(current_coords['lat'] - pickup_coords['lat']) < 0.01
            and abs(current_coords['lng'] - pickup_coords['lng']) < 0.01
        )
        if same_start:
            segment1 = {
                'start': current_coords,
                'end': pickup_coords,
                'distance_miles': 0,
                'duration_hours': 0,
                'geometry': [[current_coords['lat'], current_coords['lng']]],
            }
        else:
            segment1 = routing.get_route(current_coords, pickup_coords)

        segment2 = routing.get_route(pickup_coords, dropoff_coords)

        if not segment2:
            return api_response(
                message=f"Could not find a driving route from '{pickup_coords['name']}' to '{dropoff_coords['name']}'.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if not same_start and not segment1:
            return api_response(
                message=f"Could not find a driving route from '{current_coords['name']}' to '{pickup_coords['name']}'.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        engine = HOSEngine(current_cycle_used=current_cycle_used)
        events = engine.plan_trip(segment1, segment2)

        log_gen = LogGenerator()
        daily_logs = log_gen.generate(
            events,
            origin_name=current_coords.get('name', ''),
            destination_name=dropoff_coords.get('name', ''),
        )

        all_stops = [
            e for e in events
            if e['status'] != 'driving'
            and e['event_type'] not in ('padding', 'pre_trip')
        ]

        # Add a "start" marker at the beginning for context
        first_work = next((e for e in events if e['event_type'] != 'padding'), None)
        if first_work:
            all_stops.insert(0, {
                'event_type': 'start',
                'location': current_coords,
                'start_time': first_work['start_time'],
                'end_time': first_work['start_time'],
                'duration_hours': 0,
                'notes': 'Trip start',
            })
        total_driving = sum(
            e['duration_hours'] for e in events if e['status'] == 'driving'
        )
        total_miles = segment1['distance_miles'] + segment2['distance_miles']
        combined_geometry = segment1['geometry'] + segment2['geometry']

        processing_ms = int((time.time() - start_time) * 1000)

        return api_response(
            data={
                "summary": {
                    "total_distance_miles": round(total_miles, 1),
                    "total_driving_hours": round(total_driving, 1),
                    "total_trip_days": len(daily_logs),
                    "total_stops": len(all_stops),
                    "cycle_hours_before": current_cycle_used,
                    "cycle_hours_after": round(engine.total_cycle_used, 1),
                    "start_time": events[0]['start_time'] if events else None,
                    "end_time": events[-1]['end_time'] if events else None,
                },
                "route": {
                    "geometry": combined_geometry,
                    "segments": [
                        {
                            "label": "Current \u2192 Pickup",
                            "from": current_coords,
                            "to": pickup_coords,
                            "distance_miles": round(segment1['distance_miles'], 1),
                            "duration_hours": round(segment1['duration_hours'], 2),
                        },
                        {
                            "label": "Pickup \u2192 Dropoff",
                            "from": pickup_coords,
                            "to": dropoff_coords,
                            "distance_miles": round(segment2['distance_miles'], 1),
                            "duration_hours": round(segment2['duration_hours'], 2),
                        },
                    ],
                },
                "stops": [
                    {
                        "type": e['event_type'],
                        "location": e['location'],
                        "arrival_time": e['start_time'],
                        "departure_time": e['end_time'],
                        "duration_hours": round(e['duration_hours'], 2),
                        "notes": e['notes'],
                    }
                    for e in all_stops
                ],
                "daily_logs": daily_logs,
            },
            message=f"Trip planned successfully. {len(daily_logs)} daily log sheets generated.",
            metadata={
                "processing_time_ms": processing_ms,
                "api_version": "1.0",
            },
        )

    except Exception as exc:
        processing_ms = int((time.time() - start_time) * 1000)
        return api_response(
            message=f"Trip planning failed: {str(exc)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            metadata={"processing_time_ms": processing_ms},
        )
