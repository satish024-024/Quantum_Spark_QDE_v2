"""
Anthropic Claude Provider Implementation
Note: Health check uses minimal chat API call (no /models endpoint available)
"""

from .base_provider import BaseAIProvider, AICapability, ProviderHealth, AIResult
from typing import Dict, Any


class ClaudeProvider(BaseAIProvider):
    """Anthropic Claude provider with rate-limit handling"""
    
    PROVIDER_NAME = "claude"  # Identity constant
    BASE_URL = "https://api.anthropic.com/v1"
    API_VERSION = "2023-06-01"
    
    def _get_auth_headers(self) -> Dict[str, str]:
        return {
            'Content-Type': 'application/json',
            'x-api-key': self.api_key,
            'anthropic-version': self.API_VERSION
        }
    
    def health_check(self) -> ProviderHealth:
        """
        Claude doesn't have /models endpoint
        Use minimal chat test (minimal tokens - will be cached)
        """
        try:
            response = self.session.post(
                f"{self.BASE_URL}/messages",
                json={
                    "model": "claude-3-haiku-20240307",  # Cheapest model
                    "max_tokens": 10,  # Minimal tokens
                    "messages": [{"role": "user", "content": "hi"}]
                },
                timeout=10
            )
            
            if response.status_code == 200:
                return ProviderHealth(
                    is_valid=True,
                    provider='claude',
                    capabilities=[AICapability.CHAT, AICapability.VISION]
                )
            elif response.status_code == 401:
                return ProviderHealth(
                    is_valid=False,
                    provider='claude',
                    capabilities=[],
                    error_message='Invalid API key'
                )
            else:
                return ProviderHealth(
                    is_valid=False,
                    provider='claude',
                    capabilities=[],
                    error_message=f'HTTP {response.status_code}'
                )
        except Exception as e:
            return ProviderHealth(
                is_valid=False,
                provider='claude',
                capabilities=[],
                error_message=str(e)
            )
    
    def chat(self, message: str, **kwargs) -> AIResult:
        """Generate chat response with Claude"""
        try:
            response = self.session.post(
                f"{self.BASE_URL}/messages",
                json={
                    "model": "claude-3-5-sonnet-20241022",
                    "max_tokens": 2048,
                    "messages": [{"role": "user", "content": message}]
                },
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Defensive parsing - handle empty content, tool calls, structured blocks
                content = result.get('content', [])
                if not content:
                    return AIResult(
                        success=False,
                        error='Empty response from Claude',
                        error_code='parse_error',
                        retryable=False,
                        provider='claude'
                    )
                
                # Get first text block (skip tool calls)
                text_content = None
                for block in content:
                    if block.get('type') == 'text' and 'text' in block:
                        text_content = block['text']
                        break
                
                if not text_content:
                    return AIResult(
                        success=False,
                        error='No text content in Claude response',
                        error_code='parse_error',
                        retryable=False,
                        provider='claude'
                    )
                
                return AIResult(
                    success=True,
                    response=text_content,
                    provider='claude',
                    model='claude-3-5-sonnet'
                )
            else:
                response.raise_for_status()
                
        except Exception as e:
            return self._standardize_error(e)
    
    def supports_feature(self, capability: AICapability) -> bool:
        return capability in [AICapability.CHAT, AICapability.VISION]
