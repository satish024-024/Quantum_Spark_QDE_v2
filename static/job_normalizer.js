/**
 * JobNormalizer - Production-grade job data normalization
 * 
 * Responsibilities:
 * 1. Validate against canonical v1 contract
 * 2. Classify jobs as ok | inferred | invalid
 * 3. Never throw for data issues
 * 4. Never return raw jobs
 * 5. Never guess silently
 */

// ==================== Type Definitions (JSDoc) ====================

/**
 * @typedef {'qpu' | 'simulator' | 'hybrid'} ExecutionType
 * @typedef {'gate' | 'annealing' | 'photonic'} QuantumModel
 * @typedef {'queued' | 'validating' | 'running' | 'completed' | 'failed' | 'cancelled'} LifecycleState
 * @typedef {'success' | 'failed' | 'cancelled' | 'timeout'} ResultStatus
 */

/**
 * @typedef {Object} NormalizedJob
 * @property {string} job_id
 * @property {string} provider
 * @property {string} hardware_provider
 * @property {ExecutionType} execution_type
 * @property {QuantumModel} quantum_model
 * @property {LifecycleState} lifecycle_state
 * @property {boolean} is_terminal
 * @property {ResultStatus} [result_status]
 * @property {string} [submitted_at]
 * @property {string} [completed_at]
 * @property {string} [backend_id]
 */

/**
 * @typedef {Object} ValidationError
 * @property {string} reason
 * @property {string[]} details
 * @property {string} [field]
 */

/**
 * @typedef {Object} OkResult
 * @property {'ok'} kind
 * @property {NormalizedJob} job
 */

/**
 * @typedef {Object} InferredResult
 * @property {'inferred'} kind
 * @property {NormalizedJob} job
 * @property {string[]} warnings
 * @property {string[]} inferred_fields
 */

/**
 * @typedef {Object} InvalidResult
 * @property {'invalid'} kind
 * @property {ValidationError} error
 * @property {unknown} raw
 */

/**
 * @typedef {OkResult | InferredResult | InvalidResult} NormalizationResult
 */

// ==================== Inference Rules ====================

/** @type {Record<string, LifecycleState>} */
const STATUS_TO_LIFECYCLE = {
    // IBM statuses
    'QUEUED': 'queued',
    'RUNNING': 'running',
    'VALIDATING': 'validating',
    'DONE': 'completed',
    'ERROR': 'failed',
    'CANCELLED': 'cancelled',

    // AWS Braket statuses
    'CREATED': 'queued',
    'PENDING': 'queued',
    'RUNNING': 'running',
    'COMPLETED': 'completed',
    'FAILED': 'failed',
    'CANCELLING': 'running',
    'CANCELLED': 'cancelled',

    // IonQ statuses
    'submitted': 'queued',
    'ready': 'running',
    'completed': 'completed',
    'failed': 'failed',
    'canceled': 'cancelled'
};

/** @type {Record<string, string>} */
const BACKEND_TO_PROVIDER = {
    // IBM backends
    'ibm_': 'ibm',
    'fez': 'ibm',
    'marrakesh': 'ibm',
    'torino': 'ibm',
    'brisbane': 'ibm',

    // AWS Braket
    'arn:aws:braket': 'aws_braket',
    'braket': 'aws_braket',

    // IonQ
    'ionq': 'ionq',
    'harmony': 'ionq',
    'aria': 'ionq',

    // Rigetti
    'aspen': 'rigetti',
    'rigetti': 'rigetti',

    // Google
    'sycamore': 'google',
    'google': 'google',

    // Simulators
    'qasm_simulator': 'local',
    'aer': 'local',
    'simulator': 'local'
};

// ==================== Core Normalizer ====================

class JobNormalizer {
    /**
     * Normalize a raw job from API
     * @param {unknown} raw - Raw job data
     * @returns {NormalizationResult}
     */
    static normalizeJob(raw) {
        // Type guard
        if (!raw || typeof raw !== 'object') {
            return {
                kind: 'invalid',
                error: {
                    reason: 'Job is not an object',
                    details: [`Received: ${typeof raw}`]
                },
                raw
            };
        }

        const job = /** @type {Record<string, any>} */ (raw);

        // Check for job_id first (non-negotiable)
        if (!job.job_id || typeof job.job_id !== 'string' || job.job_id.trim() === '') {
            return {
                kind: 'invalid',
                error: {
                    reason: 'Missing or invalid job_id',
                    details: ['job_id is required and must be a non-empty string']
                },
                raw
            };
        }

        // Try v1 contract first
        const v1Result = this._tryV1Contract(job);
        if (v1Result) return v1Result;

        // Try inference from legacy schema
        const inferredResult = this._tryInference(job);
        if (inferredResult) return inferredResult;

        // Cannot normalize
        return {
            kind: 'invalid',
            error: {
                reason: 'Job lacks both v1 contract and inferable legacy fields',
                details: [
                    'Missing required v1 fields',
                    'Cannot infer lifecycle_state or provider from legacy data'
                ]
            },
            raw
        };
    }

    /**
     * Try to validate against v1 contract
     * @private
     */
    static _tryV1Contract(job) {
        const required = [
            'provider',
            'hardware_provider',
            'execution_type',
            'quantum_model',
            'lifecycle_state',
            'is_terminal'
        ];

        const missing = required.filter(field => !(field in job));
        if (missing.length > 0) {
            return null; // Not v1, try inference
        }

        // Validate field values
        const validationErrors = [];

        // Validate lifecycle_state
        const validLifecycleStates = ['queued', 'validating', 'running', 'completed', 'failed', 'cancelled'];
        if (!validLifecycleStates.includes(job.lifecycle_state)) {
            validationErrors.push(`Invalid lifecycle_state: ${job.lifecycle_state}`);
        }

        // Validate is_terminal invariant
        const terminalStates = ['completed', 'failed', 'cancelled'];
        const isTerminal = terminalStates.includes(job.lifecycle_state);
        if (job.is_terminal !== isTerminal) {
            validationErrors.push(
                `is_terminal (${job.is_terminal}) contradicts lifecycle_state (${job.lifecycle_state})`
            );
        }

        // Validate execution_type
        const validExecutionTypes = ['qpu', 'simulator', 'hybrid'];
        if (!validExecutionTypes.includes(job.execution_type)) {
            validationErrors.push(`Invalid execution_type: ${job.execution_type}`);
        }

        // Validate quantum_model
        const validQuantumModels = ['gate', 'annealing', 'photonic'];
        if (!validQuantumModels.includes(job.quantum_model)) {
            validationErrors.push(`Invalid quantum_model: ${job.quantum_model}`);
        }

        if (validationErrors.length > 0) {
            return {
                kind: 'invalid',
                error: {
                    reason: 'v1 contract validation failed',
                    details: validationErrors
                },
                raw: job
            };
        }

        // Valid v1 job
        return {
            kind: 'ok',
            job: {
                job_id: job.job_id,
                provider: job.provider,
                hardware_provider: job.hardware_provider,
                execution_type: job.execution_type,
                quantum_model: job.quantum_model,
                lifecycle_state: job.lifecycle_state,
                is_terminal: job.is_terminal,
                result_status: job.result_status,
                submitted_at: job.submitted_at,
                completed_at: job.completed_at,
                backend_id: job.backend_id
            }
        };
    }

    /**
     * Try to infer from legacy schema
     * @private
     */
    static _tryInference(job) {
        const warnings = [];
        const inferred_fields = [];
        const normalized = { job_id: job.job_id };

        // Infer lifecycle_state from status
        if (!job.lifecycle_state && job.status) {
            const statusUpper = String(job.status).toUpperCase();
            const lifecycle = STATUS_TO_LIFECYCLE[statusUpper];

            if (!lifecycle) {
                return null; // Cannot infer
            }

            normalized.lifecycle_state = lifecycle;
            inferred_fields.push('lifecycle_state');
            warnings.push(`Inferred lifecycle_state="${lifecycle}" from legacy status="${job.status}"`);
        } else if (job.lifecycle_state) {
            normalized.lifecycle_state = job.lifecycle_state;
        } else {
            return null; // Cannot proceed without lifecycle state
        }

        // Infer is_terminal
        if (typeof job.is_terminal !== 'boolean') {
            const terminalStates = ['completed', 'failed', 'cancelled'];
            normalized.is_terminal = terminalStates.includes(normalized.lifecycle_state);
            inferred_fields.push('is_terminal');
        } else {
            normalized.is_terminal = job.is_terminal;
        }

        // Infer provider
        if (!job.provider) {
            const providerResult = this._inferProvider(job);
            if (!providerResult) {
                return null; // Cannot infer provider deterministically
            }
            normalized.provider = providerResult.provider;
            inferred_fields.push('provider');
            warnings.push(`Inferred provider="${providerResult.provider}" from backend/flags`);
            warnings.push(...providerResult.warnings);
        } else {
            normalized.provider = job.provider;
        }

        // Infer hardware_provider (defaults to same as provider)
        if (!job.hardware_provider) {
            normalized.hardware_provider = normalized.provider;
            inferred_fields.push('hardware_provider');
        } else {
            normalized.hardware_provider = job.hardware_provider;
        }

        // Infer execution_type - FAIL CLOSED, no guessing
        if (!job.execution_type) {
            const backend = (job.backend_name || job.backend || '').toLowerCase();

            // Explicit simulator patterns
            if (backend.includes('simulator') || backend.includes('aer') || backend.includes('qasm')) {
                normalized.execution_type = 'simulator';
                inferred_fields.push('execution_type');
            }
            // Explicit QPU flag
            else if (job.real_data === true) {
                normalized.execution_type = 'qpu';
                inferred_fields.push('execution_type');
                warnings.push('Inferred execution_type="qpu" from real_data flag');
            }
            // Cannot determine - fail closed
            else {
                return null; // Cannot infer execution_type deterministically
            }
        } else {
            normalized.execution_type = job.execution_type;
        }

        // Infer quantum_model - only if we can be confident
        if (!job.quantum_model) {
            // Only infer for known providers
            if (normalized.provider === 'local' || normalized.provider === 'ibm' ||
                normalized.provider === 'ionq' || normalized.provider === 'rigetti') {
                normalized.quantum_model = 'gate'; // Gate-based is standard for these
                inferred_fields.push('quantum_model');
            } else {
                return null; // Cannot infer quantum_model for unknown provider types
            }
        } else {
            normalized.quantum_model = job.quantum_model;
        }

        // Copy optional fields
        if (job.result_status) normalized.result_status = job.result_status;
        if (job.submitted_at || job.created_at) {
            normalized.submitted_at = job.submitted_at || job.created_at;
        }
        if (job.completed_at) normalized.completed_at = job.completed_at;
        if (job.backend_id || job.backend_name || job.backend) {
            normalized.backend_id = job.backend_id || job.backend_name || job.backend;
        }

        // CRITICAL: Validate terminal integrity
        // Terminal jobs MUST have completed_at and result_status
        if (normalized.is_terminal) {
            if (!normalized.completed_at || !normalized.result_status) {
                warnings.push('⚠️ Terminal job missing completed_at or result_status');
                // This is acceptable for inferred jobs, but flagged
            }
        }

        return {
            kind: 'inferred',
            job: /** @type {NormalizedJob} */ (normalized),
            warnings,
            inferred_fields
        };
    }

    /**
     * Infer provider from backend name and flags
     * DETERMINISTIC ONLY - ordered matching, fail closed on ambiguity
     * @private
     */
    static _inferProvider(job) {
        const warnings = [];

        // Check real_data flag (IBM-specific, migration only)
        if (job.real_data === true) {
            warnings.push('⚠️ Provider inferred from IBM-only real_data flag (migration pattern)');
            return { provider: 'ibm', warnings };
        }

        if (job.local_data === true) {
            return { provider: 'local', warnings: [] };
        }

        // Check backend name - ORDERED, deterministic matching
        const backend = (job.backend_name || job.backend || '').toLowerCase();

        // AWS Braket ARN format (most specific first)
        if (backend.startsWith('arn:aws:braket')) {
            return { provider: 'aws_braket', warnings: [] };
        }

        // Exact provider prefixes
        if (backend.startsWith('ibm_') || backend.startsWith('ibmq_')) {
            return { provider: 'ibm', warnings: [] };
        }

        // Known IBM backend names
        const ibmBackends = ['fez', 'marrakesh', 'torino', 'brisbane', 'kyoto', 'osaka'];
        if (ibmBackends.some(name => backend === name || backend.startsWith(name + '_'))) {
            return { provider: 'ibm', warnings: [] };
        }

        // IonQ patterns (specific path or prefix)
        if (backend.includes('/ionq/') || backend.startsWith('ionq')) {
            return { provider: 'ionq', warnings: [] };
        }

        // Rigetti patterns
        if (backend.startsWith('aspen') || backend.startsWith('rigetti')) {
            return { provider: 'rigetti', warnings: [] };
        }

        // Google patterns
        if (backend.startsWith('sycamore') || backend.startsWith('google')) {
            return { provider: 'google', warnings: [] };
        }

        // Local simulators (must be explicit)
        const simulatorPatterns = ['qasm_simulator', 'aer_simulator', 'statevector_simulator'];
        if (simulatorPatterns.some(pattern => backend === pattern || backend.startsWith(pattern + '_'))) {
            return { provider: 'local', warnings: [] };
        }

        // Cannot determine provider deterministically
        return null;
    }

    /**
     * Normalize a collection of jobs
     * @param {unknown[]} rawJobs
     * @returns {NormalizationResult[]}
     */
    static normalizeJobs(rawJobs) {
        if (!Array.isArray(rawJobs)) {
            console.error('normalizeJobs expects an array');
            return [];
        }

        return rawJobs.map(raw => this.normalizeJob(raw));
    }

    /**
     * Extract only valid (ok) jobs from results
     * @param {NormalizationResult[]} results
     * @returns {NormalizedJob[]}
     */
    static getValidJobs(results) {
        return results
            .filter(r => r.kind === 'ok')
            .map(r => r.job);
    }

    /**
     * Extract displayable jobs (ok + inferred)
     * @param {NormalizationResult[]} results
     * @returns {Array<{job: NormalizedJob, isInferred: boolean}>}
     */
    static getDisplayableJobs(results) {
        return results
            .filter(r => r.kind !== 'invalid')
            .map(r => ({
                job: r.job,
                isInferred: r.kind === 'inferred'
            }));
    }

    /**
     * Get statistics about normalization results
     * @param {NormalizationResult[]} results
     */
    static getStats(results) {
        const ok = results.filter(r => r.kind === 'ok').length;
        const inferred = results.filter(r => r.kind === 'inferred').length;
        const invalid = results.filter(r => r.kind === 'invalid').length;

        return {
            total: results.length,
            ok,
            inferred,
            invalid,
            inferredPercentage: results.length > 0 ? (inferred / results.length * 100).toFixed(1) : 0,
            validPercentage: results.length > 0 ? (ok / results.length * 100).toFixed(1) : 0
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JobNormalizer;
}
if (typeof window !== 'undefined') {
    window.JobNormalizer = JobNormalizer;
}
