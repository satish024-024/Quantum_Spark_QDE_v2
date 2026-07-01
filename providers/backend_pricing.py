"""
Backend Pricing - Semi-static estimated costs.
Updated when providers change pricing.

IMPORTANT: All costs are ESTIMATES.
Actual billing is determined by the provider at execution time.
"""

from dataclasses import dataclass
from typing import Optional, Dict
from datetime import date
from enum import Enum


class BillingTier(Enum):
    FREE = "free"
    FREE_TIER_ELIGIBLE = "free_tier_eligible"  # May incur charges after limits
    PAID = "paid"


@dataclass
class PricingPolicy:
    """
    Pricing policy for a backend.
    All costs are ESTIMATES - actual billing determined by provider.
    """
    tier: BillingTier
    estimated_per_shot: float = 0.0
    estimated_per_task: float = 0.0
    estimated_per_minute: float = 0.0
    estimated_minimum: float = 0.0
    currency: str = "USD"
    effective_date: date = date(2025, 1, 1)
    version: str = "2025.01"  # For audit trail
    notes: Optional[str] = None
    
    def estimate_cost(self, shots: int, minutes: float = 0) -> float:
        """
        Calculate ESTIMATED cost. Not a guarantee.
        Actual cost determined by provider at execution time.
        """
        raw = (
            self.estimated_per_task + 
            (shots * self.estimated_per_shot) + 
            (minutes * self.estimated_per_minute)
        )
        return max(raw, self.estimated_minimum)
    
    def get_display(self) -> str:
        """Human-readable cost string with ~ to indicate estimate"""
        if self.tier == BillingTier.FREE:
            return "FREE"
        if self.tier == BillingTier.FREE_TIER_ELIGIBLE:
            return f"FREE TIER* ({self.notes or 'limits apply'})"
        
        parts = []
        if self.estimated_per_task > 0:
            parts.append(f"~${self.estimated_per_task:.2f}/task")
        if self.estimated_per_shot > 0:
            # Format based on magnitude
            if self.estimated_per_shot >= 0.01:
                parts.append(f"~${self.estimated_per_shot:.2f}/shot")
            else:
                parts.append(f"~${self.estimated_per_shot:.4f}/shot")
        if self.estimated_per_minute > 0:
            parts.append(f"~${self.estimated_per_minute:.3f}/min")
        if self.estimated_minimum > 0:
            parts.append(f"min ~${self.estimated_minimum:.2f}")
        
        return " + ".join(parts) if parts else "Contact provider"
    
    def to_dict(self) -> Dict:
        """Serialize for API responses"""
        return {
            "tier": self.tier.value,
            "estimated_per_shot": self.estimated_per_shot,
            "estimated_per_task": self.estimated_per_task,
            "estimated_per_minute": self.estimated_per_minute,
            "estimated_minimum": self.estimated_minimum,
            "currency": self.currency,
            "display": self.get_display(),
            "effective_date": self.effective_date.isoformat(),
            "version": self.version,
            "notes": self.notes
        }


# =============================================================================
# PRICING POLICIES - Keyed by canonical_id
# Updated when provider pricing changes
# =============================================================================

PRICING_POLICIES: Dict[str, PricingPolicy] = {
    
    # =========================================================================
    # IBM - Free under Open Plan (with limits)
    # =========================================================================
    "ibm_simulator": PricingPolicy(
        tier=BillingTier.FREE,
        notes="Unlimited local simulation"
    ),
    "ibm_brisbane": PricingPolicy(
        tier=BillingTier.FREE,
        notes="Open Plan: 10 min/month free. Queue times vary."
    ),
    "ibm_kyoto": PricingPolicy(
        tier=BillingTier.FREE,
        notes="Open Plan: 10 min/month free. Queue times vary."
    ),
    "ibm_osaka": PricingPolicy(
        tier=BillingTier.FREE,
        notes="Open Plan: 10 min/month free. Queue times vary."
    ),
    
    # =========================================================================
    # IONQ
    # =========================================================================
    "ionq_simulator": PricingPolicy(
        tier=BillingTier.FREE,
        notes="Cloud simulator, always free"
    ),
    "ionq_harmony": PricingPolicy(
        tier=BillingTier.PAID,
        estimated_per_shot=0.01,
        estimated_minimum=1.00,
        effective_date=date(2025, 1, 1),
        notes="Entry-level QPU. Prices vary by contract."
    ),
    "ionq_aria": PricingPolicy(
        tier=BillingTier.PAID,
        estimated_per_shot=0.03,
        estimated_minimum=12.42,
        effective_date=date(2025, 1, 1),
        notes="Min $12.42 with error mitigation. Prices vary."
    ),
    
    # =========================================================================
    # RIGETTI
    # =========================================================================
    "rigetti_qvm": PricingPolicy(
        tier=BillingTier.FREE,
        notes="QVM simulator, always free"
    ),
    "rigetti_ankaa2": PricingPolicy(
        tier=BillingTier.PAID,
        estimated_per_shot=0.0009,
        estimated_per_task=0.30,
        effective_date=date(2025, 1, 1),
        notes="Via AWS Braket. 1000 shots ≈ $1.20"
    ),
    "rigetti_ankaa3": PricingPolicy(
        tier=BillingTier.PAID,
        estimated_per_shot=0.0009,
        estimated_per_task=0.30,
        effective_date=date(2025, 1, 1),
        notes="Latest QPU. Via AWS Braket."
    ),
    
    # =========================================================================
    # AWS BRAKET SIMULATORS
    # =========================================================================
    "aws_sv1": PricingPolicy(
        tier=BillingTier.FREE_TIER_ELIGIBLE,
        estimated_per_minute=0.075,
        effective_date=date(2025, 1, 1),
        notes="1 free hour/month. Then $0.075/min."
    ),
    "aws_tn1": PricingPolicy(
        tier=BillingTier.FREE_TIER_ELIGIBLE,
        estimated_per_minute=0.275,
        effective_date=date(2025, 1, 1),
        notes="1 free hour/month. Then $0.275/min."
    ),
    "aws_dm1": PricingPolicy(
        tier=BillingTier.FREE_TIER_ELIGIBLE,
        estimated_per_minute=0.075,
        effective_date=date(2025, 1, 1),
        notes="1 free hour/month. Then $0.075/min."
    ),
    
    # =========================================================================
    # AWS BRAKET QPUs
    # =========================================================================
    "aws_ionq_aria": PricingPolicy(
        tier=BillingTier.PAID,
        estimated_per_shot=0.03,
        estimated_per_task=0.30,
        effective_date=date(2025, 1, 1),
        notes="IonQ via Braket. Min 100 shots."
    ),
    "aws_rigetti_ankaa": PricingPolicy(
        tier=BillingTier.PAID,
        estimated_per_shot=0.0009,
        estimated_per_task=0.30,
        effective_date=date(2025, 1, 1),
        notes="Rigetti via Braket."
    ),
}

# Default pricing for unknown backends
_DEFAULT_PRICING = PricingPolicy(
    tier=BillingTier.FREE,
    notes="Unknown backend - assuming free (contact provider)"
)


def get_pricing(canonical_id: str) -> PricingPolicy:
    """
    Get pricing policy by canonical ID.
    Returns default (free) if unknown - logs warning.
    """
    policy = PRICING_POLICIES.get(canonical_id)
    if policy is None:
        import logging
        logging.warning(f"No pricing policy for '{canonical_id}' - using default FREE")
        return _DEFAULT_PRICING
    return policy


def estimate_job_cost(canonical_id: str, shots: int, minutes: float = 0) -> Dict:
    """
    Calculate estimated cost for a job.
    Returns dict with cost details for UI/API.
    """
    policy = get_pricing(canonical_id)
    estimated = policy.estimate_cost(shots, minutes)
    
    return {
        "canonical_id": canonical_id,
        "tier": policy.tier.value,
        "is_free": policy.tier == BillingTier.FREE,
        "is_free_tier": policy.tier == BillingTier.FREE_TIER_ELIGIBLE,
        "estimated_cost": round(estimated, 4),
        "currency": policy.currency,
        "display": policy.get_display(),
        "breakdown": _build_breakdown(policy, shots, minutes, estimated),
        "notes": policy.notes,
        "pricing_version": policy.version,
        "effective_date": policy.effective_date.isoformat()
    }


def _build_breakdown(policy: PricingPolicy, shots: int, minutes: float, total: float) -> str:
    """Build human-readable cost breakdown"""
    if policy.tier == BillingTier.FREE:
        return "FREE - No charge"
    
    parts = []
    if policy.estimated_per_task > 0:
        parts.append(f"Task: ${policy.estimated_per_task:.2f}")
    if policy.estimated_per_shot > 0:
        shot_cost = shots * policy.estimated_per_shot
        parts.append(f"{shots} shots × ${policy.estimated_per_shot:.4f} = ${shot_cost:.4f}")
    if policy.estimated_per_minute > 0 and minutes > 0:
        min_cost = minutes * policy.estimated_per_minute
        parts.append(f"{minutes:.1f} min × ${policy.estimated_per_minute:.3f} = ${min_cost:.2f}")
    
    breakdown = " + ".join(parts)
    
    if policy.estimated_minimum > 0 and total == policy.estimated_minimum:
        breakdown += f" (minimum ${policy.estimated_minimum:.2f} applied)"
    
    return f"{breakdown} = ~${total:.2f}"
