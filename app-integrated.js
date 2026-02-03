// ==================== CONFIGURATION ====================

// Set to true to use MongoDB backend, false for local JavaScript
const USE_BACKEND_API = true;
const AUTO_SYNC_INTERVAL = 2000; // Sync every 2 seconds

let syncInterval = null;

// ==================== INITIALIZATION ====================

// Modified init function to detect backend availability
async function init() {
    setupLocations();
    setupRoads();

    if (USE_BACKEND_API) {
        try {
            await initializeFromBackend();
            startAutoSync();
            showNotification('Connected to backend API! 🎉', 'success');
        } catch (error) {
            console.warn('Backend not available, using local mode:', error);
            showNotification('Using local mode (backend offline)', 'warning');
            setupHospitals();
            setupAmbulances();
        }
    } else {
        setupHospitals();
        setupAmbulances();
    }

    updateUI();
    setupEventListeners();
}

// ==================== BACKEND INTEGRATION ====================

async function initializeFromBackend() {
    console.log('🔄 Loading data from backend...');

    // Load system state
    const state = await api.getSystemState();
    currentTime = state.currentTime;
    nextEmergencyId = state.nextEmergencyId;
    totalHandled = state.totalHandled;
    totalResponseTime = state.totalResponseTime;

    // Load hospitals
    const hospitalData = await api.getAllHospitals();
    hospitals = hospitalData.map(h => ({
        name: h.name,
        location: h.location,
        capacity: h.capacity,
        patients: h.currentPatients,
        specialty: h.specialty
    }));

    // Load ambulances
    const ambulanceData = await api.getAllAmbulances();
    ambulances = ambulanceData.map(a => ({
        id: a.ambulanceId,
        state: getStateCodeFromString(a.state),
        location: a.location,
        availableAt: a.availableAt,
        targetEmergency: a.targetEmergency,
        targetHospital: a.targetHospital,
        estimatedArrival: a.estimatedArrival,
        baseHospital: a.baseHospital
    }));

    // Load emergencies
    const pendingData = await api.getPendingEmergencies();
    pendingQueue = pendingData.map(e => ({
        id: e.emergencyId,
        caller: e.caller,
        location: e.location,
        disease: e.disease,
        age: e.age,
        priority: e.priority,
        assignedAmbulance: e.assignedAmbulance,
        canReassign: e.canReassign,
        reportTime: e.reportTime,
        serviceTime: e.serviceTime
    }));

    const activeData = await api.getActiveEmergencies();
    activeEmergencies = activeData.map(e => ({
        id: e.emergencyId,
        caller: e.caller,
        location: e.location,
        disease: e.disease,
        age: e.age,
        priority: e.priority,
        assignedAmbulance: e.assignedAmbulance,
        canReassign: e.canReassign,
        reportTime: e.reportTime,
        serviceTime: e.serviceTime
    }));

    console.log('✅ Data loaded from backend');
}

function getStateCodeFromString(stateStr) {
    const states = {
        'IDLE': 0,
        'TO_EMERGENCY': 1,
        'AT_SCENE': 2,
        'TO_HOSPITAL': 3,
        'RETURNING': 4
    };
    return states[stateStr] || 0;
}

function getStateStringFromCode(stateCode) {
    const states = ['IDLE', 'TO_EMERGENCY', 'AT_SCENE', 'TO_HOSPITAL', 'RETURNING'];
    return states[stateCode] || 'IDLE';
}

// Auto-sync with backend
function startAutoSync() {
    if (syncInterval) clearInterval(syncInterval);

    syncInterval = setInterval(async () => {
        if (USE_BACKEND_API) {
            try {
                await syncWithBackend();
            } catch (error) {
                console.warn('Sync failed:', error);
            }
        }
    }, AUTO_SYNC_INTERVAL);
}

async function syncWithBackend() {
    const state = await api.getSystemState();
    currentTime = state.currentTime;
    totalHandled = state.totalHandled;
    totalResponseTime = state.totalResponseTime;

    const ambulanceData = await api.getAllAmbulances();
    ambulances.forEach((amb, index) => {
        if (ambulanceData[index]) {
            amb.state = getStateCodeFromString(ambulanceData[index].state);
            amb.location = ambulanceData[index].location;
            amb.availableAt = ambulanceData[index].availableAt;
        }
    });

    const pendingData = await api.getPendingEmergencies();
    pendingQueue = pendingData.map(e => ({
        id: e.emergencyId,
        caller: e.caller,
        location: e.location,
        disease: e.disease,
        age: e.age,
        priority: e.priority,
        assignedAmbulance: e.assignedAmbulance,
        canReassign: e.canReassign,
        reportTime: e.reportTime,
        serviceTime: e.serviceTime
    }));

    updateUI();
}

// ==================== MODIFIED FUNCTIONS ====================

// Modified emergency submission to use backend
async function handleEmergencySubmit() {
    const name = document.getElementById('callerName').value;
    const location = parseInt(document.getElementById('location').value);
    const disease = parseInt(document.querySelector('input[name="emergencyType"]:checked').value);
    const age = parseInt(document.getElementById('patientAge').value);

    if (USE_BACKEND_API) {
        try {
            await api.createEmergency({ caller: name, location, disease, age });
            showNotification(`Emergency created for ${name}`, 'success');
            await syncWithBackend();
        } catch (error) {
            showNotification('Failed to create emergency', 'error');
            console.error(error);
        }
    } else {
        enqueueEmergency(name, location, disease, age);
        advanceTime(2);
    }

    closeModal();
}

// Modified time advance to use backend
async function advanceTimeWrapper(minutes = 1) {
    if (USE_BACKEND_API) {
        try {
            await api.advanceTime(minutes);
            await syncWithBackend();
        } catch (error) {
            showNotification('Backend not available, using local mode', 'warning');
            advanceTime(minutes);
        }
    } else {
        advanceTime(minutes);
    }
}

// Modified reset to use backend
async function resetSimulationWrapper() {
    if (!confirm('Reset the entire simulation?')) return;

    if (USE_BACKEND_API) {
        try {
            await api.resetSystem();
            await api.healthCheck(); // Reinitialize backend
            await initializeFromBackend();
            showNotification('System reset!', 'success');
        } catch (error) {
            showNotification('Failed to reset backend', 'error');
            console.error(error);
        }
    } else {
        resetSimulation();
    }
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    document.getElementById('newEmergencyBtn').addEventListener('click', () => {
        document.getElementById('emergencyModal').classList.add('active');
    });

    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);

    document.getElementById('emergencyForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleEmergencySubmit();
    });

    document.getElementById('advanceTimeBtn').addEventListener('click', () => {
        advanceTimeWrapper(1);
    });

    document.getElementById('autoRunBtn').addEventListener('click', () => {
        if (simulationInterval) {
            clearInterval(simulationInterval);
            simulationInterval = null;
            document.getElementById('autoRunBtn').innerHTML = '<span class="btn-icon">▶️</span>Auto Run (10 steps)';
        } else {
            let steps = 0;
            simulationInterval = setInterval(async () => {
                await advanceTimeWrapper(1);
                steps++;
                if (steps >= 10) {
                    clearInterval(simulationInterval);
                    simulationInterval = null;
                    document.getElementById('autoRunBtn').innerHTML = '<span class="btn-icon">▶️</span>Auto Run (10 steps)';
                    showNotification('Auto-run simulation complete!', 'success');
                }
            }, 500);
            document.getElementById('autoRunBtn').innerHTML = '<span class="btn-icon">⏸</span>Stop Auto Run';
        }
    });

    document.getElementById('clearLogBtn').addEventListener('click', () => {
        activityLog = [{ time: currentTime, message: 'Activity log cleared' }];
        updateActivityLog();
    });

    document.getElementById('resetBtn').addEventListener('click', resetSimulationWrapper);

    document.getElementById('emergencyModal').addEventListener('click', (e) => {
        if (e.target.id === 'emergencyModal') {
            closeModal();
        }
    });
}

// ==================== STATUS INDICATOR ====================

function addBackendStatusIndicator() {
    const header = document.querySelector('.header-right');
    const indicator = document.createElement('div');
    indicator.className = 'backend-status';
    indicator.innerHTML = `
        <span class="status-dot ${USE_BACKEND_API ? 'online' : 'offline'}"></span>
        <span class="status-text">${USE_BACKEND_API ? 'Backend' : 'Local'}</span>
    `;
    header.prepend(indicator);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await init();
    addBackendStatusIndicator();
});
