"""
D-Wave Quantum Annealing Provider Adapter
Multi-Provider Quantum Integration v2.1

Uses D-Wave Ocean SDK (dwave-ocean-sdk).
THIS IS AN ANNEALING PROVIDER - NOT COMPATIBLE WITH GATE CIRCUITS!

API Reference: https://docs.ocean.dwavesys.com/
SDK: dwave-ocean-sdk >= 6.0.0
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

# Import base classes
try:
    from .quantum_provider_base import (
        AnnealingProvider, 
        ProviderCapabilities, 
        ComputationModel,
        ProviderResult
    )
except ImportError:
    from quantum_provider_base import (
        AnnealingProvider, 
        ProviderCapabilities, 
        ComputationModel,
        ProviderResult
    )


class DWaveProvider(AnnealingProvider):
    """
    D-Wave quantum annealing provider.
    
    IMPORTANT: This is a QUBO/Ising optimization provider.
    It does NOT accept quantum circuits!
    
    Uses:
    - dwave.system.DWaveSampler for QPU access
    - dwave.system.EmbeddingComposite for automatic embedding
    - dimod for problem formulation
    
    Available systems:
    - Advantage_system (5000+ qubits, Pegasus topology)
    - Advantage2_prototype (7000+ qubits, Zephyr topology)
    """
    
    PROVIDER_NAME = "dwave"
    
    # Solver endpoints
    SOLVER_API = "https://cloud.dwavesys.com/sapi"
    
    def __init__(self, api_token: str = None, solver: str = None):
        """
        Initialize D-Wave provider.
        
        Args:
            api_token: D-Wave Leap API token (or from config file)
            solver: Preferred solver name (optional)
        """
        super().__init__()
        
        self.api_token = api_token
        self.preferred_solver = solver
        
        # Lazy initialization of sampler
        self._sampler = None
        self._composite = None
        
        # Configure capabilities
        self.capabilities.model = ComputationModel.ANNEALING
        self.capabilities.topology = "pegasus"  # Current default
        self.capabilities.cost_model = "per_second"
        self.capabilities.access_model = "public"
        self.capabilities.max_qubits = 5627  # Advantage system
    
    def _get_sampler(self):
        """Get D-Wave sampler with embedding composite (lazy load)"""
        if self._composite is None:
            try:
                from dwave.system import DWaveSampler, EmbeddingComposite
                
                if self.api_token:
                    self._sampler = DWaveSampler(token=self.api_token, 
                                                  solver=self.preferred_solver)
                else:
                    self._sampler = DWaveSampler(solver=self.preferred_solver)
                
                self._composite = EmbeddingComposite(self._sampler)
                
            except ImportError:
                raise ImportError("dwave-ocean-sdk not installed. Run: pip install dwave-ocean-sdk")
            except Exception as e:
                raise ConnectionError(f"Failed to connect to D-Wave: {e}")
        
        return self._composite
    
    def get_backends(self) -> List[Dict[str, Any]]:
        """
        Get available D-Wave quantum annealers.
        
        Uses dwave.cloud.Client to discover available solvers.
        
        Returns:
            List of backends with normalized fields
        """
        try:
            from dwave.cloud import Client
            
            client = Client.from_config(token=self.api_token) if self.api_token else Client.from_config()
            
            backends = []
            for solver in client.get_solvers():
                if solver.properties.get('category') == 'qpu':
                    backends.append({
                        'id': solver.id,
                        'name': solver.id,
                        'provider': 'dwave',
                        'computation_model': 'annealing',
                        'status': 'online' if solver.properties.get('status') == 'online' else 'offline',
                        'qubits': solver.properties.get('num_qubits', 0),
                        'topology': solver.properties.get('topology', {}).get('type', 'unknown'),
                        'type': 'qpu',
                        'chip_id': solver.properties.get('chip_id', ''),
                        'avg_chain_break_fraction': solver.properties.get('avg_chain_break_fraction', 0)
                    })
            
            client.close()
            return backends
            
        except ImportError:
            return self._get_mock_backends()
        except Exception as e:
            print(f"Error fetching D-Wave solvers: {e}")
            return self._get_mock_backends()
    
    def _get_mock_backends(self) -> List[Dict[str, Any]]:
        """Return mock backends when D-Wave SDK not configured"""
        return [
            {
                'id': 'Advantage_system6.4',
                'name': 'Advantage_system6.4',
                'provider': 'dwave',
                'computation_model': 'annealing',
                'status': 'online',
                'qubits': 5627,
                'topology': 'pegasus',
                'type': 'qpu'
            },
            {
                'id': 'Advantage2_prototype2.4',
                'name': 'Advantage2_prototype2.4',
                'provider': 'dwave',
                'computation_model': 'annealing',
                'status': 'online',
                'qubits': 7520,
                'topology': 'zephyr',
                'type': 'qpu'
            }
        ]
    
    def get_provider_info(self) -> Dict[str, Any]:
        """Get D-Wave provider metadata"""
        return {
            'name': self.PROVIDER_NAME,
            'display_name': 'D-Wave',
            'model': self.capabilities.model.value,
            'topology': self.capabilities.topology,
            'cost_model': self.capabilities.cost_model,
            'access_model': self.capabilities.access_model,
            'problem_types': ['QUBO', 'Ising'],
            'max_qubits': self.capabilities.max_qubits,
            'features': {
                'automatic_embedding': True,
                'chain_strength_tuning': True,
                'annealing_time_control': True
            }
        }
    
    def health_check(self) -> bool:
        """Verify D-Wave API accessibility"""
        try:
            from dwave.cloud import Client
            
            client = Client.from_config(token=self.api_token) if self.api_token else Client.from_config()
            solvers = list(client.get_solvers())
            client.close()
            
            return len(solvers) > 0
        except:
            return False
    
    def list_jobs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        List recent D-Wave jobs.
        
        Note: D-Wave's API returns limited job history.
        
        Args:
            limit: Maximum number of jobs to return
            
        Returns:
            List of normalized job dicts
        """
        try:
            from dwave.cloud import Client
            
            client = Client.from_config(token=self.api_token) if self.api_token else Client.from_config()
            
            # D-Wave doesn't have a direct job listing API like other providers
            # This would need to be tracked locally or via Leap platform
            jobs = []
            
            client.close()
            return jobs
            
        except Exception as e:
            print(f"Error listing D-Wave jobs: {e}")
            return []
    
    def submit_qubo(self, Q: Dict, backend: str = None, num_reads: int = 100,
                    **kwargs) -> Dict[str, Any]:
        """
        Submit a QUBO problem for quantum annealing.
        
        Uses EmbeddingComposite.sample_qubo() from dwave-ocean-sdk.
        
        Args:
            Q: QUBO matrix as {(i,j): coefficient} or upper triangular dict
            backend: Solver name (optional, uses default)
            num_reads: Number of annealing samples (default 100)
            **kwargs: Additional parameters:
                - chain_strength: Strength of chain coupling (auto-calculated if not provided)
                - annealing_time: Annealing time in microseconds
                - auto_scale: Whether to auto-scale problem coefficients
            
        Returns:
            Sample result with job ID and solutions
        """
        try:
            import uuid
            from datetime import datetime
            
            composite = self._get_sampler()
            
            # Extract optional parameters
            chain_strength = kwargs.get('chain_strength', None)
            annealing_time = kwargs.get('annealing_time', None)
            auto_scale = kwargs.get('auto_scale', True)
            
            # Build sampler arguments
            sample_kwargs = {
                'num_reads': num_reads,
                'auto_scale': auto_scale
            }
            if chain_strength is not None:
                sample_kwargs['chain_strength'] = chain_strength
            if annealing_time is not None:
                sample_kwargs['annealing_time'] = annealing_time
            
            # Submit problem
            sampleset = composite.sample_qubo(Q, **sample_kwargs)
            
            # Generate job ID (D-Wave doesn't expose task IDs easily)
            job_id = str(uuid.uuid4())
            
            # Extract results
            samples = []
            for sample, energy, num_occurrences in sampleset.data(['sample', 'energy', 'num_occurrences']):
                samples.append({
                    'sample': dict(sample),
                    'energy': float(energy),
                    'occurrences': int(num_occurrences)
                })
            
            return {
                'job_id': job_id,
                'status': 'completed',
                'provider': 'dwave',
                'model': 'annealing',
                'problem_type': 'QUBO',
                'samples': samples,
                'num_reads': num_reads,
                'timing': sampleset.info.get('timing', {}),
                'completed_at': datetime.now().isoformat()
            }
            
        except ImportError:
            return {
                'job_id': None,
                'status': 'failed',
                'provider': 'dwave',
                'error': 'dwave-ocean-sdk not installed'
            }
        except Exception as e:
            return {
                'job_id': None,
                'status': 'failed',
                'provider': 'dwave',
                'error': str(e)
            }
    
    def submit_ising(self, h: List, J: Dict, backend: str = None, 
                     num_reads: int = 100, **kwargs) -> Dict[str, Any]:
        """
        Submit an Ising problem for quantum annealing.
        
        Uses EmbeddingComposite.sample_ising() from dwave-ocean-sdk.
        
        Args:
            h: Linear biases as list or dict
            J: Quadratic couplings as {(i,j): coupling}
            backend: Solver name (optional)
            num_reads: Number of annealing samples
            **kwargs: Additional parameters (chain_strength, annealing_time, etc.)
            
        Returns:
            Sample result with job ID and solutions
        """
        try:
            import uuid
            from datetime import datetime
            
            composite = self._get_sampler()
            
            # Extract optional parameters
            chain_strength = kwargs.get('chain_strength', None)
            annealing_time = kwargs.get('annealing_time', None)
            
            sample_kwargs = {'num_reads': num_reads}
            if chain_strength is not None:
                sample_kwargs['chain_strength'] = chain_strength
            if annealing_time is not None:
                sample_kwargs['annealing_time'] = annealing_time
            
            # Submit problem
            sampleset = composite.sample_ising(h, J, **sample_kwargs)
            
            # Generate job ID
            job_id = str(uuid.uuid4())
            
            # Extract results
            samples = []
            for sample, energy, num_occurrences in sampleset.data(['sample', 'energy', 'num_occurrences']):
                samples.append({
                    'sample': dict(sample),
                    'energy': float(energy),
                    'occurrences': int(num_occurrences)
                })
            
            return {
                'job_id': job_id,
                'status': 'completed',
                'provider': 'dwave',
                'model': 'annealing',
                'problem_type': 'Ising',
                'samples': samples,
                'num_reads': num_reads,
                'timing': sampleset.info.get('timing', {}),
                'completed_at': datetime.now().isoformat()
            }
            
        except ImportError:
            return {
                'job_id': None,
                'status': 'failed',
                'provider': 'dwave',
                'error': 'dwave-ocean-sdk not installed'
            }
        except Exception as e:
            return {
                'job_id': None,
                'status': 'failed',
                'provider': 'dwave',
                'error': str(e)
            }
    
    def get_embedding(self, problem_graph: Any, target_graph: Any = None) -> Dict:
        """
        Get minor embedding for a problem graph.
        
        Uses minorminer for embedding calculation.
        
        Args:
            problem_graph: NetworkX graph or edge list
            target_graph: Target hardware graph (uses QPU if not provided)
            
        Returns:
            Embedding dict {logical_var: [physical_qubits]}
        """
        try:
            import minorminer
            
            if target_graph is None:
                # Get target graph from sampler
                sampler = self._get_sampler()
                target_graph = sampler.child.structure[0].edges()
            
            embedding = minorminer.find_embedding(problem_graph, target_graph)
            return embedding
            
        except Exception as e:
            return {'error': str(e)}
    
    def estimate_cost(self, num_reads: int, problem_size: int = 0) -> float:
        """
        Estimate cost for a D-Wave job.
        
        D-Wave Leap pricing (as of 2025):
        - First minute free per month
        - $0.20 per second after that
        
        Args:
            num_reads: Number of annealing samples
            problem_size: Number of variables (affects embedding time)
            
        Returns:
            Estimated cost in USD
        """
        # Estimate annealing time (very rough)
        # Default annealing time is 20 microseconds per read
        annealing_time_us = num_reads * 20
        
        # Add embedding overhead (rough estimate)
        embedding_time_ms = problem_size * 0.1  # 0.1ms per variable
        
        # Total time in seconds
        total_time_s = (annealing_time_us / 1_000_000) + (embedding_time_ms / 1000)
        
        # D-Wave pricing: $0.20 per second
        return 0.20 * total_time_s
