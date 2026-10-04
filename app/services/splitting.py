from decimal import Decimal, ROUND_DOWN

kobo = Decimal("0.01")


def split_amount(
    total: Decimal,
    participant_ids: list[str],
    contributions: dict[str, Decimal] | None = None,
) -> dict[str, Decimal]:
    """Split a total evenly across participants, to the kobo.

    contributions maps a member_id to what they've already put in.
    Anyone not in it is assumed to have contributed nothing yet.
    Any leftover kobo from rounding goes to whoever contributed the
    most, or the first participant if nobody's contributed anything.
    """
    contributions = contributions or {}
    share_count = len(participant_ids)
    base_share = (total / share_count).quantize(kobo, rounding=ROUND_DOWN)
    remainder = total - (base_share * share_count)

    shares = {person_id: base_share for person_id in participant_ids}

    if remainder:
        relevant = {pid: amt for pid, amt in contributions.items() if pid in shares}
        absorber = max(relevant, key=relevant.get) if relevant else participant_ids[0]
        shares[absorber] += remainder

    return shares
