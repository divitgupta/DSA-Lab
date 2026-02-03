// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// API Client Class
class AmbulanceAPI {
    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // ============================================
    // SYSTEM STATE METHODS
    // ============================================

    async getSystemState() {
        return this.request('/system/state');
    }

    async advanceTime(minutes = 1) {
        return this.request('/system/advance-time', {
            method: 'POST',
            body: JSON.stringify({ minutes })
        });
    }

    async resetSystem() {
        return this.request('/system/reset', {
            method: 'POST'
        });
    }

    // ============================================
    // EMERGENCY METHODS
    // ============================================

    async createEmergency(emergencyData) {
        return this.request('/emergencies', {
            method: 'POST',
            body: JSON.stringify(emergencyData)
        });
    }

    async getPendingEmergencies() {
        return this.request('/emergencies/pending');
    }

    async getActiveEmergencies() {
        return this.request('/emergencies/active');
    }

    async getEmergency(id) {
        return this.request(`/emergencies/${id}`);
    }

    // ============================================
    // AMBULANCE METHODS
    // ============================================

    async getAllAmbulances() {
        return this.request('/ambulances');
    }

    async getIdleAmbulances() {
        return this.request('/ambulances/idle');
    }

    async getAmbulance(id) {
        return this.request(`/ambulances/${id}`);
    }

    async updateAmbulance(id, updateData) {
        return this.request(`/ambulances/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updateData)
        });
    }

    // ============================================
    // HOSPITAL METHODS
    // ============================================

    async getAllHospitals() {
        return this.request('/hospitals');
    }

    async getAvailableHospitals() {
        return this.request('/hospitals/available');
    }

    async getHospital(id) {
        return this.request(`/hospitals/${id}`);
    }

    // ============================================
    // STATISTICS METHODS
    // ============================================

    async getStatistics() {
        return this.request('/stats');
    }

    // ============================================
    // HEALTH CHECK
    // ============================================

    async healthCheck() {
        return this.request('/health');
    }
}

// Create global API instance
const api = new AmbulanceAPI();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AmbulanceAPI, api };
}
