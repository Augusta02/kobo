from decimal import Decimal


def simplify_debts(net_by_member: dict) -> list[dict]:
    """Turn each member's net position (positive = owed money, negative = owes)
    into the minimum number of "debtor pays creditor" transactions, by always
    matching the biggest creditor against the biggest debtor."""
    creditors = sorted(
        ([member_id, amount] for member_id, amount in net_by_member.items() if amount > 0),
        key=lambda pair: -pair[1],
    )
    debtors = sorted(
        ([member_id, -amount] for member_id, amount in net_by_member.items() if amount < 0),
        key=lambda pair: -pair[1],
    )

    transactions = []
    i, j = 0, 0
    while i < len(debtors) and j < len(creditors):
        debtor_id, debt_amount = debtors[i]
        creditor_id, credit_amount = creditors[j]
        settled = min(debt_amount, credit_amount)

        transactions.append({"from_member_id": debtor_id, "to_member_id": creditor_id, "amount": settled})

        debtors[i][1] -= settled
        creditors[j][1] -= settled
        if debtors[i][1] <= Decimal("0.00"):
            i += 1
        if creditors[j][1] <= Decimal("0.00"):
            j += 1

    return transactions