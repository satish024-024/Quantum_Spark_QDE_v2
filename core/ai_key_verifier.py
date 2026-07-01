"""
AI Key Verifier - Two-step verification system
Step 1: Heuristic detection (regex) - TENTATIVE
Step 2: Health check (API call) - VERIFIED
"""

import re
from typing import Optional, Tuple
from providers.base_provider import ProviderHealth
from providers.gemini_provider import GeminiProvider
from providers.openai_provider import OpenAIProvider
from providers.claude_provider import ClaudeProvider
from providers.huggingface_provider import HuggingFaceProvider
from verification_cache import get_verification_cache


class AIKeyVerifier:
    """
    Two-step verification: heuristic → health check
    Uses caching to prevent expensive re-verification
    """
    
    # Regex patterns for TENTATIVE detection only
    PATTERNS = {
        'gemini': re.compile(r'^AIza[0-9A-Za-z_-]{35}$'),
        'claude': re.compile(r'^sk-ant-api03-[A-Za-z0-9_-]{32,}$'),
        'openai': re.compile(r'^sk-[a-zA-Z0-9]{32,}$'),
        'huggingface': re.compile(r'^hf_[a-zA-Z0-9]{26,}$')
    }
    
    def detect_provider_heuristic(self, api_key: str) -> Optional[str]:
        """
        Step 1: Heuristic detection - TENTATIVE only
        This is best-effort, NOT truth
        """
        for provider, pattern in self.PATTERNS.items():
            if pattern.match(api_key):
                return provider
        return None
    
    def verify_key(self, api_key: str, provider: str = None, force: bool = False) -> Tuple[bool, str, Optional[ProviderHealth]]:
        """
        Step 2: Real verification via health check
        
        Args:
            api_key: API key to verify
            provider: Optional provider hint
            force: Skip cache (user-requested re-verify)
        
        Returns: (is_valid, provider_name, health_details)
        """
        cache = get_verification_cache()
        
        # Check cache first (unless forced)
        if not force:
            cached_health = cache.get(api_key)
            if cached_health:
                return (cached_health.is_valid, cached_health.provider, cached_health)
        
        # Step 1: Heuristic detection if provider not specified
        if not provider:
            provider = self.detect_provider_heuristic(api_key)
            if not provider:
                return (False, None, None)
        
        # Step 2: Get actual provider instance and health check
        provider_class = self._get_provider_class(provider)
        if not provider_class:
            return (False, provider, None)
        
        try:
            provider_instance = provider_class(api_key)
            health = provider_instance.health_check()
            
            # Cache result (success or failure) to prevent retry storms
            cache.set(api_key, health)
            
            return (health.is_valid, provider, health)
        except Exception as e:
            error_health = ProviderHealth(
                is_valid=False,
                provider=provider,
                capabilities=[],
                error_message=str(e)
            )
            # Cache failures too
            cache.set(api_key, error_health)
            return (False, provider, error_health)
    
    def _get_provider_class(self, provider: str):
        """Map provider name to class"""
        mapping = {
            'gemini': GeminiProvider,
            'openai': OpenAIProvider,
            'claude': ClaudeProvider,
            'huggingface': HuggingFaceProvider
        }
        return mapping.get(provider)
