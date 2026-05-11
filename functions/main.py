"""
Political Integrity Wiki — Cloud Functions
Handles FEC data ingestion, credibility calculations, and admin actions.
"""

import os
os.environ["OBJC_DISABLE_INITIALIZE_FORK_SAFETY"] = "YES"

from datetime import datetime, timezone, timedelta
import json
import math

from firebase_functions import https_fn, scheduler_fn, options
from firebase_functions.options import set_global_options
from firebase_admin import initialize_app, firestore, auth
from google.cloud.firestore_v1 import FieldFilter

from fec_client import FECClient, CandidateIngester, CredibilityCalculator

set_global_options(max_instances=10)
app = initialize_app()
db = firestore.client()


def _verify_auth(req: https_fn.CallableRequest) -> str:
    """Verify the request is authenticated and return the user's UID."""
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="Authentication required.",
        )
    return req.auth.uid


def _verify_admin(req: https_fn.CallableRequest) -> str:
    """Verify the request is from an admin user."""
    uid = _verify_auth(req)
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists or not user_doc.to_dict().get("isAdmin", False):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Admin access required.",
        )
    return uid


def _get_user_points(uid: str) -> int:
    """Get a user's credibility points."""
    doc = db.collection("users").document(uid).get()
    if doc.exists:
        return doc.to_dict().get("credibilityPoints", 0)
    return 0


def _check_ban(uid: str):
    """Check if a user is banned and raise an error if so."""
    doc = db.collection("users").document(uid).get()
    if not doc.exists:
        return
    data = doc.to_dict()
    if data.get("isBanned", False):
        expiry = data.get("banExpiry")
        if expiry:
            expiry_dt = datetime.fromisoformat(expiry)
            if datetime.now(timezone.utc) < expiry_dt:
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
                    message=f"Account banned until {expiry}.",
                )
            else:
                db.collection("users").document(uid).update({
                    "isBanned": False, "banExpiry": firestore.DELETE_FIELD
                })
        else:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
                message="Account permanently banned.",
            )


@https_fn.on_call(timeout_sec=300)
def ingest_fec_candidate(req: https_fn.CallableRequest) -> dict:
    """Ingest a federal candidate's data from the FEC API by their FEC ID(s).
    If a candidate with a matching name already exists, merge the new FEC data
    into the existing profile (appending FEC IDs and accountability periods).
    """
    uid = _verify_auth(req)
    _check_ban(uid)

    fec_ids_str = req.data.get("fecId", "").strip()
    fec_ids = [fid.strip() for fid in fec_ids_str.split(",") if fid.strip()]
    if not fec_ids:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="FEC ID is required.",
        )

    # Check if any of these FEC IDs are already ingested
    for fec_id in fec_ids:
        existing = db.collection("candidates").where(
            filter=FieldFilter("fecIds", "array_contains", fec_id)
        ).limit(1).get()
        if existing:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.ALREADY_EXISTS,
                message=f"A candidate with FEC ID {fec_id} already exists.",
            )

    ingester = CandidateIngester()
    all_periods = []
    base_candidate_data = None
    
    for i, fec_id in enumerate(fec_ids):
        try:
            result = ingester.ingest_candidate(fec_id)
            if i == 0:
                base_candidate_data = result["candidate"]
            all_periods.extend(result["periods"])
        except ValueError as e:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.NOT_FOUND,
                message=str(e),
            )
        except Exception as e:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INTERNAL,
                message=f"Failed to fetch FEC data for {fec_id}: {str(e)}",
            )

    candidate_name = base_candidate_data["name"]

    # Check if a candidate with the same name already exists → merge
    name_match = db.collection("candidates").where(
        filter=FieldFilter("name", "==", candidate_name)
    ).limit(1).get()

    if name_match:
        # Merge into existing candidate
        existing_doc = name_match[0]
        existing_data = existing_doc.to_dict()
        existing_fec_ids = existing_data.get("fecIds", []) or []
        merged_fec_ids = list(set(existing_fec_ids + fec_ids))

        existing_doc.reference.update({
            "fecIds": merged_fec_ids,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        })

        # Add new accountability periods
        for period in all_periods:
            period["candidateId"] = existing_doc.id
            existing_doc.reference.collection("accountabilityPeriods").add(period)

        return {
            "candidateId": existing_doc.id,
            "name": candidate_name,
            "merged": True,
            "message": f"Merged {len(fec_ids)} new FEC ID(s) into existing profile for {candidate_name}.",
        }
    else:
        # Create a new candidate
        candidate_data = base_candidate_data
        candidate_data["fecIds"] = fec_ids
        candidate_data["createdBy"] = uid
        candidate_ref = db.collection("candidates").document()
        candidate_ref.set(candidate_data)

        for period in all_periods:
            period["candidateId"] = candidate_ref.id
            db.collection("candidates").document(candidate_ref.id)\
                .collection("accountabilityPeriods").add(period)

        return {"candidateId": candidate_ref.id, "name": candidate_data["name"]}


@https_fn.on_call(timeout_sec=300)
def create_candidate(req: https_fn.CallableRequest) -> dict:
    """Create a new candidate page (state/local requires 1000 credibility points)."""
    uid = _verify_auth(req)
    _check_ban(uid)

    name = req.data.get("name", "").strip()
    level = req.data.get("level", "federal")

    if not name:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Candidate name is required.",
        )

    if level in ("state", "local"):
        points = _get_user_points(uid)
        if points < 1000:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
                message=f"You need 1000 credibility points to create a {level} candidate. You have {points}.",
            )

    candidate_ref = db.collection("candidates").document()
    candidate_ref.set({
        "name": name,
        "badges": {},
        "createdBy": uid,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    })

    return {"candidateId": candidate_ref.id}


@https_fn.on_call()
def add_accountability_period(req: https_fn.CallableRequest) -> dict:
    """Add a new accountability period to a candidate (costs 1000 credibility points)."""
    uid = _verify_auth(req)
    _check_ban(uid)

    candidate_id = req.data.get("candidateId", "")
    position = req.data.get("position", "")
    year_start = req.data.get("yearStart", 0)
    year_end = req.data.get("yearEnd", 0)

    if not all([candidate_id, position, year_start, year_end]):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="candidateId, position, yearStart, and yearEnd are required.",
        )

    points = _get_user_points(uid)
    if points < 1000:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message=f"You need 1000 credibility points. You have {points}.",
        )

    # Deduct points
    db.collection("users").document(uid).update({
        "credibilityPoints": firestore.Increment(-1000)
    })

    period_ref = db.collection("candidates").document(candidate_id)\
        .collection("accountabilityPeriods").document()
    period_data = {
        "candidateId": candidate_id,
        "yearStart": year_start,
        "yearEnd": year_end,
        "position": position,
        "result": req.data.get("result", "unknown"),
        "party": req.data.get("party", ""),
        "region": req.data.get("region", ""),
        "state": req.data.get("state", ""),
        "fecDataFetched": False,
    }
    period_ref.set(period_data)

    return {"periodId": period_ref.id}


@https_fn.on_call()
def submit_proposal(req: https_fn.CallableRequest) -> dict:
    """Submit a new value proposal for a field (costs 10 credibility points)."""
    uid = _verify_auth(req)
    _check_ban(uid)

    candidate_id = req.data.get("candidateId", "")
    period_id = req.data.get("periodId", "")
    field_id = req.data.get("fieldId", "")
    value = req.data.get("value", "")
    citations = req.data.get("citations", [])

    if not all([candidate_id, field_id, value]):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="candidateId, fieldId, and value are required.",
        )

    points = _get_user_points(uid)
    if points < 10:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message=f"You need 10 credibility points. You have {points}.",
        )

    # Deduct points
    db.collection("users").document(uid).update({
        "credibilityPoints": firestore.Increment(-10)
    })

    # Get author display name
    user_doc = db.collection("users").document(uid).get()
    display_name = user_doc.to_dict().get("displayName", "Anonymous") if user_doc.exists else "Anonymous"

    proposal_ref = db.collection("proposals").document()
    proposal_ref.set({
        "candidateId": candidate_id,
        "periodId": period_id or "",
        "fieldId": field_id,
        "value": value,
        "citations": citations,
        "authorUid": uid,
        "authorDisplayName": display_name,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "upvoteCount": 0,
        "pinned": False,
        "deletionRequested": False,
    })

    return {"proposalId": proposal_ref.id}


@https_fn.on_call()
def vote_proposal(req: https_fn.CallableRequest) -> dict:
    """Upvote a proposal. Users can upvote 1 proposal per field."""
    uid = _verify_auth(req)
    _check_ban(uid)

    proposal_id = req.data.get("proposalId", "")
    if not proposal_id:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="proposalId is required.",
        )

    proposal_ref = db.collection("proposals").document(proposal_id)
    proposal_doc = proposal_ref.get()
    if not proposal_doc.exists:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.NOT_FOUND,
            message="Proposal not found.",
        )

    proposal_data = proposal_doc.to_dict()
    if proposal_data.get("pinned"):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
            message="Cannot vote on a pinned proposal.",
        )

    field_id = proposal_data["fieldId"]
    candidate_id = proposal_data["candidateId"]
    period_id = proposal_data.get("periodId", "")

    # Check if user already voted on another proposal for this field
    existing_votes = db.collection("proposals")\
        .where(filter=FieldFilter("candidateId", "==", candidate_id))\
        .where(filter=FieldFilter("fieldId", "==", field_id))\
        .where(filter=FieldFilter("periodId", "==", period_id))\
        .get()

    old_proposal_id = None
    for p in existing_votes:
        vote_doc = db.collection("proposals").document(p.id)\
            .collection("votes").document(uid).get()
        if vote_doc.exists:
            if p.id == proposal_id:
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.ALREADY_EXISTS,
                    message="You already voted on this proposal.",
                )
            old_proposal_id = p.id
            # Remove old vote
            db.collection("proposals").document(p.id)\
                .collection("votes").document(uid).delete()
            db.collection("proposals").document(p.id).update({
                "upvoteCount": firestore.Increment(-1)
            })
            break

    # Add new vote
    vote_data = {
        "oderId": uid,
        "votedAt": datetime.now(timezone.utc).isoformat(),
        "voteCountAtTime": proposal_data.get("upvoteCount", 0),
    }
    if old_proposal_id:
        vote_data["proposalSwitchedFrom"] = old_proposal_id

    proposal_ref.collection("votes").document(uid).set(vote_data)
    proposal_ref.update({"upvoteCount": firestore.Increment(1)})

    return {"success": True}


@https_fn.on_call()
def admin_pin_proposal(req: https_fn.CallableRequest) -> dict:
    """Admin: Pin a proposal to the top, locking the field."""
    admin_uid = _verify_admin(req)

    proposal_id = req.data.get("proposalId", "")
    reason = req.data.get("reason", "No reason provided")

    proposal_ref = db.collection("proposals").document(proposal_id)
    proposal_doc = proposal_ref.get()
    if not proposal_doc.exists:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.NOT_FOUND,
            message="Proposal not found.",
        )

    proposal_data = proposal_doc.to_dict()
    now = datetime.now(timezone.utc).isoformat()

    # Pin the proposal
    proposal_ref.update({"pinned": True, "pinnedAt": now})

    # Award 200 points to the poster
    author_uid = proposal_data["authorUid"]
    db.collection("users").document(author_uid).update({
        "credibilityPoints": firestore.Increment(200)
    })

    # Award 150 points to upvoters (minus already earned)
    votes = proposal_ref.collection("votes").get()
    for vote in votes:
        voter_uid = vote.id
        if voter_uid != author_uid:
            db.collection("users").document(voter_uid).update({
                "credibilityPoints": firestore.Increment(150)
            })

    # Audit log
    admin_doc = db.collection("users").document(admin_uid).get()
    admin_name = admin_doc.to_dict().get("displayName", "Admin") if admin_doc.exists else "Admin"

    db.collection("auditLogs").add({
        "adminUid": admin_uid,
        "adminDisplayName": admin_name,
        "action": "pin_proposal",
        "targetProposalId": proposal_id,
        "targetUid": author_uid,
        "reason": reason,
        "timestamp": now,
    })

    return {"success": True}


@https_fn.on_call()
def admin_ban_user(req: https_fn.CallableRequest) -> dict:
    """Admin: Ban a user temporarily or permanently."""
    admin_uid = _verify_admin(req)

    target_uid = req.data.get("targetUid", "")
    permanent = req.data.get("permanent", False)
    duration_days = req.data.get("durationDays", 7)
    reason = req.data.get("reason", "No reason provided")

    if not target_uid:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="targetUid is required.",
        )

    now = datetime.now(timezone.utc)
    ban_data = {"isBanned": True}
    if not permanent:
        ban_data["banExpiry"] = (now + timedelta(days=duration_days)).isoformat()

    db.collection("users").document(target_uid).update(ban_data)

    admin_doc = db.collection("users").document(admin_uid).get()
    admin_name = admin_doc.to_dict().get("displayName", "Admin") if admin_doc.exists else "Admin"

    db.collection("auditLogs").add({
        "adminUid": admin_uid,
        "adminDisplayName": admin_name,
        "action": "ban_user_perm" if permanent else "ban_user_temp",
        "targetUid": target_uid,
        "reason": reason,
        "timestamp": now.isoformat(),
    })

    return {"success": True}


@https_fn.on_call()
def admin_award_points(req: https_fn.CallableRequest) -> dict:
    """Admin: Award or remove credibility points."""
    admin_uid = _verify_admin(req)

    target_uid = req.data.get("targetUid", "")
    points = req.data.get("points", 0)
    reason = req.data.get("reason", "No reason provided")

    if not target_uid or points == 0:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="targetUid and non-zero points are required.",
        )

    db.collection("users").document(target_uid).update({
        "credibilityPoints": firestore.Increment(points)
    })

    admin_doc = db.collection("users").document(admin_uid).get()
    admin_name = admin_doc.to_dict().get("displayName", "Admin") if admin_doc.exists else "Admin"

    db.collection("auditLogs").add({
        "adminUid": admin_uid,
        "adminDisplayName": admin_name,
        "action": "award_points" if points > 0 else "remove_points",
        "targetUid": target_uid,
        "points": points,
        "reason": reason,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return {"success": True}


@scheduler_fn.on_schedule(schedule="every 24 hours")
def daily_credibility_update(event: scheduler_fn.ScheduledEvent) -> None:
    """Daily job: Award credibility points to users with top proposals."""
    now = datetime.now(timezone.utc)

    # Get all non-pinned proposals
    proposals = db.collection("proposals")\
        .where(filter=FieldFilter("pinned", "==", False))\
        .get()

    # Group proposals by (candidateId, periodId, fieldId)
    field_groups: dict[str, list] = {}
    for p in proposals:
        data = p.to_dict()
        key = f"{data['candidateId']}|{data.get('periodId', '')}|{data['fieldId']}"
        if key not in field_groups:
            field_groups[key] = []
        field_groups[key].append({"id": p.id, **data})

    for key, group in field_groups.items():
        # Sort by upvoteCount desc, then createdAt asc (account age tiebreaker)
        group.sort(key=lambda x: (-x.get("upvoteCount", 0), x.get("createdAt", "")))

        top = group[0]
        combined_points = 0

        # Check if top proposal has >= 500 combined credibility from upvoters
        votes = db.collection("proposals").document(top["id"])\
            .collection("votes").get()

        for vote in votes:
            voter_uid = vote.id
            voter_points = _get_user_points(voter_uid)
            combined_points += voter_points

        if combined_points < 500:
            continue

        # Award points to the poster
        poster_uid = top["authorUid"]
        poster_x = CredibilityCalculator.calculate_daily_points(0, True)
        db.collection("users").document(poster_uid).update({
            "credibilityPoints": firestore.Increment(poster_x)
        })

        # Award points to voters
        for vote in votes:
            vote_data = vote.to_dict()
            if not CredibilityCalculator.can_earn_points(vote_data.get("votedAt", "")):
                continue
            voter_uid = vote.id
            vote_count = vote_data.get("voteCountAtTime", 0)
            x = CredibilityCalculator.calculate_daily_points(vote_count, False)
            if x > 0:
                db.collection("users").document(voter_uid).update({
                    "credibilityPoints": firestore.Increment(x)
                })


@https_fn.on_call()
def search_candidates_fn(req: https_fn.CallableRequest) -> dict:
    """Search candidates in the database by name."""
    query = req.data.get("query", "").strip().lower()
    if not query or len(query) < 2:
        return {"candidates": []}

    # Simple prefix search on name
    candidates = db.collection("candidates")\
        .order_by("name")\
        .start_at({"name": query.title()})\
        .end_at({"name": query.title() + "\uf8ff"})\
        .limit(20)\
        .get()

    results = []
    for c in candidates:
        data = c.to_dict()
        results.append({
            "id": c.id,
            "name": data.get("name", ""),
            "photoUrl": data.get("photoUrl", ""),
            "status": data.get("status", "unknown"),
        })

    return {"candidates": results}


@https_fn.on_call()
def submit_badge_proposal(req: https_fn.CallableRequest) -> dict:
    """Submit a badge status proposal for a candidate.
    Requires at least one citation (e.g., a video clip of the pledge).
    Valid statuses: 'pledged', 'denied', 'unkept'.
    Costs 10 credibility points.
    """
    uid = _verify_auth(req)
    _check_ban(uid)

    candidate_id = req.data.get("candidateId", "")
    badge_id = req.data.get("badgeId", "")
    status = req.data.get("status", "")
    citations = req.data.get("citations", [])

    if not all([candidate_id, badge_id, status]):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="candidateId, badgeId, and status are required.",
        )

    if status not in ("pledged", "denied", "unkept"):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="status must be 'pledged', 'denied', or 'unkept'.",
        )

    # Citations are required for badge proposals
    valid_citations = [c for c in citations if c.get("url", "").strip()]
    if not valid_citations:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="At least one citation with a URL is required for badge proposals (e.g., a video clip of the pledge).",
        )

    points = _get_user_points(uid)
    if points < 10:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message=f"You need 10 credibility points. You have {points}.",
        )

    # Deduct points
    db.collection("users").document(uid).update({
        "credibilityPoints": firestore.Increment(-10)
    })

    # Get author display name
    user_doc = db.collection("users").document(uid).get()
    display_name = user_doc.to_dict().get("displayName", "Anonymous") if user_doc.exists else "Anonymous"

    # Badge proposals use the same proposals collection with fieldId = "badge_{badgeId}"
    field_id = f"badge_{badge_id}"
    proposal_ref = db.collection("proposals").document()
    proposal_ref.set({
        "candidateId": candidate_id,
        "periodId": "",
        "fieldId": field_id,
        "value": status,
        "citations": valid_citations,
        "authorUid": uid,
        "authorDisplayName": display_name,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "upvoteCount": 0,
        "pinned": False,
        "deletionRequested": False,
    })

    return {"proposalId": proposal_ref.id}


@https_fn.on_call()
def get_badge_proposals(req: https_fn.CallableRequest) -> dict:
    """Get all proposals for a specific badge on a candidate."""
    candidate_id = req.data.get("candidateId", "")
    badge_id = req.data.get("badgeId", "")

    if not all([candidate_id, badge_id]):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="candidateId and badgeId are required.",
        )

    field_id = f"badge_{badge_id}"
    proposals = db.collection("proposals")\
        .where(filter=FieldFilter("candidateId", "==", candidate_id))\
        .where(filter=FieldFilter("fieldId", "==", field_id))\
        .order_by("upvoteCount", direction="DESCENDING")\
        .get()

    results = []
    for p in proposals:
        data = p.to_dict()
        results.append({
            "id": p.id,
            "value": data.get("value", ""),
            "citations": data.get("citations", []),
            "authorDisplayName": data.get("authorDisplayName", ""),
            "authorUid": data.get("authorUid", ""),
            "createdAt": data.get("createdAt", ""),
            "upvoteCount": data.get("upvoteCount", 0),
            "pinned": data.get("pinned", False),
        })

    return {"proposals": results}