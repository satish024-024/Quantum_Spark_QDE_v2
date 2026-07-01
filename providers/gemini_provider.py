"""
Google Gemini AI Provider Implementation
"""

from .base_provider import BaseAIProvider, AICapability, ProviderHealth, AIResult
from typing import Dict, Any


class GeminiProvider(BaseAIProvider):
    """Google Gemini AI provider with multi-model fallback"""
    
    PROVIDER_NAME = "gemini"  # Identity constant
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
    
    # Models in priority order (PRODUCTION first, experimental LAST)
    MODELS = [
        'gemini-2.0-flash',      # Latest stable (2026)
        'gemini-1.5-flash',      # Production stable fallback
        'gemini-1.5-pro',        # Production advanced fallback
        'gemini-3.0-flash-exp'   # Newest experimental
    ]
    
    def _get_auth_headers(self) -> Dict[str, str]:
        return {
            'Content-Type': 'application/json',
            'X-goog-api-key': self.api_key
        }
    
    def health_check(self) -> ProviderHealth:
        """Verify key with cheap models.list call"""
        try:
            response = self.session.get(
                f"{self.BASE_URL}/models",
                timeout=10  # Health checks should be fast
            )
            
            if response.status_code == 200:
                return ProviderHealth(
                    is_valid=True,
                    provider='gemini',
                    capabilities=[AICapability.CHAT, AICapability.VISION]
                )
            elif response.status_code == 401:
                return ProviderHealth(
                    is_valid=False,
                    provider='gemini',
                    capabilities=[],
                    error_message='Invalid API key'
                )
            else:
                return ProviderHealth(
                    is_valid=False,
                    provider='gemini',
                    capabilities=[],
                    error_message=f'HTTP {response.status_code}'
                )
        except Exception as e:
            return ProviderHealth(
                is_valid=False,
                provider='gemini',
                capabilities=[],
                error_message=str(e)
            )
    
    def chat(self, message: str, **kwargs) -> AIResult:
        """
        Generate chat response with model fallback
        Tries models in order until one succeeds
        """
        for model in self.MODELS:
            try:
                url = f"{self.BASE_URL}/models/{model}:generateContent"
                payload = {
                    "contents": [{
                        "parts": [{"text": message}]
                    }]
                }
                
                response = self.session.post(url, json=payload, timeout=self.timeout)
                
                if response.status_code == 200:
                    result = response.json()
                    
                    # Defensive parsing - handle safety blocks and edge cases
                    candidates = result.get('candidates', [])
                    if not candidates:
                        # Safety block or empty response - try next model
                        continue
                    
                    content = candidates[0].get('content', {})
                    parts = content.get('parts', [])
                    if not parts or 'text' not in parts[0]:
                        # Missing text field - try next model
                        continue
                    
                    text = parts[0]['text']
                    return AIResult(
                        success=True,
                        response=text,
                        provider='gemini',
                        model=model
                    )
                elif response.status_code == 404:
                    # Model deprecated/renamed - try next
                    continue
                else:
                    # Other error - raise to trigger error handling
                    response.raise_for_status()
                    
            except Exception as e:
                # If last model, return error
                if model == self.MODELS[-1]:
                    return self._standardize_error(e)
                # Otherwise try next model
                continue
        
        # All models exhausted
        return AIResult(
            success=False,
            error='All Gemini models failed',
            error_code='all_models_failed',
            retryable=False,
            provider='gemini'
        )
    
    def supports_feature(self, capability: AICapability) -> bool:
        return capability in [AICapability.CHAT, AICapability.VISION]
