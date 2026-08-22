from typing import Any

from fastapi import HTTPException, status


def verify_passkey_assertion(user_id: str, credential: dict[str, Any], expected_challenge: str | None = None) -> None:
    """WebAuthn seam owned by the Intelligence plan.

    Never persist a passkey check-in merely because a credential-shaped JSON
    object was received. Plan 4 should replace this function with py_webauthn
    verification and credential lookup, while retaining this route contract.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Passkey verification is not configured; install the WebAuthn verifier before enabling this route.",
    )
