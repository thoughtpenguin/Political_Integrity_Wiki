import datetime

# Centralized Point Constants
NEW_USER_POINTS = 100
CREATE_CANDIDATE_COST = 1000
ADD_PERIOD_MANUAL_COST = 1000
SUBMIT_PROPOSAL_COST = 10
SUBMIT_BADGE_PROPOSAL_COST = 10
PIN_PROPOSAL_AUTHOR_REWARD = 200
PIN_PROPOSAL_UPVOTER_REWARD = 150
REPORT_PERIOD_COST = 200
REPORT_PERIOD_APPROVE_REWARD = 400
REPORT_PROPOSAL_COST = 5
REPORT_PROPOSAL_APPROVE_REWARD = 15
MIN_UPVOTER_COMBINED_POINTS = 500
VOTE_AGE_DAYS_FOR_DAILY_POINTS = 3
DAILY_POINTS_CAP = 50

def calculate_daily_points(vote_count_at_time_of_vote: int, is_original_poster: bool) -> int:
    """
    Calculate the daily credibility points a user earns for being
    associated with the current top proposal.
    
    The formula: X = round(max(0, 5 - (k/10) + p))
    where:
      k = number of votes the proposal had when you upvoted it
      p = 5 if you're the original poster, else 0
    """
    p = 5 if is_original_poster else 0
    k = vote_count_at_time_of_vote
    x = round(max(0, 5 - (k / 10) + p))
    return min(x, DAILY_POINTS_CAP)

def can_earn_points(vote_timestamp_iso: str) -> bool:
    """
    Check if enough days have passed since the vote was cast,
    which is required before points start accruing.
    """
    from datetime import datetime, timezone, timedelta
    vote_time = datetime.fromisoformat(vote_timestamp_iso)
    return datetime.now(timezone.utc) >= vote_time + timedelta(days=VOTE_AGE_DAYS_FOR_DAILY_POINTS)
