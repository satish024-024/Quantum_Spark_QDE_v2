/**
 * AI Key Manager - Frontend JavaScript
 * Manages AI keys in browser localStorage with two-step verification UI
 */

class AIKeyManager {
    constructor() {
        this.storageKey = 'quantum_ai_key';
        this.providerKey = 'quantum_ai_provider';
        this.modal = null;
        this.isVerifying = false;
    }

    init() {
        // Check for existing key on page load
        const existingKey = this.getKey();
        if (existingKey.apiKey) {
            this.updateAIStatus(true, existingKey.provider);
        }

        // Setup modal and event listeners
        this.setupModal();
        this.setupEventListeners();
    }

    setupModal() {
        // Modal will be defined in HTML
        this.modal = document.getElementById('ai-key-modal');
        if (!this.modal) {
            console.warn('AI key modal not found in DOM');
        }
    }

    setupEventListeners() {
        // AI key button - open modal
        const aiKeyBtn = document.getElementById('ai-key-btn');
        if (aiKeyBtn) {
            aiKeyBtn.addEventListener('click', () => this.openModal());
        }

        // Key input - detect provider as user types
        const keyInput = document.getElementById('ai-key-input');
        if (keyInput) {
            keyInput.addEventListener('input', (e) => this.handleKeyInput(e.target.value));
        }

        // Save button
        const saveBtn = document.getElementById('save-key-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveKey());
        }

        // Clear button
        const clearBtn = document.getElementById('clear-key-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearKey());
        }

        // Close button
        const closeBtn = this.modal?.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        // Close on outside click
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
    }

    openModal() {
        if (this.modal) {
            this.modal.style.display = 'block';
            // Reset UI states
            const detected = document.getElementById('key-detection-result');
            if (detected) detected.classList.add('hidden');
        }
    }

    closeModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }

    async handleKeyInput(apiKey) {
        if (!apiKey || apiKey.length < 10) {
            this.hideAllStages();
            return;
        }

        // Step 1: Heuristic detection (instant, client-side)
        const provider = this.detectProviderHeuristic(apiKey);

        if (provider) {
            this.showStage('heuristic', provider);

            // Debounce backend verification
            clearTimeout(this.verifyTimeout);
            this.verifyTimeout = setTimeout(() => {
                this.verifyKeyBackend(apiKey, provider);
            }, 500); // Wait 500ms after typing stops
        } else {
            this.showError('Unrecognized key format');
            this.disableSaveButton();
        }
    }

    detectProviderHeuristic(apiKey) {
        // Same regex patterns as backend
        const patterns = {
            gemini: /^AIza[0-9A-Za-z_-]{35}$/,
            claude: /^sk-ant-api03-[A-Za-z0-9_-]{32,}$/,
            openai: /^sk-[a-zA-Z0-9]{32,}$/,
            huggingface: /^hf_[a-zA-Z0-9]{26,}$/
        };

        for (const [provider, pattern] of Object.entries(patterns)) {
            if (pattern.test(apiKey)) {
                return provider;
            }
        }
        return null;
    }

    async verifyKeyBackend(apiKey, provider) {
        if (this.isVerifying) return;

        this.isVerifying = true;
        this.showStage('verifying');

        try {
            const response = await fetch('/api/ai/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey, provider })
            });

            const result = await response.json();

            if (result.is_valid) {
                this.showStage('verified', result.provider, result.capabilities);
                this.enableSaveButton();
                this.currentKey = apiKey;
                this.currentProvider = result.provider;
            } else {
                this.showError(result.error_message || 'Invalid API key');
                this.disableSaveButton();
            }
        } catch (error) {
            this.showError('Verification failed: ' + error.message);
            this.disableSaveButton();
        } finally {
            this.isVerifying = false;
        }
    }

    showStage(stage, provider = null, capabilities = null) {
        this.hideAllStages();

        const resultDiv = document.getElementById('key-detection-result');
        if (!resultDiv) return;

        resultDiv.classList.remove('hidden');

        const stages = {
            heuristic: resultDiv.querySelector('.stage-heuristic'),
            verifying: resultDiv.querySelector('.stage-verifying'),
            verified: resultDiv.querySelector('.stage-verified'),
            error: resultDiv.querySelector('.stage-error')
        };

        // Hide all stages first
        Object.values(stages).forEach(s => s?.classList.add('hidden'));

        if (stage === 'heuristic' && stages.heuristic && provider) {
            stages.heuristic.classList.remove('hidden');
            const nameElem = stages.heuristic.querySelector('#provider-name');
            if (nameElem) {
                nameElem.textContent = provider.charAt(0).toUpperCase() + provider.slice(1);
            }
        } else if (stage === 'verifying' && stages.verifying) {
            stages.verifying.classList.remove('hidden');
        } else if (stage === 'verified' && stages.verified && provider) {
            stages.verified.classList.remove('hidden');
            const nameElem = stages.verified.querySelector('#provider-name-verified');
            if (nameElem) {
                nameElem.textContent = provider.charAt(0).toUpperCase() + provider.slice(1);
            }
        }
    }

    showError(message) {
        const resultDiv = document.getElementById('key-detection-result');
        if (!resultDiv) return;

        this.hideAllStages();
        resultDiv.classList.remove('hidden');

        const errorStage = resultDiv.querySelector('.stage-error');
        if (errorStage) {
            errorStage.classList.remove('hidden');
            const msgElem = errorStage.querySelector('#error-message');
            if (msgElem) msgElem.textContent = message;
        }
    }

    hideAllStages() {
        const resultDiv = document.getElementById('key-detection-result');
        if (!resultDiv) return;

        const stages = resultDiv.querySelectorAll('.stage-heuristic, .stage-verifying, .stage-verified, .stage-error');
        stages.forEach(stage => stage.classList.add('hidden'));
    }

    enableSaveButton() {
        const saveBtn = document.getElementById('save-key-btn');
        if (saveBtn) {
            saveBtn.disabled = false;
        }
    }

    disableSaveButton() {
        const saveBtn = document.getElementById('save-key-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
        }
    }

    saveKey() {
        if (!this.currentKey || !this.currentProvider) {
            alert('Please verify a valid API key first');
            return;
        }

        // Save to localStorage
        localStorage.setItem(this.storageKey, this.currentKey);
        localStorage.setItem(this.providerKey, this.currentProvider);

        // Update UI
        this.updateAIStatus(true, this.currentProvider);

        // Close modal
        this.closeModal();

        // Show success notification
        this.showNotification(`${this.currentProvider.toUpperCase()} AI features unlocked!`, 'success');
    }

    clearKey() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.providerKey);

        // Clear session on backend
        fetch('/api/ai/clear_key', { method: 'POST' });

        this.updateAIStatus(false);
        this.closeModal();

        this.showNotification('AI key cleared', 'info');
    }

    getKey() {
        return {
            apiKey: localStorage.getItem(this.storageKey),
            provider: localStorage.getItem(this.providerKey)
        };
    }

    updateAIStatus(unlocked, provider = null) {
        const statusBadge = document.getElementById('ai-status');
        const keyBtn = document.getElementById('ai-key-btn');

        if (!statusBadge || !keyBtn) return;

        if (unlocked && provider) {
            statusBadge.textContent = provider.charAt(0).toUpperCase() + provider.slice(1);
            statusBadge.classList.add('unlocked');
            statusBadge.classList.remove('locked');
            keyBtn.style.borderColor = 'rgba(34, 197, 94, 0.5)';
        } else {
            statusBadge.textContent = 'Locked';
            statusBadge.classList.add('locked');
            statusBadge.classList.remove('unlocked');
            keyBtn.style.borderColor = 'rgba(239, 68, 68, 0.5)';
        }
    }

    showNotification(message, type = 'info') {
        // Simple notification (can be enhanced)
        console.log(`[${type.toUpperCase()}] ${message}`);
        // TODO: Integrate with existing notification system if available
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.aiKeyManager = new AIKeyManager();
    window.aiKeyManager.init();
});
