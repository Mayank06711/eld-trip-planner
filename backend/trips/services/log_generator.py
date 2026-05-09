"""
Generates daily ELD log sheets from a flat list of HOS duty events.

Each calendar day gets its own log with:
  - Events sliced to 00:00-24:00 boundaries
  - Events crossing midnight split into two
  - Padding to fill exactly 24 hours
  - Totals that sum to exactly 24.0
  - Remarks with city/state at each status change
"""

import re
from datetime import datetime, timedelta
from collections import defaultdict


def _is_coordinate(name):
    """Check if a location name is just raw coordinates."""
    if not name:
        return True
    return bool(re.match(r'^-?\d+\.\d+,\s*-?\d+\.\d+$', name.strip()))


class LogGenerator:

    def generate(self, events, origin_name='', destination_name=''):
        """Convert flat event list into per-day log sheets."""
        if not events:
            return []
        self._origin = origin_name
        self._destination = destination_name

        # Determine date range
        first_dt = datetime.fromisoformat(events[0]['start_time'])
        last_dt = datetime.fromisoformat(events[-1]['end_time'])

        start_date = first_dt.date()
        end_date = last_dt.date()

        # Split events by calendar day
        daily_events = defaultdict(list)
        for event in events:
            evt_start = datetime.fromisoformat(event['start_time'])
            evt_end = datetime.fromisoformat(event['end_time'])

            current_date = evt_start.date()
            while current_date <= evt_end.date():
                day_start = datetime.combine(current_date, datetime.min.time())
                day_end = day_start + timedelta(days=1)

                # Clamp event to this day's boundaries
                clamped_start = max(evt_start, day_start)
                clamped_end = min(evt_end, day_end)

                if clamped_end > clamped_start:
                    duration = (clamped_end - clamped_start).total_seconds() / 3600.0
                    daily_events[current_date].append({
                        **event,
                        'start_time': clamped_start.isoformat(),
                        'end_time': clamped_end.isoformat(),
                        'duration_hours': round(duration, 2),
                        'start': clamped_start.strftime('%H:%M'),
                        'end': clamped_end.strftime('%H:%M') if clamped_end.date() == current_date else '24:00',
                    })

                current_date += timedelta(days=1)

        # Build log sheets
        logs = []
        day_number = 0
        current = start_date

        while current <= end_date:
            day_number += 1
            day_evts = daily_events.get(current, [])

            # Sort by start time
            day_evts.sort(key=lambda e: e['start_time'])

            # Fix end time display for events ending at midnight
            for evt in day_evts:
                evt_end_dt = datetime.fromisoformat(evt['end_time'])
                if evt_end_dt.hour == 0 and evt_end_dt.minute == 0 and evt_end_dt.date() > current:
                    evt['end'] = '24:00'

            # Compute totals
            totals = {
                'off_duty': 0.0,
                'sleeper_berth': 0.0,
                'driving': 0.0,
                'on_duty_not_driving': 0.0,
            }
            total_miles = 0.0
            for evt in day_evts:
                status = evt['status']
                if status in totals:
                    totals[status] += evt['duration_hours']
                total_miles += evt.get('miles_covered', 0) or 0

            # Round totals
            for key in totals:
                totals[key] = round(totals[key], 2)

            # Force totals to sum to exactly 24.0
            raw_total = sum(totals.values())
            if abs(raw_total - 24.0) < 0.1 and raw_total != 24.0:
                largest = max(totals, key=totals.get)
                totals[largest] = round(totals[largest] + (24.0 - raw_total), 2)

            totals['total'] = round(sum(v for k, v in totals.items() if k != 'total'), 2)

            # Build remarks
            remarks = []
            prev_status = None
            for evt in day_evts:
                if evt['status'] != prev_status and evt['event_type'] != 'padding':
                    location = evt.get('location', {})
                    loc_name = location.get('name', '') if isinstance(location, dict) else str(location)
                    remarks.append({
                        'time': evt['start'],
                        'location': loc_name,
                        'action': evt.get('notes', evt['event_type']),
                    })
                    prev_status = evt['status']

            # Skip days that only have padding (no real activity)
            non_padding = [e for e in day_evts if e['event_type'] != 'padding']
            if not non_padding:
                current += timedelta(days=1)
                continue

            # Determine from/to locations — prefer real city names over coordinates
            from_loc = ''
            to_loc = ''
            for evt in non_padding:
                loc = evt.get('location', {})
                name = loc.get('name', '') if isinstance(loc, dict) else str(loc)
                if name and not _is_coordinate(name):
                    if not from_loc:
                        from_loc = name
                    to_loc = name

            # For intermediate days without named locations, show route context
            if not from_loc or not to_loc:
                route_ctx = ''
                if self._origin and self._destination:
                    orig_short = self._origin.split(',')[0]
                    dest_short = self._destination.split(',')[0]
                    route_ctx = f"En route: {orig_short} \u2192 {dest_short}"
                else:
                    route_ctx = 'En route'
                if not from_loc:
                    from_loc = route_ctx
                if not to_loc:
                    to_loc = route_ctx

            logs.append({
                'date': current.isoformat(),
                'day_number': day_number,
                'from_location': from_loc,
                'to_location': to_loc,
                'total_miles_today': round(total_miles, 1),
                'events': day_evts,
                'totals': totals,
                'remarks': remarks,
            })

            current += timedelta(days=1)

        return logs
