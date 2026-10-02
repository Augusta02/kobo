
# bills calculations and splitting logic 

def split_amount(total_amount, participants_ids, payer_id):
    """
    Splits the total amount evenly among the number of people.
    Any leftover from integer division goes to the payer
    so the shares always sum back to the total amount.
    Args:
        total_amount (float): The total amount to be split.
        participants_ids (list): List of participant IDs.
        payer_id (str): The ID of the person who paid the total amount.
        
    Returns:
        float: The amount each person should pay.
    """
    if payer_id not in participants_ids:
        raise ValueError("Payer must be a participant.")

    share_count = len(participants_ids)
    base_share, remainder = divmod(total_amount, share_count)

    shares = {person_id: base_share for person_id in participants_ids}
    shares[payer_id] += remainder
    return shares