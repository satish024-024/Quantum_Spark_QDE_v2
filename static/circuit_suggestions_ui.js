/**
 * Circuit Suggestions UI System
 * Creates a beautiful interface for browsing and selecting quantum circuits
 */

class CircuitSuggestionsUI {
    constructor(circuitDatabase, visualizerApp) {
        console.log('🔄 Initializing CircuitSuggestionsUI...');
        console.log('📊 CircuitDatabase available:', !!circuitDatabase);
        console.log('📊 VisualizerApp available:', !!visualizerApp);

        this.circuitDatabase = circuitDatabase;
        this.visualizerApp = visualizerApp;
        this.isVisible = false;
        this.currentCategory = null;

        try {
            this.suggestions = this.circuitDatabase.getCircuitSuggestions();
            console.log('✅ Circuit suggestions loaded:', Object.keys(this.suggestions).length, 'categories');
        } catch (error) {
            console.error('❌ Error loading circuit suggestions:', error);
            this.suggestions = {};
        }

        this.createSuggestionsInterface();
    }

    createSuggestionsInterface() {
        // Create main suggestions panel
        const suggestionsPanel = document.createElement('div');
        suggestionsPanel.id = 'circuit-suggestions-panel';
        suggestionsPanel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 1200px;
            height: 80%;
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(20, 20, 40, 0.95));
            border: 2px solid #00d4ff;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 212, 255, 0.3);
            backdrop-filter: blur(20px);
            z-index: 10000;
            display: none;
            overflow: hidden;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;

        suggestionsPanel.innerHTML = `
            <div style="display: flex; height: 100%;">
                <!-- Left Sidebar - Categories -->
                <div id="categories-sidebar" style="
                    width: 300px;
                    background: rgba(0, 0, 0, 0.3);
                    border-right: 1px solid rgba(0, 212, 255, 0.3);
                    padding: 20px;
                    overflow-y: auto;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="margin: 0; color: #00d4ff; font-size: 1.5rem;">Quantum Circuits</h2>
                        <button id="close-suggestions" style="
                            background: none;
                            border: none;
                            color: #ff6b6b;
                            font-size: 1.5rem;
                            cursor: pointer;
                            padding: 5px;
                            border-radius: 50%;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.background='rgba(255,107,107,0.2)'" onmouseout="this.style.background='none'">×</button>
                    </div>
                    
                    <div id="categories-list" style="display: flex; flex-direction: column; gap: 8px;">
                        <!-- Categories will be populated here -->
                    </div>
                </div>

                <!-- Right Content - Circuit Details -->
                <div id="circuits-content" style="
                    flex: 1;
                    padding: 20px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                ">
                    <div id="category-header" style="
                        margin-bottom: 20px;
                        padding-bottom: 15px;
                        border-bottom: 2px solid rgba(0, 212, 255, 0.3);
                    ">
                        <h1 id="category-title" style="
                            margin: 0 0 10px 0;
                            color: #00d4ff;
                            font-size: 2rem;
                            font-weight: 300;
                        ">Select a Category</h1>
                        <p id="category-description" style="
                            margin: 0;
                            color: #b0b0b0;
                            font-size: 1.1rem;
                            line-height: 1.4;
                        ">Choose a quantum circuit category from the sidebar to explore available circuits.</p>
                    </div>

                    <div id="circuits-grid" style="
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                        gap: 20px;
                        flex: 1;
                    ">
                        <!-- Circuit cards will be populated here -->
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(suggestionsPanel);
        this.suggestionsPanel = suggestionsPanel;

        // Populate categories
        this.populateCategories();

        // Add event listeners
        this.setupEventListeners();
    }

    populateCategories() {
        const categoriesList = document.getElementById('categories-list');
        
        Object.keys(this.suggestions).forEach(category => {
            const categoryButton = document.createElement('button');
            categoryButton.className = 'category-btn';
            categoryButton.dataset.category = category;
            
            // Get category icon
            const icon = this.getCategoryIcon(category);
            
            categoryButton.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; text-align: left;">
                    <span style="font-size: 1.2rem;">${icon}</span>
                    <div>
                        <div style="font-weight: 600; font-size: 0.9rem; color: white;">${category}</div>
                        <div style="font-size: 0.7rem; color: #888; margin-top: 2px;">${this.suggestions[category].length} circuits</div>
                    </div>
                </div>
            `;
            
            categoryButton.style.cssText = `
                width: 100%;
                padding: 12px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                color: white;
                cursor: pointer;
                transition: all 0.3s ease;
                font-family: inherit;
            `;

            categoryButton.addEventListener('mouseenter', () => {
                categoryButton.style.background = 'rgba(0, 212, 255, 0.2)';
                categoryButton.style.borderColor = '#00d4ff';
                categoryButton.style.transform = 'translateX(5px)';
            });

            categoryButton.addEventListener('mouseleave', () => {
                if (this.currentCategory !== category) {
                    categoryButton.style.background = 'rgba(255, 255, 255, 0.05)';
                    categoryButton.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    categoryButton.style.transform = 'translateX(0)';
                }
            });

            categoryButton.addEventListener('click', () => {
                this.selectCategory(category);
            });

            categoriesList.appendChild(categoryButton);
        });
    }

    getCategoryIcon(category) {
        const icons = {
            'Quantum Algorithms': '🧮',
            'Quantum Error Correction': '🛡️',
            'Entanglement & Multi-qubit States': '🔗',
            'Quantum Gates & Decompositions': '⚙️',
            'Quantum Chemistry': '🧪',
            'Quantum Machine Learning': '🤖',
            'Variational Circuits': '🔄',
            'Quantum Communication': '📡',
            'Quantum Simulation': '🌐',
            'Benchmarking': '📊',
            'Advanced Techniques': '🔬'
        };
        return icons[category] || '⚛️';
    }

    selectCategory(category) {
        this.currentCategory = category;
        
        // Update category button styles
        document.querySelectorAll('.category-btn').forEach(btn => {
            if (btn.dataset.category === category) {
                btn.style.background = 'rgba(0, 212, 255, 0.3)';
                btn.style.borderColor = '#00d4ff';
                btn.style.transform = 'translateX(5px)';
            } else {
                btn.style.background = 'rgba(255, 255, 255, 0.05)';
                btn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                btn.style.transform = 'translateX(0)';
            }
        });

        // Update header
        document.getElementById('category-title').textContent = category;
        document.getElementById('category-description').textContent = this.getCategoryDescription(category);

        // Populate circuits
        this.populateCircuits(category);
    }

    getCategoryDescription(category) {
        const descriptions = {
            'Quantum Algorithms': 'Fundamental quantum algorithms that demonstrate quantum advantage over classical computation.',
            'Quantum Error Correction': 'Circuits designed to protect quantum information from decoherence and operational errors.',
            'Entanglement & Multi-qubit States': 'Circuits that create and manipulate entangled quantum states across multiple qubits.',
            'Quantum Gates & Decompositions': 'Basic quantum gates and their decompositions into elementary operations.',
            'Quantum Chemistry': 'Circuits for simulating molecular systems and chemical reactions on quantum computers.',
            'Quantum Machine Learning': 'Quantum circuits designed for machine learning tasks and pattern recognition.',
            'Variational Circuits': 'Parameterized quantum circuits optimized for NISQ-era quantum computers.',
            'Quantum Communication': 'Protocols for secure quantum communication and information transfer.',
            'Quantum Simulation': 'Circuits for simulating physical systems and many-body quantum dynamics.',
            'Benchmarking': 'Circuits designed to test and characterize quantum computer performance.',
            'Advanced Techniques': 'Sophisticated quantum control and compilation techniques.'
        };
        return descriptions[category] || 'Explore quantum circuits in this category.';
    }

    populateCircuits(category) {
        const circuitsGrid = document.getElementById('circuits-grid');
        circuitsGrid.innerHTML = '';

        const circuits = this.suggestions[category];
        
        circuits.forEach(circuit => {
            const circuitCard = document.createElement('div');
            circuitCard.className = 'circuit-card';
            circuitCard.style.cssText = `
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                padding: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            `;

            // Get circuit details from database
            const fullCircuit = this.circuitDatabase.getCircuit(circuit.id);
            const qubits = fullCircuit ? fullCircuit.qubits : 'N/A';
            const depth = fullCircuit ? fullCircuit.depth : 'N/A';
            const gates = fullCircuit ? fullCircuit.gates.length : 'N/A';

            circuitCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <h3 style="margin: 0; color: #00d4ff; font-size: 1.1rem; font-weight: 600; line-height: 1.3;">
                        ${circuit.name}
                    </h3>
                    <div style="
                        background: rgba(0, 212, 255, 0.2);
                        color: #00d4ff;
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 0.7rem;
                        font-weight: bold;
                        white-space: nowrap;
                    ">
                        ${qubits}Q • ${depth}D
                    </div>
                </div>
                
                <p style="
                    margin: 0 0 15px 0;
                    color: #b0b0b0;
                    font-size: 0.9rem;
                    line-height: 1.4;
                    height: 3.6em;
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                ">${circuit.description}</p>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                    <div style="display: flex; gap: 15px; font-size: 0.8rem; color: #888;">
                        <span>⚛️ ${gates} gates</span>
                        <span>🔬 ${qubits} qubits</span>
                    </div>
                    <button class="create-circuit-btn" data-circuit-id="${circuit.id}" style="
                        background: linear-gradient(45deg, #00d4ff, #0099cc);
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 20px;
                        font-size: 0.8rem;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(0, 212, 255, 0.3);
                    " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(0, 212, 255, 0.4)'" 
                       onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 15px rgba(0, 212, 255, 0.3)'">
                        Create & Run
                    </button>
                </div>
            `;

            // Add hover effects
            circuitCard.addEventListener('mouseenter', () => {
                circuitCard.style.background = 'rgba(255, 255, 255, 0.08)';
                circuitCard.style.borderColor = 'rgba(0, 212, 255, 0.5)';
                circuitCard.style.transform = 'translateY(-5px)';
                circuitCard.style.boxShadow = '0 10px 30px rgba(0, 212, 255, 0.2)';
            });

            circuitCard.addEventListener('mouseleave', () => {
                circuitCard.style.background = 'rgba(255, 255, 255, 0.05)';
                circuitCard.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                circuitCard.style.transform = 'translateY(0)';
                circuitCard.style.boxShadow = 'none';
            });

            circuitsGrid.appendChild(circuitCard);
        });

        // Add event listeners to create buttons
        document.querySelectorAll('.create-circuit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.createAndRunCircuit(btn.dataset.circuitId);
            });
        });
    }

    createAndRunCircuit(circuitId) {
        console.log(`Creating and running circuit: ${circuitId}`);
        
        // Get circuit from database
        const circuit = this.circuitDatabase.getCircuit(circuitId);
        if (!circuit) {
            console.error('Circuit not found:', circuitId);
            return;
        }

        // Convert to visualizer format
        const visualizerCircuit = this.circuitDatabase.convertToVisualizerFormat(circuitId);
        
        // Load circuit in 3D visualizer
        if (this.visualizerApp && this.visualizerApp.circuitBuilder) {
            try {
                // Clear existing circuit
                this.visualizerApp.clearCircuit();

                // Load new circuit
                this.visualizerApp.circuitBuilder.loadCircuit(visualizerCircuit);
                
                console.log(`✅ Loaded circuit: ${circuit.name}`);
                
                // Close suggestions panel
                this.hide();
                
                // Show success message
                this.showSuccessMessage(circuit.name);
                
            } catch (error) {
                console.error('Error loading circuit:', error);
                this.showErrorMessage('Failed to load circuit. Please try again.');
            }
        } else {
            console.error('Visualizer app not available');
            this.showErrorMessage('3D Visualizer not available. Please refresh the page.');
        }
    }

    showSuccessMessage(circuitName) {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(45deg, #00d4ff, #0099cc);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 10001;
            box-shadow: 0 10px 30px rgba(0, 212, 255, 0.3);
            animation: slideInRight 0.5s ease;
        `;
        
        message.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2rem;">✅</span>
                <div>
                    <div style="font-size: 0.9rem;">Circuit Loaded Successfully!</div>
                    <div style="font-size: 0.8rem; opacity: 0.9; margin-top: 2px;">${circuitName}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => {
                document.body.removeChild(message);
            }, 500);
        }, 3000);
    }

    showErrorMessage(errorText) {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(45deg, #ff6b6b, #cc5555);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 10001;
            box-shadow: 0 10px 30px rgba(255, 107, 107, 0.3);
            animation: slideInRight 0.5s ease;
        `;
        
        message.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2rem;">❌</span>
                <div>
                    <div style="font-size: 0.9rem;">Error</div>
                    <div style="font-size: 0.8rem; opacity: 0.9; margin-top: 2px;">${errorText}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => {
                document.body.removeChild(message);
            }, 500);
        }, 4000);
    }

    setupEventListeners() {
        // Close button
        document.getElementById('close-suggestions').addEventListener('click', () => {
            this.hide();
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });

        // Close on background click
        this.suggestionsPanel.addEventListener('click', (e) => {
            if (e.target === this.suggestionsPanel) {
                this.hide();
            }
        });
    }

    show() {
        this.suggestionsPanel.style.display = 'block';
        this.isVisible = true;
        
        // Animation
        this.suggestionsPanel.style.opacity = '0';
        this.suggestionsPanel.style.transform = 'translate(-50%, -50%) scale(0.9)';
        
        setTimeout(() => {
            this.suggestionsPanel.style.transition = 'all 0.3s ease';
            this.suggestionsPanel.style.opacity = '1';
            this.suggestionsPanel.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);
    }

    hide() {
        this.suggestionsPanel.style.transition = 'all 0.3s ease';
        this.suggestionsPanel.style.opacity = '0';
        this.suggestionsPanel.style.transform = 'translate(-50%, -50%) scale(0.9)';
        
        setTimeout(() => {
            this.suggestionsPanel.style.display = 'none';
            this.isVisible = false;
        }, 300);
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Export for use in other modules (browser-safe)
if (typeof window !== 'undefined' && !window.CircuitSuggestionsUI) {
    window.CircuitSuggestionsUI = CircuitSuggestionsUI;
}
