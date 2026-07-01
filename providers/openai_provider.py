"""
OpenAI Provider Implementation with anti-deprecation fallback
"""

from .base_provider import BaseAIProvider, AICapability, ProviderHealth, AIResult
from typing import Dict, Any
import requests


class OpenAIProvider(BaseAIProvider):
    """OpenAI provider with model fallback for deprecation resilience"""
    
    PROVIDER_NAME = "openai"  # Identity constant
    BASE_URL = "https://api.openai.com/v1"
    
    # Models in priority order (cheapest first, fallback to more expensive)
    MODELS = [
        'gpt-4o-mini',      # Current cheapest
        'gpt-3.5-turbo',    # Fallback 1
        'gpt-4o',           # Fallback 2 (more expensive)
        'gpt-4-turbo'       # Fallback 3 (legacy)
    ]
    
    def _get_auth_headers(self) -> Dict[str, str]:
        return {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.api_key}'
        }
    
    def health_check(self) -> ProviderHealth:
        """Verify with GET /v1/models (cheap, fast)"""
        try:
            response = self.session.get(f"{self.BASE_URL}/models", timeout=10)
            
            if response.status_code == 200:
                return ProviderHealth(
                    is_valid=True,
                    provider='openai',
                    capabilities=[AICapability.CHAT, AICapability.STREAMING, 
                                  AICapability.VISION, AICapability.TOOLS]
                )
            else:
                return ProviderHealth(
                    is_valid=False,
                    provider='openai',
                    capabilities=[],
                    error_message=f'HTTP {response.status_code}'
                )
        except Exception as e:
            return ProviderHealth(
                is_valid=False,
                provider='openai',
                capabilities=[],
                error_message=str(e)
            )
    
    def chat(self, message: str, **kwargs) -> AIResult:
        """Try models in order until one works (anti-deprecation)"""
        for model in self.MODELS:
            try:
                response = self.session.post(
                    f"{self.BASE_URL}/chat/completions",
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": message}]
                    },
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return AIResult(
                        success=True,
                        response=result['choices'][0]['message']['content'],
                        provider='openai',
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
        
        return AIResult(
            success=False,
            error='All OpenAI models unavailable',
            error_code='all_models_failed',
            retryable=False,
            provider='openai'
        )
    
    def supports_feature(self, capability: AICapability) -> bool:
        return True  # OpenAI supports all current capabilities
