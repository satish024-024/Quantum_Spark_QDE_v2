"""
Universal AI Service - Clean router (NOT god class)
Delegates to provider instances, returns structured results only
"""

import os
from typing import Optional, List
from providers.base_provider import AIResult, AICapability
from ai_key_verifier import AIKeyVerifier


class UniversalAIService:
    """
    Lightweight router - delegates to provider instances
    Does NOT contain provider logic
    Never throws on init - returns structured error states instead
    """
    
    def __init__(self, api_key: str = None, provider: str = 'auto'):
        self.verifier = AIKeyVerifier()
        self.api_key = api_key or os.getenv('AI_API_KEY')
        self.error = None
        self.health = None
        self.provider = None
        self.provider_instance = None
        
        if not self.api_key:
            self.error = "No API key provided"
            return
        
        # Verification with cache
        if provider == 'auto':
            is_valid, detected_provider, health = self.verifier.verify_key(self.api_key)
        else:
            is_valid, detected_provider, health = self.verifier.verify_key(self.api_key, provider)
        
        if is_valid:
            self.provider = detected_provider
            self.health = health
            try:
                self.provider_instance = self._get_provider_instance()
            except Exception as e:
                self.error = f"Provider initialization failed: {str(e)}"
                self.provider_instance = None
        else:
            self.error = health.error_message if health else "Verification failed"
            self.provider = detected_provider
            self.provider_instance = None
    
    def is_ready(self) -> bool:
        """Check if service initialized successfully"""
        return self.provider_instance is not None and self.error is None
    
    def chat(self, message: str) -> AIResult:
        """Route to provider or return initialization error"""
        if not self.is_ready():
            return AIResult(
                success=False,
                error=self.error or "Service not initialized",
                error_code='not_initialized',
                retryable=False
            )
        
        # Execute request and ensure session cleanup
        try:
            return self.provider_instance.chat(message)
        finally:
            # CRITICAL: Release HTTP resources to prevent socket leaks
            self.provider_instance.close()
    
    def get_capabilities(self) -> List[AICapability]:
        """Return what this provider supports"""
        return self.health.capabilities if self.health else []
    
    def _get_provider_instance(self):
        """Factory - can still throw, but caught in __init__"""
        provider_class = self.verifier._get_provider_class(self.provider)
        return provider_class(self.api_key)
