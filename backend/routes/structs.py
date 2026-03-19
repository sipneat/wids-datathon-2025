from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _serialize(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _serialize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_serialize(v) for v in value]
    return value


@dataclass
class IntakeSubmitRequest:
    email: Optional[str] = None
    displayName: Optional[str] = None
    photoURL: Optional[str] = None
    responses: Dict[str, Any] = field(default_factory=dict)
    profile: Dict[str, Any] = field(default_factory=dict)
    submittedAt: Optional[str] = None

    @classmethod
    def from_payload(cls, payload: Dict[str, Any]) -> "IntakeSubmitRequest":
        if not isinstance(payload, dict):
            raise ValueError("No data provided")
        responses = payload.get("responses") or {}
        profile = payload.get("profile") or {}
        if not isinstance(responses, dict):
            responses = {}
        if not isinstance(profile, dict):
            profile = {}
        return cls(
            email=payload.get("email"),
            displayName=payload.get("displayName"),
            photoURL=payload.get("photoURL"),
            responses=responses,
            profile=profile,
            submittedAt=payload.get("submittedAt"),
        )


@dataclass
class IntakeRecord:
    userId: str
    email: Optional[str]
    displayName: Optional[str]
    photoURL: Optional[str]
    responses: Dict[str, Any]
    submittedAt: datetime
    createdAt: str

    @classmethod
    def from_submit_request(cls, user_id: str, req: IntakeSubmitRequest) -> "IntakeRecord":
        now = utcnow()
        return cls(
            userId=user_id,
            email=req.email,
            displayName=req.displayName,
            photoURL=req.photoURL,
            responses=req.responses,
            submittedAt=now,
            createdAt=req.submittedAt or now.isoformat(),
        )

    def to_firestore(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class UserProfileRecord:
    data: Dict[str, Any]

    @classmethod
    def from_submit_request(cls, req: IntakeSubmitRequest) -> "UserProfileRecord":
        profile_data = {
            **req.profile,
            "email": req.email,
            "displayName": req.displayName,
            "photoURL": req.photoURL,
            "updatedAt": utcnow(),
        }
        return cls(data=profile_data)


@dataclass
class ActionStatusUpdateRequest:
    userId: str
    actionId: str
    status: str
    notes: str = ""

    @classmethod
    def from_payload(cls, payload: Dict[str, Any]) -> "ActionStatusUpdateRequest":
        if not isinstance(payload, dict):
            raise ValueError("Missing required fields")
        if "userId" not in payload or "actionId" not in payload or "status" not in payload:
            raise ValueError("Missing required fields")
        return cls(
            userId=payload["userId"],
            actionId=payload["actionId"],
            status=payload["status"],
            notes=payload.get("notes", ""),
        )


@dataclass
class ActionStatusRecord:
    userId: str
    actionId: str
    status: str
    notes: str
    updatedAt: datetime

    @classmethod
    def from_update_request(cls, req: ActionStatusUpdateRequest) -> "ActionStatusRecord":
        return cls(
            userId=req.userId,
            actionId=req.actionId,
            status=req.status,
            notes=req.notes,
            updatedAt=utcnow(),
        )

    def to_firestore(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class IntakeSubmitResponse:
    success: bool
    message: str
    intakeId: str
    userId: str

    def to_dict(self) -> Dict[str, Any]:
        return _serialize(asdict(self))


@dataclass
class ActionStatusUpdateResponse:
    success: bool
    message: str
    actionId: str
    status: str

    def to_dict(self) -> Dict[str, Any]:
        return _serialize(asdict(self))


def serialize_document(data: Dict[str, Any]) -> Dict[str, Any]:
    return _serialize(data)