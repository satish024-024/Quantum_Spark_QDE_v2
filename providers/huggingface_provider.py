"""
Hugging Face Provider Implementation
REALITY CHECK: Restricted to approved chat models only
Most HF models don't support universal chat endpoints
"""

from .base_provider import BaseAIProvider, AICapability, ProviderHealth, AIResult
from typing import Dict, Any, Optional


class HuggingFaceProvider(BaseAIProvider):
    """
    HuggingFace Inference API provider
    LIMITED: Only approved models with text-generation support
    """
    
    PROVIDER_NAME = "huggingface"  # Identity constant
    BASE_URL = "https://api-inference.huggingface.co"
    
    # Approved models that ACTUALLY work for chat
    APPROVED_MODELS = [
        "mistralai/Mixtral-8x7B-Instruct-v0.1",
        "meta-llama/Llama-3.1-8B-Instruct",
        "microsoft/Phi-3-mini-4k-instruct"
    ]
    
    def __init__(self, api_key: str, timeout: int = 30, model: str = None):
        super().__init__(api_key, timeout)
        self.model = model or self.APPROVED_MODELS[0]
        if self.model not in self.APPROVED_MODELS:
            raise ValueError(f"Model {self.model} not in approved list")
    
    def _get_auth_headers(self) -> Dict[str, str]:
        return {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.api_key}'
        }
    
    def health_check(self) -> ProviderHealth:
        """Verify with /whoami-v2 (correct endpoint)"""
        try:
            response = self.session.get(
                f"{self.BASE_URL}/whoami-v2",
                timeout=10
            )
            
            if response.status_code == 200:
                return ProviderHealth(
                    is_valid=True,
                    provider='huggingface',
                    capabilities=[AICapability.CHAT]  # Limited
                )
            else:
                return ProviderHealth(
                    is_valid=False,
                    provider='huggingface',
                    capabilities=[],
                    error_message=f'HTTP {response.status_code}'
                )
        except Exception as e:
            return ProviderHealth(
                is_valid=False,
                provider='huggingface',
                capabilities=[],
                error_message=str(e)
            )
    
    def _extract_text_safely(self, response_data) -> Optional[str]:
        """
        Defensively extract generated text from HF response
        HF responses vary wildly by model
        """
        try:
            # Case 1: List of dicts with generated_text
            if isinstance(response_data, list) and len(response_data) > 0:
                if 'generated_text' in response_data[0]:
                    text = response_data[0]['generated_text']
                    return self._strip_prompt(text)
            
            # Case 2: Direct dict
            if isinstance(response_data, dict) and 'generated_text' in response_data:
                return self._strip_prompt(response_data['generated_text'])
            
            # Case 3: Nested in output key
            if isinstance(response_data, dict) and 'output' in response_data:
                return self._strip_prompt(response_data['output'])
            
            return None
        except Exception:
            return None
    
    def _strip_prompt(self, text: str) -> str:
        """Remove echoed prompt from HF responses"""
        # Many HF models echo the prompt - remove it
        if len(text) > 500:
            for sep in ['\n\nAssistant:', '\n\nResponse:', '\n\n', '\n']:
                if sep in text:
                    parts = text.split(sep, 1)
                    if len(parts) > 1:
                        return parts[1].strip()
        return text.strip()
    
    def chat(self, message: str, **kwargs) -> AIResult:
        """Use text-generation endpoint (not /chat/completions)"""
        try:
            response = self.session.post(
                f"{self.BASE_URL}/models/{self.model}",
                json={
                    "inputs": message,
                    "parameters": {
                        "max_new_tokens": 512,
                        "temperature": 0.7,
                        "return_full_text": False  # Don't echo prompt
                    }
                },
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                text = self._extract_text_safely(result)
                
                if text:
                    return AIResult(
                        success=True,
                        response=text,
                        provider='huggingface',
                        model=self.model
                    )
                else:
                    return AIResult(
                        success=False,
                        error='Failed to parse HF response',
                        error_code='parse_error',
                        retryable=False,
                        provider='huggingface'
                    )
            else:
                response.raise_for_status()
                
        except Exception as e:
            return self._standardize_error(e)
    
    def supports_feature(self, capability: AICapability) -> bool:
        return capability == AICapability.CHAT  # HF inference is limited
