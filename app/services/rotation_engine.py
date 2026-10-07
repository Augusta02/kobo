from datetime import date, timedelta

def current_member(participant_ids, position):
    """Whoever's turn it is right now, given the order and current position."""
    return participant_ids[position % len(participant_ids)]


def advance(position, participant_count):
    """The next position in the rotation, wrapping back to the start."""
    return (position + 1) % participant_count


def next_due(last_completed_at, num_days):
    """When the next turn falls due. Nothing completed yet means it's due today."""
    if last_completed_at is None:
        return date.today()
    return last_completed_at + timedelta(days=num_days)


def is_due(due_date, today=None):
    """Whether a due date has arrived or passed."""
    return due_date <= (today or date.today())