#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>

#define MAX_LOCATIONS 10
#define MAX_AMBULANCES 5
#define MAX_EMERGENCIES 20
#define MAX_HOSPITALS 5
#define MIN_SERVICE_TIME 3
#define MAX_SERVICE_TIME 8
#define REASSIGN_THRESHOLD 5

//Enums
typedef enum { 
    GENERAL = 1, 
    INFECTION = 2, 
    RESPIRATORY = 3, 
    TRAUMA = 4, 
    CARDIAC = 5 
} DiseaseType;

typedef enum { 
    IDLE,
    TO_EMERGENCY,
    AT_SCENE,
    TO_HOSPITAL,
    RETURNING
} AmbulanceState;

typedef struct {
    int x, y;
    char name[50];
} Location;

typedef struct {
    char name[50];
    int location;
    int capacity;
    int patients;
    DiseaseType specialty;
} Hospital;

typedef struct {
    int id;
    char caller[50];
    int location;
    DiseaseType disease;
    int age;
    int priority;
    int assignedAmbulance;
    int canReassign;
    int reportTime;
    int serviceTime;
} Emergency;

typedef struct {
    int id;
    AmbulanceState state;
    int location;
    int availableAt;
    int targetEmergency;
    int targetHospital;
    int estimatedArrival;
    int baseHospital;
} Ambulance;

typedef struct Road {
    int destination;
    int distance;
    struct Road* next;
} Road;



Location locations[MAX_LOCATIONS];
Hospital hospitals[MAX_HOSPITALS];
Ambulance ambulances[MAX_AMBULANCES];
Emergency activeEmergencies[MAX_EMERGENCIES];
Emergency pendingQueue[MAX_EMERGENCIES];

Road* roads[MAX_LOCATIONS];

int currentTime = 0;

int hospitalCount = 0;
int activeCount = 0;
int queueSize = 0;
int nextEmergencyId = 0;
int totalHandled = 0;
int totalResponseTime = 0;


//Map Setup

void setupLocations() {
    strcpy(locations[0].name, "City Center"); locations[0].x = 0; locations[0].y = 0;
    strcpy(locations[1].name, "Main Street"); locations[1].x = 4; locations[1].y = 0;
    strcpy(locations[2].name, "Park Avenue"); locations[2].x = 10; locations[2].y = 0;
    strcpy(locations[3].name, "Shopping Mall"); locations[3].x = 15; locations[3].y = 0;
    strcpy(locations[4].name, "University"); locations[4].x = 18; locations[4].y = 0;
    strcpy(locations[5].name, "Airport"); locations[5].x = 25; locations[5].y = 0;
    strcpy(locations[6].name, "North Market"); locations[6].x = 0; locations[6].y = 8;
    strcpy(locations[7].name, "Residential"); locations[7].x = 4; locations[7].y = 8;
    strcpy(locations[8].name, "Industrial Zone"); locations[8].x = 30; locations[8].y = 0;
    strcpy(locations[9].name, "Tech Park"); locations[9].x = 33; locations[9].y = 0;
}

void addRoad(int from, int to, int distance) {
    Road* r1 = malloc(sizeof(Road));
    r1->destination = to; r1->distance = distance;
    r1->next = roads[from]; roads[from] = r1;
    
    Road* r2 = malloc(sizeof(Road));
    r2->destination = from; r2->distance = distance;
    r2->next = roads[to]; roads[to] = r2;
}

void setupRoads() {
    for(int i = 0; i < MAX_LOCATIONS; i++) roads[i] = NULL;
    addRoad(0,1,4); addRoad(1,2,6); addRoad(2,3,5);
    addRoad(3,4,3); addRoad(4,5,7); addRoad(1,5,10);
    addRoad(0,6,8); addRoad(6,7,4); addRoad(7,3,6);
    addRoad(5,8,5); addRoad(8,9,3);
}

void addHospital(const char* name, int loc, int cap, DiseaseType spec) {
    strcpy(hospitals[hospitalCount].name, name);
    hospitals[hospitalCount].location = loc;
    hospitals[hospitalCount].capacity = cap;
    hospitals[hospitalCount].patients = 0;
    hospitals[hospitalCount].specialty = spec;
    hospitalCount++;
}

void setupHospitals() {
    addHospital("City General", 0, 10, GENERAL);
    addHospital("Heart Center", 5, 5, CARDIAC);
    addHospital("Trauma Unit", 9, 8, TRAUMA);
    addHospital("Children's Hospital", 6, 6, RESPIRATORY);
}

void setupAmbulances() {
    for(int i = 0; i < MAX_AMBULANCES; i++) {
        ambulances[i].id = i + 1;
        ambulances[i].state = IDLE;
        ambulances[i].availableAt = 0;
        ambulances[i].targetEmergency = -1;
        ambulances[i].targetHospital = -1;
    }
    ambulances[0].location = 1;
    ambulances[0].baseHospital = 0;
    ambulances[1].location = 4;
    ambulances[1].baseHospital = 0;
    ambulances[2].location = 7;
    ambulances[2].baseHospital = 0;
}


//Shortest Route Calculation

int findShortestPath(int from, int to) {
    int distance[MAX_LOCATIONS];
    int visited[MAX_LOCATIONS] = {0};
    
    for(int i = 0; i < MAX_LOCATIONS; i++)
        distance[i] = 99999;
    distance[from] = 0;
    
    for(int count = 0; count < MAX_LOCATIONS; count++) {
        int minDist = 99999, closest = -1;
        for(int i = 0; i < MAX_LOCATIONS; i++) {
            if(!visited[i] && distance[i] < minDist) {
                minDist = distance[i];
                closest = i;
            }
        }
        if(closest == -1) break;
        visited[closest] = 1;
        
        for(Road* r = roads[closest]; r != NULL; r = r->next) {
            int newDist = distance[closest] + r->distance;
            if(newDist < distance[r->destination])
                distance[r->destination] = newDist;
        }
    }
    return distance[to];
}


//Priority Calculation & Best Hospital selection

int calculatePriority(DiseaseType disease, int age) {
    int priority = disease * 3;
    if(disease == CARDIAC && age >= 60) priority += 3;
    if(disease == RESPIRATORY && (age <= 10 || age >= 60)) priority += 2;
    return priority;
}

int getDynamicServiceTime(DiseaseType disease, int age) {
    int baseTime = MIN_SERVICE_TIME + (rand() % (MAX_SERVICE_TIME - MIN_SERVICE_TIME + 1));
    
    if(disease == TRAUMA) baseTime += 2;
    if(disease == CARDIAC && age >= 60) baseTime += 1;
    if(age >= 80) baseTime += 1;
    
    return baseTime;
}

int findBestHospital(int emergencyLoc, DiseaseType disease) {
    int best = -1, bestScore = 99999;
    
    for(int i = 0; i < hospitalCount; i++) {
        if(hospitals[i].patients >= hospitals[i].capacity) continue;
        
        int distance = findShortestPath(emergencyLoc, hospitals[i].location);
        int score = distance * 10;
        if(hospitals[i].specialty == disease) score -= 50;
        
        if(score < bestScore) {
            bestScore = score;
            best = i;
        }
    }
    return best;
}


//Priority Queue (Max-Heap)


void heapSwap(Emergency* a, Emergency* b) {
    Emergency temp = *a;
    *a = *b;
    *b = temp;
}

void enqueueEmergency(const char* caller, int loc, DiseaseType disease, int age) {
    Emergency e;
    e.id = nextEmergencyId++;
    strcpy(e.caller, caller);
    e.location = loc;
    e.disease = disease;
    e.age = age;
    e.priority = calculatePriority(disease, age);
    e.assignedAmbulance = -1;
    e.canReassign = 1;
    e.reportTime = currentTime;
    e.serviceTime = getDynamicServiceTime(disease, age);
    
    pendingQueue[queueSize] = e;
    int i = queueSize++;
    
    while(i > 0 && pendingQueue[(i-1)/2].priority < pendingQueue[i].priority) {
        heapSwap(&pendingQueue[i], &pendingQueue[(i-1)/2]);
        i = (i-1)/2;
    }
}

Emergency dequeueEmergency() {
    Emergency top = pendingQueue[0];
    pendingQueue[0] = pendingQueue[--queueSize];
    
    int i = 0;
    while(1) {
        int left = 2*i + 1;
        int right = 2*i + 2;
        int largest = i;
        
        if(left < queueSize && pendingQueue[left].priority > pendingQueue[largest].priority)
            largest = left;
        if(right < queueSize && pendingQueue[right].priority > pendingQueue[largest].priority)
            largest = right;
        
        if(largest == i) break;
        heapSwap(&pendingQueue[i], &pendingQueue[largest]);
        i = largest;
    }
    
    return top;
}


//Ambulance State Tracking 


int findNearestIdleAmbulance(int emergencyLoc) {
    int best = -1, shortestDist = 99999;
    
    for(int i = 0; i < MAX_AMBULANCES; i++) {
        if(ambulances[i].state == IDLE) {
            int dist = findShortestPath(ambulances[i].location, emergencyLoc);
            if(dist < shortestDist) {
                shortestDist = dist;
                best = i;
            }
        }
    }
    return best;
}

Emergency* findActiveEmergency(int emergencyId) {
    for(int i = 0; i < activeCount; i++) {
        if(activeEmergencies[i].id == emergencyId)
            return &activeEmergencies[i];
    }
    return NULL;
}

void dispatchAmbulance(int ambIndex, Emergency emerg);
void checkReassignmentOpportunities();

void updateAmbulanceStates() {
    for(int i = 0; i < MAX_AMBULANCES; i++) {
        if(ambulances[i].state == IDLE) continue;
        
        if(currentTime >= ambulances[i].availableAt) {
            if(ambulances[i].state == TO_EMERGENCY) {
                ambulances[i].state = AT_SCENE;
                
                Emergency* e = findActiveEmergency(ambulances[i].targetEmergency);
                if(e) {
                    ambulances[i].location = e->location;
                    ambulances[i].availableAt = currentTime + e->serviceTime;
                    e->canReassign = 0;
                    printf("  [Time %d] Unit-%d arrived at scene (service time: %d min)\n", 
                           currentTime, ambulances[i].id, e->serviceTime);
                }
            }
            else if(ambulances[i].state == AT_SCENE) {
                ambulances[i].state = TO_HOSPITAL;
                int dist = findShortestPath(ambulances[i].location, 
                                           hospitals[ambulances[i].targetHospital].location);
                ambulances[i].availableAt = currentTime + dist;
                printf("  [Time %d] Unit-%d transporting to %s (ETA: %d min)\n", 
                       currentTime, ambulances[i].id, 
                       hospitals[ambulances[i].targetHospital].name, dist);
            }
            else if(ambulances[i].state == TO_HOSPITAL) {
                ambulances[i].state = RETURNING;
                ambulances[i].location = hospitals[ambulances[i].targetHospital].location;
                
                for(int j = 0; j < activeCount; j++) {
                    if(activeEmergencies[j].id == ambulances[i].targetEmergency) {
                        activeEmergencies[j] = activeEmergencies[--activeCount];
                        totalHandled++;
                        break;
                    }
                }
                
                int returnDist = findShortestPath(ambulances[i].location, 
                                                  hospitals[ambulances[i].baseHospital].location);
                ambulances[i].availableAt = currentTime + returnDist;
                
                printf("  [Time %d] Unit-%d delivered patient, returning to base (%d min)\n", 
                       currentTime, ambulances[i].id, returnDist);
                
                ambulances[i].targetEmergency = -1;
                ambulances[i].targetHospital = -1;
            }
            else if(ambulances[i].state == RETURNING) {
                ambulances[i].state = IDLE;
                ambulances[i].location = hospitals[ambulances[i].baseHospital].location;
                printf("  [Time %d] Unit-%d back at base and available\n", 
                       currentTime, ambulances[i].id);
                
                checkReassignmentOpportunities();
            }
        }
    }
}


//Dynamic Reassignment

void checkReassignmentOpportunities() {
    for(int i = 0; i < activeCount; i++) {
        Emergency* e = &activeEmergencies[i];
        
        if(!e->canReassign || e->assignedAmbulance == -1)
            continue;
        
        int currentAmb = e->assignedAmbulance;
        int currentETA = ambulances[currentAmb].estimatedArrival;
        
        int nearestAmb = findNearestIdleAmbulance(e->location);
        
        if(nearestAmb != -1 && nearestAmb != currentAmb) {
            int newDist = findShortestPath(ambulances[nearestAmb].location, e->location);
            int newETA = currentTime + newDist;
            
            if(currentETA - newETA >= REASSIGN_THRESHOLD) {
                printf("\n  [REASSIGNMENT] Emergency #%d\n", e->id);
                printf("     Old: Unit-%d (ETA %d) -> New: Unit-%d (ETA %d)\n",
                       currentAmb + 1, currentETA - currentTime,
                       nearestAmb + 1, newDist);
                printf("     Time saved: %d minutes\n", currentETA - newETA);
                
                ambulances[currentAmb].state = IDLE;
                ambulances[currentAmb].targetEmergency = -1;
                
                dispatchAmbulance(nearestAmb, *e);
                return;
            }
        }
    }
}

void dispatchAmbulance(int ambIndex, Emergency emerg) {
    int hospIndex = findBestHospital(emerg.location, emerg.disease);
    
    if(hospIndex == -1) {
        enqueueEmergency(emerg.caller, emerg.location, emerg.disease, emerg.age);
        printf("  [WARNING] No hospital available, emergency re-queued\n");
        return;
    }
    
    int distToScene = findShortestPath(ambulances[ambIndex].location, emerg.location);
    
    ambulances[ambIndex].state = TO_EMERGENCY;
    ambulances[ambIndex].targetEmergency = emerg.id;
    ambulances[ambIndex].targetHospital = hospIndex;
    ambulances[ambIndex].availableAt = currentTime + distToScene;
    ambulances[ambIndex].estimatedArrival = currentTime + distToScene;
    
    emerg.assignedAmbulance = ambIndex;
    emerg.canReassign = 1;
    activeEmergencies[activeCount++] = emerg;
    
    hospitals[hospIndex].patients++;
    
    totalResponseTime += distToScene;
    
    printf("\n  [DISPATCH] Unit-%d dispatched to %s\n", ambIndex + 1, emerg.caller);
    printf("  Location: %s\n", locations[emerg.location].name);
    printf("  Destination: %s\n", hospitals[hospIndex].name);
    printf("  ETA: %d minutes\n", distToScene);
}

void processQueue() {
    if(queueSize == 0) return;
    
    int ambIndex = findNearestIdleAmbulance(pendingQueue[0].location);
    if(ambIndex != -1) {
        Emergency e = dequeueEmergency();
        dispatchAmbulance(ambIndex, e);
    }
}

void advanceTime(int minutes) {
    for(int i = 0; i < minutes; i++) {
        currentTime++;
        updateAmbulanceStates();
        processQueue();
        
        if(currentTime % 15 == 0) {
            for(int j = 0; j < hospitalCount; j++) {
                if(hospitals[j].patients > 0) {
                    hospitals[j].patients--;
                    printf("  [Time %d] Patient discharged from %s\n", 
                           currentTime, hospitals[j].name);
                }
            }
        }
    }
}


//User Interface

const char* getStateName(AmbulanceState state) {
    switch(state) {
        case IDLE: return "Available";
        case TO_EMERGENCY: return "Going to scene";
        case AT_SCENE: return "On scene";
        case TO_HOSPITAL: return "To hospital";
        case RETURNING: return "Returning to base";
        default: return "Unknown";
    }
}

void viewAmbulanceStatus() {
    printf("\nAMBULANCE FLEET STATUS\n");
    printf("\n\n");
    
    for(int i = 0; i < MAX_AMBULANCES; i++) {
        printf("  Unit-%d: %s", i + 1, getStateName(ambulances[i].state));
        
        if(ambulances[i].state == IDLE)
            printf(" at %s", locations[ambulances[i].location].name);
        else
            printf(" (free in %d min)", ambulances[i].availableAt - currentTime);
        
        printf("\n");
    }
    printf("\n");
}

void makeEmergencyCall() {
    char* operators[] = {"Sarah", "Mike", "Priya", "David", "Lisa"};
    char* op = operators[rand() % 5];
    
    printf("\n\nEmergency 108 - Dispatch\n\n");
    
    char name[50];
    int loc, age;
    char choice;
    
    printf("%s: Hi, I'm %s. Your name?\n", op, op);
    printf("You: ");
    scanf(" %[^\n]", name);
    
    printf("\n%s: Where are you?\n\n", op);
    for(int i = 0; i < MAX_LOCATIONS; i++)
        printf("  %d - %s\n", i, locations[i].name);
    printf("\nYou: ");
    scanf("%d", &loc);
    
    if(loc < 0 || loc >= MAX_LOCATIONS) {
        printf("\nInvalid location!\n");
        return;
    }
    
    printf("\n%s: Emergency type?\n", op);
    printf("  C-Heart  T-Accident  R-Breathing  I-Infection  G-Other\n");
    printf("\nYou: ");
    scanf(" %c", &choice);
    
    DiseaseType disease = GENERAL;
    switch(choice) {
        case 'C': case 'c': disease = CARDIAC; break;
        case 'T': case 't': disease = TRAUMA; break;
        case 'R': case 'r': disease = RESPIRATORY; break;
        case 'I': case 'i': disease = INFECTION; break;
    }
    
    printf("\n%s: Patient age?\n", op);
    printf("You: ");
    scanf("%d", &age);
    
    enqueueEmergency(name, loc, disease, age);
    
    printf("\n%s: Help is coming, %s!\n", op, name);
    printf("  Call ID: #%03d\n", nextEmergencyId - 1);
    
    advanceTime(2);
}

void viewSystemStatus() {
    printf("\nSYSTEM STATUS OVERVIEW\n");
    printf("\n\n");
    
    if(activeCount == 0 && queueSize == 0) {
        printf("  No emergencies.\n");
    } else {
        if(activeCount > 0) {
            printf("  Active Emergencies:\n");
            for(int i = 0; i < activeCount; i++)
                printf("    - %s at %s (Unit-%d)\n", 
                       activeEmergencies[i].caller,
                       locations[activeEmergencies[i].location].name,
                       activeEmergencies[i].assignedAmbulance + 1);
        }
        
        if(queueSize > 0) {
            printf("\n  Waiting:\n");
            for(int i = 0; i < queueSize && i < 3; i++)
                printf("    - %s (Priority %d)\n",
                       pendingQueue[i].caller, pendingQueue[i].priority);
            if(queueSize > 3)
                printf("    ... +%d more\n", queueSize - 3);
        }
    }
    
    printf("\n  Stats: %d handled", totalHandled);
    if(totalHandled > 0)
        printf(", avg response %.1f min", (float)totalResponseTime / totalHandled);
    printf("\n\n");
}

void viewHospitalStatus() {
    printf("\nHOSPITAL STATUS\n");
    printf("\n\n");
    
    for(int i = 0; i < hospitalCount; i++) {
        printf("  %s - %s\n", hospitals[i].name, locations[hospitals[i].location].name);
        printf("    Beds: %d/%d\n\n", hospitals[i].patients, hospitals[i].capacity);
    }
}

void viewPendingEmergencies() {
    printf("\nPENDING EMERGENCIES QUEUE\n");
    printf("\n\n");
    
    if(queueSize == 0) {
        printf("  No pending emergencies.\n\n");
    } else {
        for(int i = 0; i < queueSize; i++) {
            printf("  #%d: %s\n", pendingQueue[i].id, pendingQueue[i].caller);
            printf("      Location: %s\n", locations[pendingQueue[i].location].name);
            printf("      Priority: %d\n", pendingQueue[i].priority);
            printf("      Waiting: %d min\n\n", currentTime - pendingQueue[i].reportTime);
        }
    }
}

void viewMapAndLocations() {
    printf("\nMAP & LOCATIONS\n");
    printf("\n\n");
    
    printf("  Locations:\n");
    for(int i = 0; i < MAX_LOCATIONS; i++) {
        printf("  %d. %s (x=%d, y=%d)\n", 
               i, locations[i].name, locations[i].x, locations[i].y);
    }
    
    printf("\n  Road Connections:\n");
    for(int i = 0; i < MAX_LOCATIONS; i++) {
        printf("  %s: ", locations[i].name);
        Road* r = roads[i];
        int first = 1;
        while(r != NULL) {
            if(!first) printf(", ");
            printf("%s (%dkm)", locations[r->destination].name, r->distance);
            first = 0;
            r = r->next;
        }
        printf("\n");
    }
    printf("\n");
}

void viewStatistics() {
    printf("\nSYSTEM STATISTICS\n");
    printf("\n\n");
    
    printf("  Current Time: %d minutes\n", currentTime);
    printf("  Total Emergencies Handled: %d\n", totalHandled);
    printf("  Active Emergencies: %d\n", activeCount);
    printf("  Pending Emergencies: %d\n", queueSize);
    
    if(totalHandled > 0) {
        printf("  Average Response Time: %.1f minutes\n", 
               (float)totalResponseTime / totalHandled);
    }
    
    int idleCount = 0;
    for(int i = 0; i < MAX_AMBULANCES; i++) {
        if(ambulances[i].state == IDLE) idleCount++;
    }
    printf("  Available Ambulances: %d/%d\n", idleCount, MAX_AMBULANCES);
    
    int totalBeds = 0, usedBeds = 0;
    for(int i = 0; i < hospitalCount; i++) {
        totalBeds += hospitals[i].capacity;
        usedBeds += hospitals[i].patients;
    }
    printf("  Hospital Bed Usage: %d/%d\n\n", usedBeds, totalBeds);
}

void autoRunSimulation() {
    printf("\n  Running simulation for 10 time steps...\n\n");
    for(int i = 0; i < 10; i++) {
        printf("  Step %d (Time: %d min)\n", i + 1, currentTime + 1);
        advanceTime(1);
    }
    printf("\n  Simulation complete!\n\n");
}

void showMenu() {
    printf("\nAMBULANCE DISPATCH MANAGEMENT SYSTEM\n\n");
    printf("  1. Report New Emergency\n");
    printf("  2. View System Status\n");
    printf("  3. View Ambulance Status\n");
    printf("  4. View Hospital Status\n");
    printf("  5. View Pending Emergencies\n");
    printf("  6. Advance Time (Step Simulation)\n");
    printf("  7. Auto-Run Simulation (10 steps)\n");
    printf("  8. View Map & Locations\n");
    printf("  9. System Statistics\n");
    printf("  0. Exit\n");
    printf("------------------------------------\n");
    printf("Current Time: %d minutes | Pending: %d | Active: %d\n\n", 
           currentTime, queueSize, activeCount);
    printf("  Choice: ");
}


int main() {
    srand(time(NULL));
    
    setupLocations();
    setupRoads();
    setupHospitals();
    setupAmbulances();
    
    printf("\nEMERGENCY DISPATCH SYSTEM INITIALIZED\n\n");
    printf("  [+] %d ambulances\n", MAX_AMBULANCES);
    printf("  [+] %d hospitals\n", hospitalCount);
    printf("  [+] Dynamic reassignment enabled\n");
    printf("  [+] Priority queue active\n");
    printf("  [+] Dynamic service times enabled\n\n");
    printf("  Press Enter to continue...");
    getchar();
    
    int choice;
    while(1) {
        showMenu();
        scanf("%d", &choice);
        
        switch(choice) {
            case 1: makeEmergencyCall(); break;
            case 2: viewSystemStatus(); break;
            case 3: viewAmbulanceStatus(); break;
            case 4: viewHospitalStatus(); break;
            case 5: viewPendingEmergencies(); break;
            case 6:
                printf("\n  How many minutes to advance? ");
                int mins;
                scanf("%d", &mins);
                printf("\n  Processing...\n");
                advanceTime(mins);
                break;
            case 7: autoRunSimulation(); break;
            case 8: viewMapAndLocations(); break;
            case 9: viewStatistics(); break;
            case 0:
                printf("\nSHIFT ENDED\n\n");
                printf("  Total emergencies handled: %d\n\n", totalHandled);
                return 0;
            default:
                printf("\n  Invalid choice!\n");
        }
        
        printf("\n  Press Enter to continue...");
        getchar(); getchar();
    }
    
    return 0;
}