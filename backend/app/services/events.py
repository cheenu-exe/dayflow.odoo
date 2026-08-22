from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class DomainEvent:
    name: str
    occurred_at: datetime
    payload: dict[str, Any]


def publish_event(event: DomainEvent) -> None:
    """Publish hook used by the worker integration.

    The local default is intentionally side-effect free. The Background Jobs team
    can replace this implementation with Celery or Redis publishing without
    changing route handlers or API contracts.
    """
    print(f"[domain-event] {event.name}: {event.payload}")
