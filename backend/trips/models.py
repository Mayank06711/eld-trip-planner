import json
from django.db import models
from django.contrib.auth.models import User


class Trip(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trips')
    created_at = models.DateTimeField(auto_now_add=True)

    # Input data
    current_location = models.JSONField()
    pickup_location = models.JSONField()
    dropoff_location = models.JSONField()
    current_cycle_used = models.FloatField(default=0)

    # Computed results (stored as JSON)
    summary = models.JSONField(default=dict)
    route = models.JSONField(default=dict)
    stops = models.JSONField(default=list)
    daily_logs = models.JSONField(default=list)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        segs = self.route.get('segments', [])
        if segs:
            start = segs[0].get('from', {}).get('name', '?')
            end = segs[-1].get('to', {}).get('name', '?')
            return f"{start} → {end} ({self.created_at:%b %d})"
        return f"Trip #{self.pk}"
