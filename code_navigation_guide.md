# Code Navigation Guide: Where to Find Everything

This guide helps you quickly jump to the most important parts of the code when an examiner asks "Show me where you implemented X."

---

## 1. Backend: `ambulance.c`

### A. Data Structures (The Foundation)
- **Lines 10-50**: Look for `struct Emergency`, `struct Ambulance`, and `struct Hospital`.
    - *Tip*: Explain that `Emergency` contains both `basePriority` (initial) and `priority` (dynamic).
- **Line 55**: `Road* roads[MAX_LOCATIONS]` (Adjacency List).
- **Line 72**: `Emergency pendingQueue[MAX_EMERGENCIES]` (The Max-Heap array).

### B. Core Algorithms (The Logic)
- **Line 210 (approx)**: `int findShortestPath(...)`
    - This is **Dijkstra's Algorithm**. Point here if they ask about pathfinding.
- **Line 330 (approx)**: `void dispatchAmbulance(...)`
    - This finds the **best ambulance** for an emergency. It checks which one is distance-optimal and available.
- **Line 380 (approx)**: `void advanceTime(...)`
    - The **heart of the simulation**. It moves ambulances through states (`TO_EMERGENCY` -> `AT_SCENE` -> etc.).
- **Line 540 (approx)**: `void refreshPendingQueue(...)`
    - This is where the **Aging Algorithm** lives. Point here to show wait-time updates.
- **Line 560 (approx)**: `void heapifyDown(...)`
    - The **Heap Maintenance** logic. Show this to explain how the priority queue stays sorted.

---

## 2. Frontend: `app.js`

### A. Triage & Priority
- **Line 180 (approx)**: `function calculatePriority(...)`
    - Shows how a patient's initial score is generated from their age and symptoms.
- **Line 260 (approx)**: `function enqueueEmergency(...)`
    - Adds the emergency to the list and sets up the initial telemetry.

### B. Map Rendering (`map.js`)
- **Line 36**: `function renderMap()`
    - The main loop that clears and redraws everything.
- **Line 120**: `function drawHospitals()`
    - Where we draw the green hospital circles and patient counts.
- **Line 250**: `function drawAmbulances()`
    - Where we draw the moving ambulance units and their badges (U1, U2, etc.).

### C. Logic Sync
- **Line 370 (approx)**: `function advanceTime(...)` in `app.js`.
    - Matches the C logic exactly. Point here to show how the frontend stays in sync with the backend units.

---

## 3. Styling: `style.css`

- **Line 1-50**: **CSS Variables** (`:root`).
    - Point here to show your "Design System" (color palette, spacing, typography).
- **Line 230**: `#mapCanvas`.
    - Show the `object-fit: contain` fix that solved the map cropping issue.
- **Line 990 (approx)**: **Animations** (`@keyframes`).
    - Show this to explain the smooth fades and "pulsing" emergency icons.

---

## 4. Cheat Sheet for the "Show Me" Questions

| If they ask: | Go to: | Look for: |
| :--- | :--- | :--- |
| "How do you store the map?" | `ambulance.c` | `Road* roads[MAX_LOCATIONS]` |
| "Where is the Priority Queue?" | `ambulance.c` | `pendingQueue[]` and `heapifyDown` |
| "Show the pathfinding algorithm." | `ambulance.c` | `findShortestPath` (Dijkstra) |
| "Where do you handle starvation?" | `ambulance.c` | `refreshPendingQueue` (Aging) |
| "How is the UI updated?" | `app.js` | `updateUI()` and `renderMap()` |
| "Where is hospital specialty logic?" | `ambulance.c` | `findBestHospital()` scores |
