"""
HOS (Hours of Service) Engine for property-carrying CMV drivers.

Rules implemented (FMCSA 49 CFR Part 395):
  - 11-Hour Driving Limit
  - 14-Hour Driving Window (does NOT pause for off-duty)
  - 30-Minute Break after 8 cumulative driving hours
  - 70-Hour/8-Day Cycle Limit
  - 10-Hour Off-Duty Reset
  - 34-Hour Restart (when cycle exhausted)
  - Fuel stop every 1,000 miles
  - 30 min pickup + 30 min dropoff (1 hr combined)
"""

from datetime import datetime, timedelta

MAX_DRIVING_HOURS = 11.0
MAX_WINDOW_HOURS = 14.0
MAX_DRIVING_BEFORE_BREAK = 8.0
MAX_CYCLE_HOURS = 70.0
MANDATORY_REST_HOURS = 10.0
CYCLE_RESTART_HOURS = 34.0
FUEL_INTERVAL_MILES = 1000.0
FUEL_STOP_HOURS = 0.5
BREAK_HOURS = 0.5
PICKUP_HOURS = 0.5
DROPOFF_HOURS = 0.5
PRE_TRIP_HOURS = 0.25
MAX_ITERATIONS = 500


class HOSEngine:
    def __init__(self, current_cycle_used=0.0, start_hour=8):
        # Start clock at MIDNIGHT so padding fills 00:00→start_hour correctly
        now = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        self.clock = now
        self.day_start = now
        self.driving_hours_today = 0.0
        self.window_start = None
        self.driving_since_break = 0.0
        self.total_cycle_used = float(current_cycle_used)
        self.miles_since_fuel = 0.0
        self.total_miles_driven = 0.0
        self.events = []
        self.start_hour = start_hour

    def plan_trip(self, segment1, segment2):
        """Plan a full trip: current→pickup→dropoff. Returns list of event dicts."""

        # Pad midnight→start as off duty
        if self.start_hour > 0:
            self._add_event('off_duty', self.start_hour, 'padding',
                            segment1['start'], 'Off duty')

        # Pre-trip inspection
        self._add_event('on_duty_not_driving', PRE_TRIP_HOURS, 'pre_trip',
                        segment1['start'], 'Pre-trip inspection')

        # Leg 1: current → pickup
        if segment1['distance_miles'] > 0.1:
            self._drive_segment(segment1)

        # Pickup
        self._add_event('on_duty_not_driving', PICKUP_HOURS, 'pickup',
                        segment1['end'], 'Pickup - loading')

        # Leg 2: pickup → dropoff
        if segment2['distance_miles'] > 0.1:
            self._drive_segment(segment2)

        # Dropoff
        self._add_event('on_duty_not_driving', DROPOFF_HOURS, 'dropoff',
                        segment2['end'], 'Dropoff - unloading')

        # Pad remaining hours to midnight
        self._pad_to_midnight()

        return self.events

    def _drive_segment(self, segment):
        """Drive a route segment, inserting required stops."""
        remaining_miles = segment['distance_miles']
        if segment['duration_hours'] <= 0:
            return

        avg_speed = segment['distance_miles'] / segment['duration_hours']
        geometry = segment.get('geometry', [])
        segment_start_miles = self.total_miles_driven
        total_segment_miles = segment['distance_miles']

        iterations = 0
        while remaining_miles > 0.1:
            iterations += 1
            if iterations > MAX_ITERATIONS:
                raise RuntimeError(
                    f"HOS engine exceeded {MAX_ITERATIONS} iterations "
                    f"with {remaining_miles:.1f} miles remaining"
                )

            # How far can we drive before each limit?
            hrs_until_11 = MAX_DRIVING_HOURS - self.driving_hours_today
            hrs_until_14 = self._hours_until_window_expires()
            hrs_until_break = MAX_DRIVING_BEFORE_BREAK - self.driving_since_break
            hrs_until_cycle = MAX_CYCLE_HOURS - self.total_cycle_used
            hrs_until_fuel = (
                (FUEL_INTERVAL_MILES - self.miles_since_fuel) / avg_speed
                if avg_speed > 0 else 999
            )
            hrs_remaining = remaining_miles / avg_speed if avg_speed > 0 else 0

            max_drive = min(
                hrs_until_11,
                hrs_until_14,
                hrs_until_break,
                hrs_until_cycle,
                hrs_until_fuel,
                hrs_remaining,
            )

            if max_drive < 0.02:
                # A limit was hit — handle by priority
                if hrs_until_cycle <= 0.02:
                    self._add_event('off_duty', CYCLE_RESTART_HOURS, 'cycle_restart',
                                    self._interpolate_location(geometry, segment_start_miles, total_segment_miles),
                                    '34-hour restart (cycle reset)')
                    self.total_cycle_used = 0.0
                    self.driving_hours_today = 0.0
                    self.window_start = None
                    self.driving_since_break = 0.0
                    self._add_event('on_duty_not_driving', PRE_TRIP_HOURS, 'pre_trip',
                                    self._interpolate_location(geometry, segment_start_miles, total_segment_miles),
                                    'Pre-trip inspection')

                elif hrs_until_11 <= 0.02 or hrs_until_14 <= 0.02:
                    self._add_event('off_duty', MANDATORY_REST_HOURS, 'overnight_rest',
                                    self._interpolate_location(geometry, segment_start_miles, total_segment_miles),
                                    '10-hour rest period')
                    self.driving_hours_today = 0.0
                    self.window_start = None
                    self.driving_since_break = 0.0
                    self._add_event('on_duty_not_driving', PRE_TRIP_HOURS, 'pre_trip',
                                    self._interpolate_location(geometry, segment_start_miles, total_segment_miles),
                                    'Pre-trip inspection')

                elif hrs_until_break <= 0.02:
                    self._add_event('off_duty', BREAK_HOURS, 'rest_break',
                                    self._interpolate_location(geometry, segment_start_miles, total_segment_miles),
                                    '30-minute rest break')
                    self.driving_since_break = 0.0

                elif hrs_until_fuel <= 0.02:
                    self._add_event('on_duty_not_driving', FUEL_STOP_HOURS, 'fuel',
                                    self._interpolate_location(geometry, segment_start_miles, total_segment_miles),
                                    'Fuel stop')
                    self.miles_since_fuel = 0.0
                    # 30-min fuel stop also satisfies break requirement
                    self.driving_since_break = 0.0
            else:
                # Drive
                self._ensure_window_started()
                miles_driven = max_drive * avg_speed
                location = self._interpolate_location(
                    geometry, segment_start_miles, total_segment_miles
                )

                self._add_event('driving', max_drive, 'driving', location, 'Driving',
                                miles=round(miles_driven, 1))

                self.driving_hours_today += max_drive
                self.driving_since_break += max_drive
                self.total_cycle_used += max_drive
                self.miles_since_fuel += miles_driven
                self.total_miles_driven += miles_driven
                remaining_miles -= miles_driven

    def _add_event(self, status, hours, event_type, location, notes, miles=0):
        """Add a duty event to the timeline."""
        hours = round(hours, 4)
        start = self.clock
        end = self.clock + timedelta(hours=hours)

        if self.window_start is None and status != 'off_duty':
            self.window_start = self.clock

        if status == 'on_duty_not_driving':
            self.total_cycle_used += hours

        if status != 'driving' and hours >= 0.5:
            self.driving_since_break = 0.0

        self.events.append({
            'status': status,
            'start_time': start.isoformat(),
            'end_time': end.isoformat(),
            'duration_hours': round(hours, 2),
            'event_type': event_type,
            'location': location if isinstance(location, dict) else {'name': str(location), 'lat': 0, 'lng': 0},
            'notes': notes,
            'miles_covered': miles,
        })

        self.clock = end

    def _hours_until_window_expires(self):
        """Hours remaining in the 14-hour driving window."""
        if self.window_start is None:
            return MAX_WINDOW_HOURS
        elapsed = (self.clock - self.window_start).total_seconds() / 3600.0
        return MAX_WINDOW_HOURS - elapsed

    def _ensure_window_started(self):
        if self.window_start is None:
            self.window_start = self.clock

    def _pad_to_midnight(self):
        """Pad remaining time to end of current calendar day as off duty."""
        current_midnight = self.clock.replace(
            hour=0, minute=0, second=0, microsecond=0
        ) + timedelta(days=1)
        remaining = (current_midnight - self.clock).total_seconds() / 3600.0
        if remaining > 0.01:
            last_location = (
                self.events[-1]['location'] if self.events else {'name': 'Unknown', 'lat': 0, 'lng': 0}
            )
            self._add_event('off_duty', remaining, 'padding', last_location, 'Off duty')

    def _interpolate_location(self, geometry, segment_start_miles, total_segment_miles):
        """Estimate GPS position along route based on miles driven."""
        if not geometry or total_segment_miles <= 0:
            return self.events[-1]['location'] if self.events else {'name': '', 'lat': 0, 'lng': 0}

        miles_into_segment = self.total_miles_driven - segment_start_miles
        fraction = min(max(miles_into_segment / total_segment_miles, 0), 1)
        idx = int(fraction * (len(geometry) - 1))
        idx = min(idx, len(geometry) - 1)

        point = geometry[idx]
        return {
            'name': f"{point[0]:.4f}, {point[1]:.4f}",
            'lat': point[0],
            'lng': point[1],
        }
