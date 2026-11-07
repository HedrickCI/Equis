"""Fair allocation of tasks to group members.

The problem is a variant of multiprocessor scheduling: given a set of tasks with
effort weights and a set of members with differing capacities, assign every task
so that the members' loads are as balanced as possible relative to capacity.

Finding the optimal assignment is NP-hard, so Equis uses the Longest Processing
Time first (LPT) greedy heuristic: sort the tasks heaviest-first, then give each
task to whoever is currently least loaded relative to their capacity.

LPT is a 4/3-approximation for the equal-capacity case (Graham, 1969), which is
comfortably good enough here — the effort weights are human estimates, so chasing
an exact optimum would be false precision.
"""

from dataclasses import dataclass, field


@dataclass
class Member:
    """A group member and the share of work they can take this sprint."""

    id: int
    name: str
    capacity: float = 1.0  # relative; 0.5 means "half a normal load this sprint"
    assigned: list["Task"] = field(default_factory=list)

    @property
    def load(self) -> int:
        """Total effort weight currently assigned to this member."""
        return sum(task.weight for task in self.assigned)

    @property
    def relative_load(self) -> float:
        """Load per unit of capacity — the number the allocator balances.

        A member with capacity 0.5 carrying 10 points of work is as loaded as a
        member with capacity 1.0 carrying 20.
        """
        if self.capacity <= 0:
            return float("inf")  # unavailable members never get picked
        return self.load / self.capacity


@dataclass
class Task:
    """A unit of work with an estimated effort weight."""

    id: int
    title: str
    weight: int  # 1-10, set by the group owner


def allocate(tasks: list[Task], members: list[Member]) -> list[Member]:
    """Distribute tasks across members, balancing load against capacity.

    Returns the members with their `assigned` lists populated. Members are
    mutated in place, so pass copies if the originals matter.

    Raises ValueError if there is nobody available to take the work.
    """
    available = [m for m in members if m.capacity > 0]
    if not available:
        raise ValueError("No members with capacity above zero")

    for member in available:
        member.assigned = []

    # Heaviest first: placing big tasks early leaves small ones to even out the
    # remainder. Scheduling the other way round strands a large task at the end
    # with nowhere balanced to put it.
    for task in sorted(tasks, key=lambda t: t.weight, reverse=True):
        least_loaded = min(available, key=lambda m: m.relative_load)
        least_loaded.assigned.append(task)

    return members


def fairness_score(members: list[Member]) -> float:
    """How even the allocation is, from 0.0 (worst) to 1.0 (perfectly even).

    Computed as 1 minus the spread of relative loads over their mean. Useful for
    showing the user how good the split is, and for testing that a change to the
    algorithm actually improved things.
    """
    active = [m for m in members if m.capacity > 0]
    if not active:
        return 0.0

    loads = [m.relative_load for m in active]
    mean = sum(loads) / len(loads)
    if mean == 0:
        return 1.0  # nothing assigned, trivially even

    spread = (max(loads) - min(loads)) / mean
    return max(0.0, 1.0 - spread)
