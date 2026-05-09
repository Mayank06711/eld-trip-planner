from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken


def api_response(data=None, message="", status_code=200, metadata=None):
    from .views import api_response as _resp
    return _resp(data, message, status_code, metadata)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()
    email = request.data.get('email', '').strip()

    if not username or not password:
        return api_response(
            message="Username and password are required",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    if len(password) < 6:
        return api_response(
            message="Password must be at least 6 characters",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(username=username).exists():
        return api_response(
            message="Username already taken",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    user = User.objects.create_user(username=username, password=password, email=email)
    tokens = RefreshToken.for_user(user)

    return api_response(
        data={
            "user": {"id": user.id, "username": user.username, "email": user.email},
            "access": str(tokens.access_token),
            "refresh": str(tokens),
        },
        message="Account created successfully",
        status_code=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    return api_response(
        data={"id": user.id, "username": user.username, "email": user.email},
        message="Authenticated",
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_trip(request):
    from .models import Trip

    trip_data = request.data
    trip = Trip.objects.create(
        user=request.user,
        current_location=trip_data.get('current_location', {}),
        pickup_location=trip_data.get('pickup_location', {}),
        dropoff_location=trip_data.get('dropoff_location', {}),
        current_cycle_used=trip_data.get('current_cycle_used', 0),
        summary=trip_data.get('summary', {}),
        route=trip_data.get('route', {}),
        stops=trip_data.get('stops', []),
        daily_logs=trip_data.get('daily_logs', []),
    )
    return api_response(
        data={"id": trip.pk},
        message="Trip saved",
        status_code=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_trips(request):
    from .models import Trip

    trips = Trip.objects.filter(user=request.user)[:20]
    result = []
    for t in trips:
        segs = t.route.get('segments', [])
        route_label = ''
        if segs:
            parts = [s.get('from', {}).get('name', '').split(',')[0] for s in segs]
            parts.append(segs[-1].get('to', {}).get('name', '').split(',')[0])
            route_label = ' → '.join(filter(None, parts))

        result.append({
            "id": t.pk,
            "created_at": t.created_at.isoformat(),
            "route_label": route_label,
            "summary": t.summary,
        })

    return api_response(data={"trips": result})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_trip(request, trip_id):
    from .models import Trip

    try:
        trip = Trip.objects.get(pk=trip_id, user=request.user)
    except Trip.DoesNotExist:
        return api_response(message="Trip not found", status_code=status.HTTP_404_NOT_FOUND)

    return api_response(data={
        "summary": trip.summary,
        "route": trip.route,
        "stops": trip.stops,
        "daily_logs": trip.daily_logs,
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_trip(request, trip_id):
    from .models import Trip

    try:
        trip = Trip.objects.get(pk=trip_id, user=request.user)
        trip.delete()
        return api_response(message="Trip deleted")
    except Trip.DoesNotExist:
        return api_response(message="Trip not found", status_code=status.HTTP_404_NOT_FOUND)
