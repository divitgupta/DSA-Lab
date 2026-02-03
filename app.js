// ==================== DATA STRUCTURES ====================

// Enums
const DiseaseType = {
    GENERAL: 1,
    INFECTION: 2,
    RESPIRATORY: 3,
    TRAUMA: 4,
    CARDIAC: 5
};

// Patient Criticality Levels
const CriticalityLevel = {
    LOW: 1,        // Non-urgent, minor injury or illness
    MEDIUM: 2,     // Serious but conscious and stable
    HIGH: 3,       // Urgent, severe pain/bleeding/breathing difficulty
    CRITICAL: 4    // Life-threatening, unconscious, not breathing
};

const AmbulanceState = {
    IDLE: 0,
    TO_EMERGENCY: 1,
    AT_SCENE: 2,
    TO_HOSPITAL: 3,
    RETURNING: 4
};

// Global State
let locations = [];
let hospitals = [];
let ambulances = [];
let activeEmergencies = [];
let pendingQueue = [];
let roads = {};

let currentTime = 0;
let nextEmergencyId = 1;
let totalHandled = 0;
let totalResponseTime = 0;
let activityLog = [];

let simulationInterval = null;

// ==================== INITIALIZATION ====================

function setupLocations() {
    locations = [
        { name: "City Center", x: 50, y: 300 },
        { name: "Main Street", x: 150, y: 300 },
        { name: "Park Avenue", x: 300, y: 300 },
        { name: "Shopping Mall", x: 450, y: 300 },
        { name: "University", x: 550, y: 300 },
        { name: "Airport", x: 700, y: 300 },
        { name: "North Market", x: 50, y: 150 },
        { name: "Residential", x: 150, y: 150 },
        { name: "Industrial Zone", x: 750, y: 400 },
        { name: "Tech Park", x: 750, y: 500 }
    ];
}

function setupRoads() {
    roads = {};
    for (let i = 0; i < locations.length; i++) {
        roads[i] = [];
    }

    // Add bidirectional roads (matching C implementation)
    addRoad(0, 1, 4); addRoad(1, 2, 6); addRoad(2, 3, 5);
    addRoad(3, 4, 3); addRoad(4, 5, 7); addRoad(1, 5, 10);
    addRoad(0, 6, 8); addRoad(6, 7, 4); addRoad(7, 3, 6);
    addRoad(5, 8, 5); addRoad(8, 9, 3);
}

function addRoad(from, to, distance) {
    roads[from].push({ destination: to, distance: distance });
    roads[to].push({ destination: from, distance: distance });
}

function setupHospitals() {
    hospitals = [
        {
            name: "City General",
            location: 0,
            capacity: 10,
            patients: 0,
            specialty: DiseaseType.GENERAL
        },
        {
            name: "Heart Center",
            location: 5,
            capacity: 5,
            patients: 0,
            specialty: DiseaseType.CARDIAC
        },
        {
            name: "Trauma Unit",
            location: 9,
            capacity: 8,
            patients: 0,
            specialty: DiseaseType.TRAUMA
        },
        {
            name: "Children's Hospital",
            location: 6,
            capacity: 6,
            patients: 0,
            specialty: DiseaseType.RESPIRATORY
        }
    ];
}

function setupAmbulances() {
    ambulances = [
        {
            id: 1,
            state: AmbulanceState.IDLE,
            location: 1,
            availableAt: 0,
            targetEmergency: -1,
            targetHospital: -1,
            estimatedArrival: 0,
            baseHospital: 0
        },
        {
            id: 2,
            state: AmbulanceState.IDLE,
            location: 4,
            availableAt: 0,
            targetEmergency: -1,
            targetHospital: -1,
            estimatedArrival: 0,
            baseHospital: 0
        },
        {
            id: 3,
            state: AmbulanceState.IDLE,
            location: 7,
            availableAt: 0,
            targetEmergency: -1,
            targetHospital: -1,
            estimatedArrival: 0,
            baseHospital: 0
        },
        {
            id: 4,
            state: AmbulanceState.IDLE,
            location: 2,
            availableAt: 0,
            targetEmergency: -1,
            targetHospital: -1,
            estimatedArrival: 0,
            baseHospital: 1
        },
        {
            id: 5,
            state: AmbulanceState.IDLE,
            location: 5,
            availableAt: 0,
            targetEmergency: -1,
            targetHospital: -1,
            estimatedArrival: 0,
            baseHospital: 1
        }
    ];
}

// ==================== PATHFINDING (Dijkstra) ====================

function findShortestPath(from, to) {
    const distance = new Array(locations.length).fill(99999);
    const visited = new Array(locations.length).fill(false);
    distance[from] = 0;

    for (let count = 0; count < locations.length; count++) {
        let minDist = 99999;
        let closest = -1;

        for (let i = 0; i < locations.length; i++) {
            if (!visited[i] && distance[i] < minDist) {
                minDist = distance[i];
                closest = i;
            }
        }

        if (closest === -1) break;
        visited[closest] = true;

        for (let road of roads[closest]) {
            const newDist = distance[closest] + road.distance;
            if (newDist < distance[road.destination]) {
                distance[road.destination] = newDist;
            }
        }
    }

    return distance[to];
}

// ==================== PRIORITY & HOSPITAL SELECTION ====================

// Legacy priority function (kept for compatibility)
function calculatePriority(disease, age) {
    let priority = disease * 3;
    if (disease === DiseaseType.CARDIAC && age >= 60) priority += 3;
    if (disease === DiseaseType.RESPIRATORY && (age <= 10 || age >= 60)) priority += 2;
    return priority;
}

/**
 * Calculate priority score from user-selected criticality level
 * Higher scores = higher priority in dispatch queue (max-heap)
 * 
 * Formula: (CriticalityLevel × 20) + (DiseaseType × 2) + age_modifier
 * 
 * Priority Brackets:
 * - CRITICAL (4): 80+ points - Dispatched immediately
 * - HIGH (3):     60+ points - Urgent response
 * - MEDIUM (2):   40+ points - Standard priority
 * - LOW (1):      20+ points - Non-urgent
 */
function calculatePriorityFromCriticality(critLevel, disease, age) {
    let priority = critLevel * 20;              // Base criticality score
    priority += disease * 2;                     // Disease type modifier
    if (age >= 60 || age <= 10) priority += 3;  // Age-based risk modifier
    return priority;
}

/**
 * Convert criticality level to display string
 */
function getCriticalityString(level) {
    switch (level) {
        case CriticalityLevel.CRITICAL: return 'CRITICAL';
        case CriticalityLevel.HIGH: return 'HIGH';
        case CriticalityLevel.MEDIUM: return 'MEDIUM';
        case CriticalityLevel.LOW: return 'LOW';
        default: return 'UNKNOWN';
    }
}

/**
 * Get visual indicator for criticality level
 */
function getCriticalityIndicator(level) {
    switch (level) {
        case CriticalityLevel.CRITICAL: return '[!!!]';
        case CriticalityLevel.HIGH: return '[!!]';
        case CriticalityLevel.MEDIUM: return '[!]';
        case CriticalityLevel.LOW: return '[ ]';
        default: return '[?]';
    }
}

function getDynamicServiceTime(disease, age) {
    const MIN_SERVICE_TIME = 3;
    const MAX_SERVICE_TIME = 8;
    let baseTime = MIN_SERVICE_TIME + Math.floor(Math.random() * (MAX_SERVICE_TIME - MIN_SERVICE_TIME + 1));

    if (disease === DiseaseType.TRAUMA) baseTime += 2;
    if (disease === DiseaseType.CARDIAC && age >= 60) baseTime += 1;
    if (age >= 80) baseTime += 1;

    return baseTime;
}

function findBestHospital(emergencyLoc, disease) {
    let best = -1;
    let bestScore = 99999;

    for (let i = 0; i < hospitals.length; i++) {
        if (hospitals[i].patients >= hospitals[i].capacity) continue;

        const distance = findShortestPath(emergencyLoc, hospitals[i].location);
        let score = distance * 10;
        if (hospitals[i].specialty === disease) score -= 50;

        if (score < bestScore) {
            bestScore = score;
            best = i;
        }
    }

    return best;
}

// ==================== PRIORITY QUEUE (Max-Heap) ====================

function heapSwap(i, j) {
    const temp = pendingQueue[i];
    pendingQueue[i] = pendingQueue[j];
    pendingQueue[j] = temp;
}

function enqueueEmergency(caller, loc, disease, age, critLevel) {
    const emergency = {
        id: nextEmergencyId++,
        caller: caller,
        location: loc,
        disease: disease,
        age: age,
        criticalityLevel: critLevel,
        criticalityDesc: getCriticalityString(critLevel),
        priority: calculatePriorityFromCriticality(critLevel, disease, age),
        assignedAmbulance: -1,
        canReassign: true,
        reportTime: currentTime,
        serviceTime: getDynamicServiceTime(disease, age)
    };

    pendingQueue.push(emergency);
    let i = pendingQueue.length - 1;

    // Heapify up
    while (i > 0 && pendingQueue[Math.floor((i - 1) / 2)].priority < pendingQueue[i].priority) {
        heapSwap(i, Math.floor((i - 1) / 2));
        i = Math.floor((i - 1) / 2);
    }

    logActivity(`Emergency #${emergency.id} queued: ${caller} (${emergency.criticalityDesc}, Priority: ${emergency.priority})`);
    showNotification(`Emergency #${emergency.id} queued - ${caller} [${emergency.criticalityDesc}]`, 'success');
    return emergency;
}

function dequeueEmergency() {
    if (pendingQueue.length === 0) return null;

    const top = pendingQueue[0];
    pendingQueue[0] = pendingQueue[pendingQueue.length - 1];
    pendingQueue.pop();

    // Heapify down
    let i = 0;
    while (true) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let largest = i;

        if (left < pendingQueue.length && pendingQueue[left].priority > pendingQueue[largest].priority) {
            largest = left;
        }
        if (right < pendingQueue.length && pendingQueue[right].priority > pendingQueue[largest].priority) {
            largest = right;
        }

        if (largest === i) break;
        heapSwap(i, largest);
        i = largest;
    }

    return top;
}

// ==================== AMBULANCE MANAGEMENT ====================

function findNearestIdleAmbulance(emergencyLoc) {
    let best = -1;
    let shortestDist = 99999;

    for (let i = 0; i < ambulances.length; i++) {
        if (ambulances[i].state === AmbulanceState.IDLE) {
            const dist = findShortestPath(ambulances[i].location, emergencyLoc);
            if (dist < shortestDist) {
                shortestDist = dist;
                best = i;
            }
        }
    }

    return best;
}

function findActiveEmergency(emergencyId) {
    return activeEmergencies.find(e => e.id === emergencyId);
}

function dispatchAmbulance(ambIndex, emerg) {
    const hospIndex = findBestHospital(emerg.location, emerg.disease);

    if (hospIndex === -1) {
        enqueueEmergency(emerg.caller, emerg.location, emerg.disease, emerg.age, emerg.criticalityLevel);
        showNotification('No hospital available - emergency re-queued', 'warning');
        return;
    }

    const distToScene = findShortestPath(ambulances[ambIndex].location, emerg.location);

    ambulances[ambIndex].state = AmbulanceState.TO_EMERGENCY;
    ambulances[ambIndex].targetEmergency = emerg.id;
    ambulances[ambIndex].targetHospital = hospIndex;
    ambulances[ambIndex].availableAt = currentTime + distToScene;
    ambulances[ambIndex].estimatedArrival = currentTime + distToScene;

    emerg.assignedAmbulance = ambIndex;
    emerg.canReassign = true;
    activeEmergencies.push(emerg);

    hospitals[hospIndex].patients++;
    totalResponseTime += distToScene;

    logActivity(`Unit-${ambIndex + 1} dispatched to ${emerg.caller} [${emerg.criticalityDesc}] (ETA: ${distToScene} min)`);

    showNotification(
        `Unit-${ambIndex + 1} dispatched to ${emerg.caller} [${emerg.criticalityDesc}] (ETA: ${distToScene} min)`,
        'success'
    );
}

function checkReassignmentOpportunities() {
    const REASSIGN_THRESHOLD = 5;

    for (let emerg of activeEmergencies) {
        if (!emerg.canReassign || emerg.assignedAmbulance === -1) continue;

        const currentAmb = emerg.assignedAmbulance;
        const currentETA = ambulances[currentAmb].estimatedArrival;

        const nearestAmb = findNearestIdleAmbulance(emerg.location);

        if (nearestAmb !== -1 && nearestAmb !== currentAmb) {
            const newDist = findShortestPath(ambulances[nearestAmb].location, emerg.location);
            const newETA = currentTime + newDist;

            if (currentETA - newETA >= REASSIGN_THRESHOLD) {
                logActivity(`Reassigning Emergency #${emerg.id} from Unit-${currentAmb + 1} to Unit-${nearestAmb + 1}`);

                showNotification(
                    `REASSIGNMENT: Unit-${nearestAmb + 1} now assigned to Emergency #${emerg.id} (saves ${currentETA - newETA} min)`,
                    'warning'
                );

                ambulances[currentAmb].state = AmbulanceState.IDLE;
                ambulances[currentAmb].targetEmergency = -1;

                dispatchAmbulance(nearestAmb, emerg);
                return;
            }
        }
    }
}

function updateAmbulanceStates() {
    for (let amb of ambulances) {
        if (amb.state === AmbulanceState.IDLE) continue;

        if (currentTime >= amb.availableAt) {
            if (amb.state === AmbulanceState.TO_EMERGENCY) {
                amb.state = AmbulanceState.AT_SCENE;

                const emerg = findActiveEmergency(amb.targetEmergency);
                if (emerg) {
                    amb.location = emerg.location;
                    amb.availableAt = currentTime + emerg.serviceTime;
                    emerg.canReassign = false;
                }
            }
            else if (amb.state === AmbulanceState.AT_SCENE) {
                amb.state = AmbulanceState.TO_HOSPITAL;
                const dist = findShortestPath(amb.location, hospitals[amb.targetHospital].location);
                amb.availableAt = currentTime + dist;
            }
            else if (amb.state === AmbulanceState.TO_HOSPITAL) {
                amb.state = AmbulanceState.RETURNING;
                amb.location = hospitals[amb.targetHospital].location;

                // Remove from active emergencies
                const index = activeEmergencies.findIndex(e => e.id === amb.targetEmergency);
                if (index !== -1) {
                    const emerg = activeEmergencies[index];
                    activeEmergencies.splice(index, 1);
                    totalHandled++;
                    logActivity(`Emergency #${emerg.id} completed - Patient delivered to ${hospitals[amb.targetHospital].name}`);
                }

                const returnDist = findShortestPath(amb.location, hospitals[amb.baseHospital].location);
                amb.availableAt = currentTime + returnDist;

                amb.targetEmergency = -1;
                amb.targetHospital = -1;
            }
            else if (amb.state === AmbulanceState.RETURNING) {
                amb.state = AmbulanceState.IDLE;
                amb.location = hospitals[amb.baseHospital].location;

                checkReassignmentOpportunities();
            }
        }
    }
}

function processQueue() {
    if (pendingQueue.length === 0) return;

    const ambIndex = findNearestIdleAmbulance(pendingQueue[0].location);
    if (ambIndex !== -1) {
        const emerg = dequeueEmergency();
        dispatchAmbulance(ambIndex, emerg);
    }
}

function advanceTime(minutes = 1) {
    for (let i = 0; i < minutes; i++) {
        currentTime++;
        updateAmbulanceStates();
        processQueue();

        // Discharge patients every 15 minutes
        if (currentTime % 15 === 0) {
            for (let hosp of hospitals) {
                if (hosp.patients > 0) {
                    hosp.patients--;
                }
            }
        }
    }

    updateUI();
}

// ==================== UI UPDATES ====================

function updateUI() {
    // Update header
    document.getElementById('currentTime').textContent = `${currentTime} min`;
    document.getElementById('headerActiveCount').textContent = activeEmergencies.length;
    document.getElementById('headerQueueCount').textContent = pendingQueue.length;

    // Update ambulance list
    updateAmbulanceList();

    // Update hospital list
    updateHospitalList();

    // Update emergency queue
    updateEmergencyQueue();

    // Update statistics
    updateStatistics();

    // Render map
    renderMap();
}

function updateAmbulanceList() {
    const container = document.getElementById('ambulanceList');
    container.innerHTML = '';

    let idleCount = 0;
    for (let amb of ambulances) {
        if (amb.state === AmbulanceState.IDLE) idleCount++;

        const card = document.createElement('div');
        card.className = 'ambulance-card' + (amb.state !== AmbulanceState.IDLE ? ' active' : '');

        const statusText = getStatusText(amb.state);
        const statusClass = amb.state === AmbulanceState.IDLE ? 'idle' : 'busy';

        let info = '';
        if (amb.state === AmbulanceState.IDLE) {
            info = `at ${locations[amb.location].name}`;
        } else {
            info = `free in ${amb.availableAt - currentTime} min`;
        }

        card.innerHTML = `
            <div class="ambulance-header">
                <span class="ambulance-id">🚑 Unit-${amb.id}</span>
                <span class="ambulance-status ${statusClass}">${statusText}</span>
            </div>
            <div class="ambulance-info">${info}</div>
        `;

        container.appendChild(card);
    }

    document.getElementById('ambulanceCount').textContent = `${idleCount}/${ambulances.length}`;
}

function getStatusText(state) {
    switch (state) {
        case AmbulanceState.IDLE: return 'Available';
        case AmbulanceState.TO_EMERGENCY: return 'En Route';
        case AmbulanceState.AT_SCENE: return 'On Scene';
        case AmbulanceState.TO_HOSPITAL: return 'Transport';
        case AmbulanceState.RETURNING: return 'Returning';
        default: return 'Unknown';
    }
}

function updateHospitalList() {
    const container = document.getElementById('hospitalList');
    container.innerHTML = '';

    let totalBeds = 0;
    let usedBeds = 0;

    for (let hosp of hospitals) {
        totalBeds += hosp.capacity;
        usedBeds += hosp.patients;

        const card = document.createElement('div');
        card.className = 'hospital-card';

        const specialtyName = getSpecialtyName(hosp.specialty);
        const percentage = (hosp.patients / hosp.capacity) * 100;
        const fillClass = percentage > 80 ? 'warning' : '';

        card.innerHTML = `
            <div class="hospital-name">${hosp.name}</div>
            <div class="hospital-specialty">${specialtyName}</div>
            <div class="capacity-bar">
                <div class="capacity-fill ${fillClass}" style="width: ${percentage}%"></div>
            </div>
            <div class="capacity-text">${hosp.patients}/${hosp.capacity} beds</div>
        `;

        container.appendChild(card);
    }

    document.getElementById('hospitalBeds').textContent = `${usedBeds}/${totalBeds}`;
}

function getSpecialtyName(specialty) {
    switch (specialty) {
        case DiseaseType.GENERAL: return '⚕️ General Care';
        case DiseaseType.CARDIAC: return '❤️ Cardiac Specialist';
        case DiseaseType.TRAUMA: return '🩹 Trauma Center';
        case DiseaseType.RESPIRATORY: return '🫁 Respiratory Care';
        case DiseaseType.INFECTION: return '🦠 Infection Control';
        default: return 'Unknown';
    }
}

function updateEmergencyQueue() {
    const container = document.getElementById('emergencyQueue');

    if (pendingQueue.length === 0) {
        container.innerHTML = '<div class="empty-state">No pending emergencies</div>';
    } else {
        container.innerHTML = '';

        for (let emerg of pendingQueue) {
            const item = document.createElement('div');
            item.className = 'emergency-item';

            // Add criticality class for styling
            const criticalityClass = emerg.criticalityDesc ? emerg.criticalityDesc.toLowerCase() : '';
            if (criticalityClass) {
                item.classList.add(`criticality-${criticalityClass}`);
            }

            const waitTime = currentTime - emerg.reportTime;
            const indicator = getCriticalityIndicator(emerg.criticalityLevel || CriticalityLevel.MEDIUM);

            item.innerHTML = `
                <div class="emergency-header">
                    <span class="emergency-indicator">${indicator}</span>
                    <span class="emergency-name">#${emerg.id}: ${emerg.caller}</span>
                    <span class="priority-badge">P${emerg.priority}</span>
                </div>
                <div class="emergency-details">
                    ${locations[emerg.location].name} • ${emerg.criticalityDesc || 'MEDIUM'} • Waiting ${waitTime} min
                </div>
            `;

            container.appendChild(item);
        }
    }

    document.getElementById('queueCount').textContent = pendingQueue.length;
}

function updateStatistics() {
    document.getElementById('totalHandled').textContent = totalHandled;
    document.getElementById('activeCalls').textContent = activeEmergencies.length;

    const idleCount = ambulances.filter(a => a.state === AmbulanceState.IDLE).length;
    document.getElementById('availableUnits').textContent = idleCount;

    const avgResponse = totalHandled > 0 ? (totalResponseTime / totalHandled).toFixed(1) + ' min' : '--';
    document.getElementById('avgResponse').textContent = avgResponse;
}

// ==================== ACTIVITY LOG ====================

function logActivity(message) {
    activityLog.unshift({
        time: currentTime,
        message: message
    });

    // Keep only last 50 entries
    if (activityLog.length > 50) {
        activityLog.pop();
    }

    updateActivityLog();
}

function updateActivityLog() {
    const container = document.getElementById('activityLog');
    container.innerHTML = '';

    for (let activity of activityLog) {
        const item = document.createElement('div');
        item.className = 'activity-item';

        item.innerHTML = `
            <span class="activity-time">T+${activity.time}</span>
            <span class="activity-message">${activity.message}</span>
        `;

        container.appendChild(item);
    }
}

// ==================== NOTIFICATIONS ====================

function showNotification(message, type = 'success') {
    const container = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// ==================== EVENT HANDLERS ====================

function init() {
    setupLocations();
    setupRoads();
    setupHospitals();
    setupAmbulances();

    updateUI();

    // Event listeners
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
        advanceTime(1);
    });

    document.getElementById('autoRunBtn').addEventListener('click', () => {
        if (simulationInterval) {
            clearInterval(simulationInterval);
            simulationInterval = null;
            document.getElementById('autoRunBtn').innerHTML = '<span class="btn-icon">▶️</span>Auto Run (10 steps)';
        } else {
            let steps = 0;
            simulationInterval = setInterval(() => {
                advanceTime(1);
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

    document.getElementById('resetBtn').addEventListener('click', () => {
        if (confirm('Reset the entire simulation?')) {
            resetSimulation();
        }
    });

    // Close modal on backdrop click
    document.getElementById('emergencyModal').addEventListener('click', (e) => {
        if (e.target.id === 'emergencyModal') {
            closeModal();
        }
    });
}

function closeModal() {
    document.getElementById('emergencyModal').classList.remove('active');
    document.getElementById('emergencyForm').reset();
}

function handleEmergencySubmit() {
    const name = document.getElementById('callerName').value;
    const location = parseInt(document.getElementById('location').value);
    const disease = parseInt(document.querySelector('input[name="emergencyType"]:checked').value);
    const age = parseInt(document.getElementById('patientAge').value);
    const criticality = parseInt(document.querySelector('input[name="criticality"]:checked').value);

    const emergency = enqueueEmergency(name, location, disease, age, criticality);

    // Show confirmation with criticality
    showNotification(
        `Emergency registered: ${name} [${emergency.criticalityDesc}] - Priority Score: ${emergency.priority}`,
        'success'
    );

    advanceTime(2); // Process theemergency

    closeModal();
}

function resetSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }

    currentTime = 0;
    nextEmergencyId = 1;
    totalHandled = 0;
    totalResponseTime = 0;
    activeEmergencies = [];
    pendingQueue = [];

    setupAmbulances();

    for (let hosp of hospitals) {
        hosp.patients = 0;
    }

    activityLog = [{ time: 0, message: 'System reset - All units ready' }];

    updateUI();
    showNotification('Simulation reset!', 'success');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
