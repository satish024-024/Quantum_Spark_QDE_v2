"""
Base Abstract Provider Interface for Universal AI System
Forces consistent interface across all AI providers
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import requests


class AICapability(Enum):
    """Supported AI capabilities"""
    CHAT = "chat"
    STREAMING = "streaming"
    VISION = "vision"
    TOOLS = "tools"
    EMBEDDINGS = "embeddings"


@dataclass
class ProviderHealth:
    """Health check result"""
    is_valid: bool
    provider: str
    capabilities: List[AICapability]
    error_message: Optional[str] = None
    rate_limit_remaining: Optional[int] = None


@dataclass
class AIResult:
    """Standardized result for all AI operations - no exceptions thrown"""
    success: bool
    response: Optional[str] = None
    error: Optional[str] = None
    error_code: Optional[str] = None  # 'timeout', 'rate_limit', 'invalid_key', 'network'
    retryable: bool = False
    retry_after: Optional[int] = None
    provider: Optional[str] = None
    model: Optional[str] = None


class BaseAIProvider(ABC):
    """
    Abstract base class for all AI providers
    Enforces consistent interface and error handling
    """
    
    # Provider identity - DO NOT derive from class name
    PROVIDER_NAME = "base"  # Override in subclasses
    
    def __init__(self, api_key: str, timeout: int = 30):
        self.api_key = api_key
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(self._get_auth_headers())
    
    @abstractmethod
    def _get_auth_headers(self) -> Dict[str, str]:
        """Each provider has different auth headers"""
        pass
    
    @abstractmethod
    def health_check(self) -> ProviderHealth:
        """Lightweight verification that key is valid AND working"""
        pass
    
    @abstractmethod
    def chat(self, message: str, **kwargs) -> AIResult:
        """Unified chat interface - all providers must implement"""
        pass
    
    @abstractmethod
    def supports_feature(self, capability: AICapability) -> bool:
        """Check if provider supports specific features"""
        pass
    
    def close(self):
        """Release HTTP resources - CRITICAL for production"""
        if self.session:
            self.session.close()
    
    def _standardize_error(self, e: Exception) -> AIResult:
        """
        "Convert exceptions to structured results
        Never throw - always return AIResult
        """
        provider_name = self.PROVIDER_NAME  # Use constant, not class name inference
        
        if isinstance(e, requests.exceptions.Timeout):
            return AIResult(
                success=False,
                error='Request timeout',
                error_code='timeout',
                retryable=True,
                provider=provider_name
            )
        elif isinstance(e, requests.exceptions.ConnectionError):
            return AIResult(
                success=False,
                error='Network connection failed',
                error_code='network',
                retryable=True,
                provider=provider_name
            )
        elif hasattr(e, 'response') and e.response is not None:
            status = e.response.status_code
            if status == 429:
                retry_after = int(e.response.headers.get('Retry-After', 60))
                return AIResult(
                    success=False,
                    error=f'Rate limited',
                    error_code='rate_limit',
                    retryable=True,
                    retry_after=retry_after,
                    provider=provider_name
                )
            elif status == 401:
                return AIResult(
                    success=False,
                    error='Invalid API key',
                    error_code='invalid_key',
                    retryable=False,
                    provider=provider_name
                )
            else:
                return AIResult(
                    success=False,
                    error=f'HTTP {status}',
                    error_code='http_error',
                    retryable=False,
                    provider=provider_name
                )
        else:
            return AIResult(
                success=False,
                error=str(e),
                error_code='unknown',
                retryable=False,
                provider=provider_name
            )
