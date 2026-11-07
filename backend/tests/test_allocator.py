"""Tests for the allocation algorithm.

The algorithm is the part of Equis worth testing hardest: the API routes are
thin wrappers, but a bug here silently produces unfair splits.
"""

import pytest

from app.allocator import Member, Task, allocate, fairness_score


def weights_per_member(members):
    return {m.name: m.load for m in members}


def test_equal_capacity_splits_evenly():
    tasks = [Task(i, f"T{i}", 5) for i in range(1, 5)]  # four tasks, weight 5
    members = [Member(1, "A"), Member(2, "B")]

    allocate(tasks, members)

    assert weights_per_member(members) == {"A": 10, "B": 10}


def test_heavier_task_goes_first_and_balances():
    # 7 + 3 + 2 = 12; the even split is 6 each.
    tasks = [Task(1, "big", 7), Task(2, "mid", 3), Task(3, "small", 2)]
    members = [Member(1, "A"), Member(2, "B")]

    allocate(tasks, members)

    loads = sorted(m.load for m in members)
    # LPT gives 7 / 5 here. Not the perfect 6/6, but within the known bound.
    assert loads == [5, 7]


def test_lower_capacity_member_gets_less():
    tasks = [Task(i, f"T{i}", 4) for i in range(1, 7)]  # 24 points total
    full = Member(1, "Full", capacity=1.0)
    half = Member(2, "Half", capacity=0.5)

    allocate(tasks, [full, half])

    assert full.load > half.load


def test_zero_capacity_member_is_skipped():
    tasks = [Task(1, "T1", 5), Task(2, "T2", 5)]
    active = Member(1, "Active", capacity=1.0)
    away = Member(2, "Away", capacity=0.0)

    allocate(tasks, [active, away])

    assert away.assigned == []
    assert active.load == 10


def test_no_available_members_raises():
    tasks = [Task(1, "T1", 5)]
    members = [Member(1, "Away", capacity=0.0)]

    with pytest.raises(ValueError):
        allocate(tasks, members)


def test_fairness_score_is_one_for_perfect_split():
    tasks = [Task(1, "T1", 5), Task(2, "T2", 5)]
    members = [Member(1, "A"), Member(2, "B")]

    allocate(tasks, members)

    assert fairness_score(members) == pytest.approx(1.0)


def test_fairness_score_drops_when_lopsided():
    members = [Member(1, "A"), Member(2, "B")]
    allocate([Task(1, "only", 10)], members)

    assert fairness_score(members) < 0.5
