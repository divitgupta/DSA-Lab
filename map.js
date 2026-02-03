// ==================== MAP RENDERING ====================

const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

// Map configuration
const MAP_CONFIG = {
    width: 800,
    height: 600,
    padding: 50,
    nodeRadius: 20,
    ambulanceRadius: 12,
    emergencyRadius: 10
};

// Color scheme
const COLORS = {
    background: '#151925',
    road: 'rgba(168, 85, 247, 0.3)',
    roadActive: 'rgba(0, 212, 255, 0.6)',
    location: 'rgba(30, 36, 51, 0.8)',
    locationBorder: 'rgba(255, 255, 255, 0.2)',
    hospital: '#10b981',
    ambulanceIdle: '#00d4ff',
    ambulanceBusy: '#ff6b35',
    emergency: '#ef4444',
    text: '#ffffff',
    textSecondary: '#a8b3cf',
    label: '#6b7b9c'
};

// Animation state
let animationFrame = null;
let ambulanceAnimations = {};

function renderMap() {
    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, MAP_CONFIG.width, MAP_CONFIG.height);

    // Draw roads
    drawRoads();

    // Draw locations
    drawLocations();

    // Draw hospitals
    drawHospitals();

    // Draw active routes
    drawActiveRoutes();

    // Draw emergencies
    drawEmergencies();

    // Draw ambulances
    drawAmbulances();

    // Draw legend/labels
    drawLabels();
}

function drawRoads() {
    ctx.strokeStyle = COLORS.road;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    for (let locIdx in roads) {
        const fromLoc = locations[locIdx];

        for (let road of roads[locIdx]) {
            const toLoc = locations[road.destination];

            ctx.beginPath();
            ctx.moveTo(fromLoc.x, fromLoc.y);
            ctx.lineTo(toLoc.x, toLoc.y);
            ctx.stroke();

            // Draw distance label
            const midX = (fromLoc.x + toLoc.x) / 2;
            const midY = (fromLoc.y + toLoc.y) / 2;

            ctx.fillStyle = COLORS.label;
            ctx.font = '10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(`${road.distance}km`, midX, midY - 5);
        }
    }

    ctx.setLineDash([]);
}

function drawLocations() {
    for (let i = 0; i < locations.length; i++) {
        const loc = locations[i];

        // Check if this is a hospital location
        const isHospital = hospitals.some(h => h.location === i);

        if (!isHospital) {
            // Draw location circle
            ctx.fillStyle = COLORS.location;
            ctx.strokeStyle = COLORS.locationBorder;
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.arc(loc.x, loc.y, MAP_CONFIG.nodeRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Draw location label
            ctx.fillStyle = COLORS.textSecondary;
            ctx.font = 'bold 11px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(loc.name, loc.x, loc.y + MAP_CONFIG.nodeRadius + 15);
        }
    }
}

function drawHospitals() {
    for (let hosp of hospitals) {
        const loc = locations[hosp.location];

        // Draw hospital with special styling
        const gradient = ctx.createRadialGradient(loc.x, loc.y, 0, loc.x, loc.y, MAP_CONFIG.nodeRadius);
        gradient.addColorStop(0, COLORS.hospital);
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.3)');

        ctx.fillStyle = gradient;
        ctx.strokeStyle = COLORS.hospital;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(loc.x, loc.y, MAP_CONFIG.nodeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw hospital icon
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('🏥', loc.x, loc.y);

        // Draw hospital name
        ctx.font = 'bold 11px Inter';
        ctx.fillStyle = COLORS.hospital;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(hosp.name, loc.x, loc.y + MAP_CONFIG.nodeRadius + 15);

        // Draw capacity info
        ctx.font = '9px Inter';
        ctx.fillStyle = COLORS.textSecondary;
        ctx.fillText(`${hosp.patients}/${hosp.capacity}`, loc.x, loc.y + MAP_CONFIG.nodeRadius + 28);
    }
}

function drawActiveRoutes() {
    ctx.strokeStyle = COLORS.roadActive;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);

    for (let amb of ambulances) {
        if (amb.state === AmbulanceState.IDLE) continue;

        let targetLoc = null;

        if (amb.state === AmbulanceState.TO_EMERGENCY) {
            const emerg = findActiveEmergency(amb.targetEmergency);
            if (emerg) targetLoc = locations[emerg.location];
        } else if (amb.state === AmbulanceState.TO_HOSPITAL || amb.state === AmbulanceState.RETURNING) {
            const targetHosp = amb.state === AmbulanceState.TO_HOSPITAL
                ? amb.targetHospital
                : amb.baseHospital;
            if (targetHosp !== -1) targetLoc = locations[hospitals[targetHosp].location];
        }

        if (targetLoc) {
            const fromLoc = locations[amb.location];

            ctx.beginPath();
            ctx.moveTo(fromLoc.x, fromLoc.y);
            ctx.lineTo(targetLoc.x, targetLoc.y);
            ctx.stroke();
        }
    }

    ctx.setLineDash([]);
}

function drawEmergencies() {
    for (let emerg of activeEmergencies) {
        const loc = locations[emerg.location];

        // Pulsing emergency indicator
        const pulseTime = Date.now() / 500;
        const pulseRadius = MAP_CONFIG.emergencyRadius + Math.sin(pulseTime) * 3;

        // Outer glow
        const gradient = ctx.createRadialGradient(loc.x, loc.y, 0, loc.x, loc.y, pulseRadius + 10);
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.6)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(loc.x, loc.y, pulseRadius + 10, 0, Math.PI * 2);
        ctx.fill();

        // Emergency marker
        ctx.fillStyle = COLORS.emergency;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(loc.x, loc.y, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Emergency icon
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('🆘', loc.x, loc.y);
    }

    // Draw pending emergencies (from queue)
    for (let emerg of pendingQueue) {
        const loc = locations[emerg.location];

        // Smaller, dimmer indicator for queued emergencies
        ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(loc.x, loc.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Queue icon
        ctx.font = '10px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⏳', loc.x, loc.y);
    }
}

function drawAmbulances() {
    for (let amb of ambulances) {
        const loc = locations[amb.location];

        // Determine ambulance appearance based on state
        const isIdle = amb.state === AmbulanceState.IDLE;
        const color = isIdle ? COLORS.ambulanceIdle : COLORS.ambulanceBusy;

        // Glow effect for active ambulances
        if (!isIdle) {
            const gradient = ctx.createRadialGradient(loc.x, loc.y, 0, loc.x, loc.y, MAP_CONFIG.ambulanceRadius + 8);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, 'rgba(255, 107, 53, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(loc.x, loc.y, MAP_CONFIG.ambulanceRadius + 8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Ambulance circle
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(loc.x, loc.y, MAP_CONFIG.ambulanceRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Ambulance icon
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('🚑', loc.x, loc.y);

        // Unit number
        ctx.font = 'bold 10px Inter';
        ctx.fillStyle = color;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(`U${amb.id}`, loc.x, loc.y + MAP_CONFIG.ambulanceRadius + 12);
    }
}

function drawLabels() {
    // Draw time indicator
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 14px Orbitron';
    ctx.textAlign = 'left';
    ctx.fillText(`Time: ${currentTime} min`, 20, 30);

    // Draw active status
    ctx.font = '12px Inter';
    ctx.fillStyle = COLORS.textSecondary;
    ctx.fillText(`Active: ${activeEmergencies.length} | Queue: ${pendingQueue.length}`, 20, 50);
}

// ==================== ANIMATION ====================

function startAnimation() {
    function animate() {
        renderMap();
        animationFrame = requestAnimationFrame(animate);
    }
    animate();
}

function stopAnimation() {
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
}

// Start animation when page loads
document.addEventListener('DOMContentLoaded', () => {
    startAnimation();
});

// Handle window resize
window.addEventListener('resize', () => {
    renderMap();
});
