"""
Execution Orchestrator - Production-Grade Multi-Provider Coordinator

Responsibilities:
1. Validate execution requests (fail fast)
2. Compile circuits via CircuitCompiler
3. Route to correct provider
4. Enforce JobNormalizer v1 contract compliance
5. Provide observability for production debugging

Design Principles:
- Fail-closed: Explicit validation, no inference
- Contract enforcement: Every provider MUST return v1 schema
- Idempotent: Safe to retry
- Observable: Logged for production debugging
- Defensive: Validate everything
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from circuit_compiler import CircuitCompiler
from providers.registry import ProviderRegistry

# Configure production logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class ProviderIsolationError(Exception):
    """
    Raised when provider isolation is violated.
    
    This enforces that jobs can ONLY be submitted to the active provider.
    Prevents cross-provider contamination at the backend level.
    """
    pass


class ExecutionOrchestrator:
    """
    Production-grade execution coordinator.
    Enforces contracts, validates rigorously, provides observability.
    """
    
    # JobNormalizer v1 contract - canonical schema
    V1_REQUIRED_FIELDS = {
        'job_id': str,
        'provider': str,
        'hardware_provider': str,
        'execution_type': str,  # 'qpu' | 'simulator' | 'hybrid'
        'quantum_model': str,   # 'gate' | 'annealing' | 'photonic'
        'lifecycle_state': str, # 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
        'is_terminal': bool
    }
    
    V1_OPTIONAL_FIELDS = {
        'result_status', 'submitted_at', 'completed_at', 
        'backend_id', 'shots', 'error_message'
    }
    
    VALID_EXECUTION_TYPES = {'qpu', 'simulator', 'hybrid'}
    VALID_QUANTUM_MODELS = {'gate', 'annealing', 'photonic'}
    VALID_LIFECYCLE_STATES = {'queued', 'validating', 'running', 'completed', 'failed', 'cancelled'}
    
    def __init__(self):
        self.compiler = CircuitCompiler()
        logger.info("✅ ExecutionOrchestrator initialized")
    
    # ==================== Main Execution Flow ====================
    
    def execute(
        self,
        provider: str,
        backend: str,
        circuit_qasm: str,
        shots: int = 1024,
        credentials: Dict = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Execute quantum circuit on specified provider/backend.
        
        This is the main entry point for multi-provider execution.
        Validates, compiles, routes, and enforces v1 contract.
        
        Args:
            provider: Provider ID ('ibm', 'ionq', 'aws_braket', etc.)
            backend: Backend ID within provider
            circuit_qasm: QASM 2.0 or 3.0 string
            shots: Number of measurements (default: 1024)
            credentials: Optional provider credentials from dashboard
            **kwargs: Additional provider-specific parameters
            
        Returns:
            Job object conforming to JobNormalizer v1 contract
            
        Raises:
            ValueError: Invalid input (HTTP 400)
            RuntimeError: Execution failure (HTTP 500)
        """
        # ==================== PHASE 1: VALIDATION ====================
        
        logger.info(f"🔄 Execution request: provider={provider}, backend={backend}, shots={shots}")
        
        # Validate request
        try:
            self._validate_request(provider, backend, circuit_qasm, shots)
        except ValueError as e:
            logger.error(f"❌ Validation failed: {e}")
            raise
        
        # ==================== PHASE 1.5: PROVIDER ISOLATION GATE ====================
        # INVARIANT: Jobs can ONLY execute on the active session provider
        # NO BYPASSES: If no active provider, execution is denied
        
        active_provider = kwargs.get('active_provider')
        
        # STRICT: Deny execution if no active provider (no implicit defaults)
        if not active_provider:
            logger.error(f"🚨 PROVIDER ISOLATION: No active provider in session")
            raise ProviderIsolationError(
                "No active provider in session. Provider must be explicitly selected before job submission."
            )
        
        # STRICT: Deny execution if provider mismatch
        if provider != active_provider:
            error_msg = (
                f"🚨 PROVIDER ISOLATION VIOLATED\n"
                f"   Requested: {provider}\n"
                f"   Active:    {active_provider}\n"
                f"   Action: Switch to {provider} first"
            )
            logger.error(error_msg)
            raise ProviderIsolationError(
                f"Cannot execute on '{provider}' while '{active_provider}' is active. "
                f"Switch providers first to maintain strict data isolation."
            )
        
        # GUARANTEED: provider == active_provider at this point
        logger.info(f"✅ Provider isolation enforced: {provider} == {active_provider}")
        
        # ==================== PHASE 2: COMPILATION ====================
        
        # Compile QASM → Canonical IR
        try:
            logger.info(f"📝 Compiling QASM to Canonical IR...")
            circuit_ir = self.compiler.from_qasm(circuit_qasm)
            logger.info(f"✅ Compiled: {circuit_ir['qubits']}q, {len(circuit_ir['gates'])} gates, depth {circuit_ir['depth']}")
        except ValueError as e:
            # Staff requirement: QASM errors → 400
            logger.error(f"❌ QASM compilation failed: {e}")
            raise ValueError(f"Circuit compilation failed: {e}")
        
        # ==================== PHASE 3: PROVIDER ROUTING ====================
        
        # Get provider adapter
        try:
            provider_adapter = ProviderRegistry.get(provider)
            logger.info(f"✅ Retrieved provider adapter: {provider}")
        except ValueError as e:
            logger.error(f"❌ Provider not found: {provider}")
            raise ValueError(f"Unknown provider: {provider}")
        
        # ==================== PHASE 4: JOB SUBMISSION ====================
        
        # Submit to provider (with credentials if provided)
        try:
            logger.info(f"🚀 Submitting to {provider}/{backend}...")
            
            # Check if provider's submit_job accepts credentials parameter
            import inspect
            sig = inspect.signature(provider_adapter.submit_job)
            
            if 'credentials' in sig.parameters and credentials:
                logger.info(f"✅ Passing credentials to {provider} provider")
                job = provider_adapter.submit_job(
                    circuit_ir=circuit_ir,
                    backend_id=backend,
                    shots=shots,
                    credentials=credentials
                )
            else:
                job = provider_adapter.submit_job(
                    circuit_ir=circuit_ir,
                    backend_id=backend,
                    shots=shots
                )
            
            logger.info(f"✅ Job submitted: {job.get('job_id', 'unknown')}")
        except Exception as e:
            logger.error(f"❌ Submission failed: {e}")
            raise RuntimeError(f"Provider submission failed: {e}")
        
        # ==================== PHASE 5: CONTRACT ENFORCEMENT ====================
        
        # Validate provider returned v1 contract
        try:
            self._enforce_v1_contract(job, provider)
            logger.info(f"✅ Job conforms to v1 contract")
        except ValueError as e:
            logger.error(f"❌ Provider contract violation: {e}")
            # Provider returned invalid data - this is a server error
            raise RuntimeError(f"Provider {provider} violated v1 contract: {e}")
        
        # Add metadata
        job['orchestrated_at'] = datetime.utcnow().isoformat() + 'Z'
        job['shots'] = shots
        
        logger.info(f"✅ Execution complete: {job['job_id']} ({job['lifecycle_state']})")
        return job
    
    # ==================== VALIDATION ====================
    
    def _validate_request(
        self,
        provider: str,
        backend: str,
        circuit_qasm: str,
        shots: int
    ):
        """
        Validate execution request.
        Fail-fast on invalid input.
        
        Raises:
            ValueError: Invalid request
        """
        # Provider
        if not provider or not isinstance(provider, str):
            raise ValueError("Provider must be a non-empty string")
        
        # Backend
        if not backend or not isinstance(backend, str):
            raise ValueError("Backend must be a non-empty string")
        
        # QASM
        if not circuit_qasm or not isinstance(circuit_qasm, str):
            raise ValueError("circuit_qasm must be a non-empty string")
        
        if len(circuit_qasm) > 1_000_000:  # 1MB limit
            raise ValueError("circuit_qasm exceeds size limit (1MB)")
        
        # Shots
        if not isinstance(shots, int):
            raise ValueError("shots must be an integer")
        
        if shots < 1 or shots > 1_000_000:
            raise ValueError("shots must be between 1 and 1,000,000")
    
    def _enforce_v1_contract(self, job: Dict, provider: str):
        """
        Enforce JobNormalizer v1 contract compliance.
        
        This is CRITICAL - prevents contract drift between providers.
        
        Raises:
            ValueError: Contract violation
        """
        if not isinstance(job, dict):
            raise ValueError(f"Job must be a dict, got {type(job)}")
        
        # Check required fields
        for field, expected_type in self.V1_REQUIRED_FIELDS.items():
            if field not in job:
                raise ValueError(f"Missing required field: {field}")
            
            if not isinstance(job[field], expected_type):
                raise ValueError(
                    f"Field '{field}' must be {expected_type.__name__}, "
                    f"got {type(job[field]).__name__}"
                )
        
        # Validate enums
        if job['execution_type'] not in self.VALID_EXECUTION_TYPES:
            raise ValueError(
                f"Invalid execution_type: {job['execution_type']}. "
                f"Must be one of: {self.VALID_EXECUTION_TYPES}"
            )
        
        if job['quantum_model'] not in self.VALID_QUANTUM_MODELS:
            raise ValueError(
                f"Invalid quantum_model: {job['quantum_model']}. "
                f"Must be one of: {self.VALID_QUANTUM_MODELS}"
            )
        
        if job['lifecycle_state'] not in self.VALID_LIFECYCLE_STATES:
            raise ValueError(
                f"Invalid lifecycle_state: {job['lifecycle_state']}. "
                f"Must be one of: {self.VALID_LIFECYCLE_STATES}"
            )
        
        # Validate terminal state consistency
        terminal_states = {'completed', 'failed', 'cancelled'}
        if job['is_terminal'] and job['lifecycle_state'] not in terminal_states:
            raise ValueError(
                f"is_terminal=True but lifecycle_state={job['lifecycle_state']} is not terminal"
            )
        
        if not job['is_terminal'] and job['lifecycle_state'] in terminal_states:
            raise ValueError(
                f"is_terminal=False but lifecycle_state={job['lifecycle_state']} is terminal"
            )
    
    # ==================== STATUS & RESULTS ====================
    
    def get_status(self, provider: str, job_id: str) -> Dict[str, Any]:
        """
        Poll job status from provider.
        
        Args:
            provider: Provider ID
            job_id: Job identifier
            
        Returns:
            Job object (v1 contract) with updated state
            
        Raises:
            ValueError: Invalid input or job not found
        """
        logger.info(f"📊 Status request: provider={provider}, job_id={job_id}")
        
        # Get provider
        try:
            provider_adapter = ProviderRegistry.get(provider)
        except ValueError as e:
            raise ValueError(f"Unknown provider: {provider}")
        
        # Get status
        try:
            job = provider_adapter.get_job_status(job_id)
            self._enforce_v1_contract(job, provider)
            logger.info(f"✅ Status: {job_id} → {job['lifecycle_state']}")
            return job
        except Exception as e:
            logger.error(f"❌ Status check failed: {e}")
            raise ValueError(f"Failed to get job status: {e}")
    
    def get_result(self, provider: str, job_id: str) -> Dict[str, Any]:
        """
        Retrieve job results from provider.
        
        Args:
            provider: Provider ID
            job_id: Job identifier
            
        Returns:
            Results dictionary with counts, shots, etc.
            
        Raises:
            ValueError: Invalid input or job not complete
        """
        logger.info(f"📥 Result request: provider={provider}, job_id={job_id}")
        
        # Get provider
        try:
            provider_adapter = ProviderRegistry.get(provider)
        except ValueError as e:
            raise ValueError(f"Unknown provider: {provider}")
        
        # Get result
        try:
            result = provider_adapter.get_job_result(job_id)
            logger.info(f"✅ Result retrieved: {job_id}")
            return result
        except Exception as e:
            logger.error(f"❌ Result retrieval failed: {e}")
            raise ValueError(f"Failed to get job result: {e}")


# ==================== Production Testing ====================

if __name__ == "__main__":
    """Production-grade self-test"""
    
    print("=" * 70)
    print("EXECUTION ORCHESTRATOR - PRODUCTION VALIDATION")
    print("=" * 70)
    
    orchestrator = ExecutionOrchestrator()
    
    # Test 1: Contract validation
    print("\n[TEST 1] V1 Contract Validation")
    valid_job = {
        'job_id': 'test_123',
        'provider': 'ibm',
        'hardware_provider': 'ibm',
        'execution_type': 'simulator',
        'quantum_model': 'gate',
        'lifecycle_state': 'queued',
        'is_terminal': False
    }
    
    try:
        orchestrator._enforce_v1_contract(valid_job, 'ibm')
        print("✅ Valid job passed validation")
    except ValueError as e:
        print(f"❌ FAILED: {e}")
    
    # Test 2: Invalid job detection
    print("\n[TEST 2] Invalid Job Detection")
    invalid_job = {
        'job_id': 'test_456',
        'provider': 'ibm',
        # Missing required fields
    }
    
    try:
        orchestrator._enforce_v1_contract(invalid_job, 'ibm')
        print("❌ FAILED: Should have raised ValueError")
    except ValueError as e:
        print(f"✅ Correctly rejected invalid job: {e}")
    
    # Test 3: Request validation
    print("\n[TEST 3] Request Validation")
    try:
        orchestrator._validate_request('ibm', 'simulator', 'OPENQASM 2.0;', 1024)
        print("✅ Valid request passed validation")
    except ValueError as e:
        print(f"❌ FAILED: {e}")
    
    try:
        orchestrator._validate_request('', 'backend', 'qasm', 1024)
        print("❌ FAILED: Should have rejected empty provider")
    except ValueError:
        print("✅ Correctly rejected empty provider")
    
    print("\n" + "=" * 70)
    print("✅ ORCHESTRATOR VALIDATION COMPLETE")
    print("=" * 70)
