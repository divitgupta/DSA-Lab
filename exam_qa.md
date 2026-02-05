# Exam Q&A: `ambulance.c` Backend Modifications (Viva Prep)

This document is your tactical guide for the "Show me how to change..." questions, focused ONLY on the C backend.

---

## 1. Priority & Urgency Logic
**Q: Make wait-time the single biggest factor in dispatching.**
- **Action**: Go to **Line 31** (approx): `#define WAIT_TIME_WEIGHT 1` → Change to `100`.
- **Logic**: This ensures even a minor headache becomes the #1 priority if it waits for more than a minute or two.

**Q: Change the "Elderly Priority" age threshold.**
- **Action**: In `calculatePriority` (**Line 205**), find `if(age >= 60 || age <= 10)`. Change `60` to `80`.
- **Logic**: Now only patients over 80 get the priority boost.

**Q: How do you add a "VIP" flag to patients?**
- **Action**:
    1. Add `int isVIP;` to the `Emergency` struct (**Line 62**).
    2. In `calculatePriority` (**Line 205**), add `if(crit == 4 || isVIP) priority += 100;`.

---

## 2. Graph & Map Modifications
**Q: A bridge between "City Center" and "North Market" is closed. Reflect this.**
- **Action**: In `setupRoads` (**Line 131**), find `addRoad(0, 6, 8);`. Comment it out using `//`.
- **Logic**: This removes the edge from the adjacency list. Dijkstra will calculate a new path around it.

**Q: Add a new Location #10 ("New Suburb") at coordinates (40, 40).**
- **Action**:
    1. Update **Line 7**: `#define MAX_LOCATIONS 10` → `11`.
    2. In `setupLocations` (**Line 108**), add:
       `strcpy(locations[10].name, "New Suburb"); locations[10].x = 40; locations[10].y = 40;`
    3. Connect it in `setupRoads`: `addRoad(0, 10, 5);`.

---

## 3. Hospital & Capacity
**Q: A hospital is offline for maintenance. What do you change?**
- **Action**: In `main` or `setupHospitals`, set `hospitals[index].capacity = 0;`.
- **Logic**: The check in `findBestHospital` (**Line 227**) `if(hospitals[i].patients >= hospitals[i].capacity) continue;` will automatically skip it.

**Q: Make "Specialized Care" much more important than travel distance.**
- **Action**: In `findBestHospital` (**Line 231**), change `score -= 50` to `score -= 500`.
- **Logic**: The system will now send a Cardiac patient to the specialized Heart Center even if it's 40km away.

---

## 4. Ambulance Fleet
**Q: The city doubled its budget. Add 5 more ambulances.**
- **Action**: Change **Line 8**: `#define MAX_AMBULANCES 5` → `10`.
- **Logic**: The `setupAmbulances` loop uses this constant, so they will be initialized immediately.

**Q: Change the ambulance "Maintenance Cooldown" to 10 minutes.**
- **Action**: In `updateAmbulanceStates` (**Line 393**), find `int cooldown = (rand() % 2) + 1;`. Change it to `int cooldown = 10;`.

---

## 5. DSA Concepts (The "Defense")
**Q: Where is the Adjacency List?**
- **Action**: Show **Line 72**: `typedef struct Road { ... struct Road* next; } Road;` and **Line 94**: `Road* roads[MAX_LOCATIONS];`.

**Q: Why is your pathfinding O(V²)?**
- **Answer**: In `findShortestPath` (**Line 174**), we use a nested loop to find the minimum distance node. Since we have a small map (10 nodes), arrays are more memory-efficient than a priority queue-based Dijkstra ($O(E \log V)$).

**Q: Explain the Heapify process.**
- **Answer**: In `refreshPendingQueue` (**Line 275**), after updating wait-times, we rebuild the heap. We start from the last parent node `(queueSize/2 - 1)` and call `heapifyDown` (**Line 560**) to trickle values. This keeps the highest priority at index 0.

---

## 7. Travel Time & Simulation
**Q: How is the travel time calculated?**
- **Action**: Show **Line 174**, the `findShortestPath(from, to)` function.
- **Logic**: It uses **Dijkstra's Algorithm**. 
    1. It takes the starting point and target point.
    2. It finds the shortest distance using the roads/map.
    3. We assume **1 unit of distance = 1 minute of travel time**.

**Q: Explain the lifecycle of an ambulance trip.**
- **Answer**: The simulation tracks time in steps. An ambulance goes through 4 main phases:
    1. **TO_EMERGENCY**: Travel time = Dijkstra distance (Ambulance → Patient).
    2. **AT_SCENE**: Stays for `serviceTime` (3-8 mins, depending on disease/age).
    3. **TO_HOSPITAL**: Travel time = Dijkstra distance (Patient → Hospital).
    4. **RETURNING**: Small cooldown (1-2 mins) then back to IDLE.

**Q: If a patient is at Location A and the Hospital is at Location B, how do you see the exact path?**
- **Action**: In `findShortestPath`, we currently only return the `distance[to]`. To show the path, we would need a `parent[MAX_LOCATIONS]` array to track where we came from and then print it in reverse.

**Q: How is the "Treatment Time" (Service Time) decided?**
- **Action**: Show **Line 213**, the `getDynamicServiceTime(disease, age)` function.
- **Logic**: It's a dynamic formula:
    1. **Base Random**: 3 to 8 minutes (defined by `MIN_SERVICE_TIME` and `MAX_SERVICE_TIME`).
    2. **Trauma extra**: If it's a Trauma case, add **+2 mins**.
    3. **Elderly Cardiac extra**: If Cardiac and age >= 60, add **+1 min**.
    4. **Very Elderly extra**: If age >= 80, add another **+1 min**.
- **Impact**: This time is added to the ambulance's `availableAt` clock when it reaches the patient, making it stay "at scene" before it can move to the hospital.

**Q: How are weights given to each edge (road)?**
- **Action**: Show **Line 131**, the `setupRoads()` function and **Line 121**, `addRoad()`.
- **Logic**: 
    1. In `setupRoads`, we manually define connections like `addRoad(0, 1, 4);`.
    2. The third parameter (`4`) is the **weight** (distance).
    3. In `addRoad`, this weight is stored in the `distance` field of the `Road` struct.
    4. Since it's an undirected graph (roads go both ways), `addRoad` creates two `Road` nodes: `0 -> 1` and `1 -> 0`, both with the same weight.
