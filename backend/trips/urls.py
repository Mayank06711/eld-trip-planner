from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views
from . import auth_views

urlpatterns = [
    # Public
    path('health/', views.health_check, name='health'),
    path('geocode/', views.geocode, name='geocode'),
    path('trip/plan/', views.plan_trip, name='plan_trip'),

    # Auth
    path('auth/register/', auth_views.register, name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', auth_views.me, name='me'),

    # Saved trips (requires login)
    path('trips/save/', auth_views.save_trip, name='save_trip'),
    path('trips/', auth_views.list_trips, name='list_trips'),
    path('trips/<int:trip_id>/', auth_views.get_trip, name='get_trip'),
    path('trips/<int:trip_id>/delete/', auth_views.delete_trip, name='delete_trip'),
]
