# 🌌 Quantum Spark QDE v2

### 🎯 Amravati Quantum Hackathon 2025 (Advanced Edition)

An advanced, production-ready hybrid quantum computing platform featuring an interactive 3D circuit builder, real-time Bloch sphere simulations, and a concurrent job execution manager with real-time telemetry.

---

## 👥 Development Team & Roles

| Role | Name | Email | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Team Lead** | Kadali Satish Kumar | prakashkadali3723@gmail.com | Project Architecture, UI/UX Design, Backend Integration, Team Coordination |
| **Developer** | Golakoti Durga Phani Kumari | durgaphanikumarigolakoti@gmail.com | Quantum Algorithms, Circuit Testing, Data Visualization |
| **Developer** | Akula Siva Sri Ram Pavan | rampavan264@gmail.com | API Development, Database Design, Security Features |
| **Developer** | Bacchala Siddardha | siddardha2105@gmail.com | 3D Visualizations, Circuit Builder, Interactive Features |
| **Developer** | Basu Vijay Babu | 246m5a0409@bvcr.edu.in | AI Integration, Automation, IBM Qiskit Integration |
| **Developer** | Annamneedi Trimurthulu | annamneedi.trimurthulu28@gmail.com | Testing & QA, Documentation, User Feedback |

---

## 🔑 Key Features

### 1. Concurrent Job Telemetry Manager
* **Asynchronous Execution:** Submit multiple quantum jobs simultaneously without blocking the dashboard interface.
* **Non-Blocking Telemetry:** Minimize running executions into horizontal, glassmorphic floating mini-trackers in the bottom-right corner.
* **Scrollable Queue UI:** View real-time queue positions, elapsed time, and backend information (e.g. `ibm_fez`) in a centralized scrollable queue overlay.
* **Dynamic Restoring:** Click any minimized mini-progress card to expand it back into the main queue modal.
* **Aborted Jobs:** Instantly cancel pending or running executions directly from the card.

### 2. 3D Quantum Circuit Builder
* **Interactive Workspace:** Drag-and-drop quantum gates onto 3D qubit wires built with Three.js.
* **Real-time Bloch Sphere Feedback:** Individual, interactive Bloch sphere visualizations that calculate and represent qubit states dynamically as gates are applied.
* **Circuit Library Toggle:** Slide-in circuit library ("Library") panel displaying pre-defined quantum algorithms, fully customizable.

### 3. AI Copilot Integration
* **Natural Language Circuits:** Generate full quantum circuits by entering descriptive natural language prompts.
* **Quantum Optimization:** Optimize circuit layout and gate counts automatically using integrated LLM models.

### 4. Advanced IBM Qiskit Connectivity
* **Primitive V2 Sampler Support:** Fully compatible with newer Qiskit sampler primitives, including dynamic results parsing.
* **Live Backends Explorer:** Real-time query of queue position, calibration status, and active backend list.

---

## 📁 Repository Structure
```
Quantum_Spark/
├── quantum_jobs_tracker/          # Main application directory
│   ├── hybrid_quantum_app.py      # Flask Server Entrypoint
│   ├── routes/                    # Modular Python Blueprints (jobs, backends, auth, ai)
│   ├── services/                  # Business logic (Gemini AI service, credentials)
│   ├── templates/                 # Frontend Jinja templates
│   │   ├── circuit_builder.html   # 3D Builder Workspace
│   │   └── modern_dashboard.html  # Main Analytics Dashboard
│   └── static/                    # Static Assets (Three.js scripts, stylesheets, visuals)
│       ├── unified_3d_circuit_visualizer.js # Visualizer & Telemetry Manager
│       └── circuit_builder.css    # Cleaned design tokens & stylesheets
└── README.md                      # This file
```

---

## 🚀 Quick Start Guide

### Prerequisites
* Python 3.8 or higher
* IBM Quantum account (for hardware execution)
* Google Gemini API key (for AI copilot functions)

### Installation Steps

1. **Clone & Navigate to Project Directory**
   ```bash
   cd d:\Quantum_Spark
   ```

2. **Activate Virtual Environment**
   * **Windows PowerShell:**
     ```powershell
     .\quantum_env\Scripts\Activate.ps1
     ```
   * **Windows CMD:**
     ```cmd
     .\quantum_env\Scripts\activate.bat
     ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the Application**
   ```bash
   cd quantum_jobs_tracker
   python hybrid_quantum_app.py
   ```

5. **Access the Dashboard**
   Open your browser and navigate to: `http://localhost:5000`

---

## 🏆 Achievements & Milestones
* **1st Place** - SRKR College Bhimavaram Semi-Finals
* **IBM Bangalore Visit** - Qiskit Masterclass with IBM Scientists

---

## 🔒 Security Best Practices
* Never hardcode API keys or IBM tokens. Use settings configuration modals to store credentials in local session state.
* Keep dependencies up to date via `requirements.txt`.
* Validate all circuit payloads at backend endpoints.

---

## 📚 Resources & Documentation
* [IBM Qiskit Documentation](https://docs.quantum.ibm.com/)
* [Flask Documentation](https://flask.palletsprojects.com/)
* [Google Gemini API](https://ai.google.dev/)

---

## 📄 License
Developed for the **Amravati Quantum Hackathon 2025**. All rights reserved.

*Version: 2.0 (QDE v2)*
*Last Updated: July 2, 2026*
