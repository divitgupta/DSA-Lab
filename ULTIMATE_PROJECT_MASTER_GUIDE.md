# The Master Guide: Smart Ambulance Dispatch System

This document is the "Source of Truth" for your project. It combines the technical writeup, implementation logic, exam preparation, and presentation strategies into one comprehensive file.

---

## 1. Project Overview & Mission
**Goal**: To build a real-time Emergency Response System that optimizes two critical variables: **Speed** (via Dijkstra's Algorithm) and **Medical Urgency** (via Priority Queues).
**Key Innovation**: Implementing an **Aging Algorithm** to ensure fairness and prevent "Starvation" (long wait times for non-critical calls).

---

## 2. Technical Roadmap: Data Structures (The "How")

### A. Implementation vs. Theory
| Feature | C Implementation | DSA Concept | Why? |
| :--- | :--- | :--- | :--- |
| **City Map** | `Road* roads[11]` | **Adjacency List** | Saves memory in sparse graphs ($O(V+E)$) vs Matrix ($O(V^2)$). |
| **Queue** | `pendingQueue[20]` | **Max-Heap** | $O(\log N)$ inserts and $O(1)$ access to the highest-priority patient. |
| **Fleet** | `ambulances[5]` | **Array of Structs** | Static memory allows instant $O(1)$ access to any unit by ID. |
| **Hospitals** | `hospitals[4]` | **Array of Structs** | Easy to loop for capacity and specialty checks. |
| **Path State** | `distance[11]` | **Priority Array** | Used by Dijkstra to track shortest distances during pathfinding. |

### B. Internal Storage & Status Logic
- **Ambulances**: Stored in a contiguous memory block. Status is tracked via an **Enum-based State Machine** (`IDLE`, `TO_EMERGENCY`, `AT_SCENE`, `TO_HOSPITAL`, `RETURNING`).
- **Hospital Capacity**: Every dispatch increments a hospital's patient count. Capacity is managed via a **Discharge Loop** that clears beds every 15 minutes of simulation time.

---

## 3. Algorithmic Deep Dive (The "A" in DSA)

### A. Dijkstra's Algorithm (Pathfinding)
Used to find the shortest path between any two nodes. 
- **Process**: Starts with the source node, assigns distance 0, and infinity to all others. It "relaxes" edges by updating neighbors if a shorter path is found.
- **Complexity**: $O(V^2)$ using arrays (ideal for our 11-node system).

### B. Aging Algorithm (Fairness)
Standard Priority Queues suffer from **Starvation** (low priority calls may never get served).
- **Our Formula**: `Priority = (BaseWeight) + (WaitTime * WAIT_TIME_WEIGHT)`
- **Mechanism**: Every minute, the priority of waiting patients increases. We then perform a **Bottom-Up Heapify** ($O(N)$) to re-sort the queue without the $O(N \log N)$ cost of a full sort.

### C. Heuristic Hospital Selection
We don't just pick the closest hospital. We use a **Weighted Score**:
- `Score = (Distance * 10) - (Specialty Bonus [50])`
- This ensures a Cardiac patient might travel 3km extra to reach a Heart Center rather than a closer General hospital.

---

## 4. Frontend-Backend Architecture (The Synchronization)

### The Coordinate System
- Nodes are mapped using `(x, y)` coordinates.
- **Problem**: The dashboard layout was cropping nodes on the left.
- **Fix**: Squeezed all nodes into a **Centered Viewport** (X: 150-650 range) and utilized `object-fit: contain` in the CSS to ensure the full map is always visible.

### The Real-Time Dashboard (`app.js`)
- Provides visual telemetry for every ambulance.
- Status labels are dynamic: "ETA to patient", "Treating patient", "ETA to hospital", and a "Cooldown" phase for returning units.

---

## 5. Viva Preparation: The "Defense" Guide

### "What if you change...?"
- **Wait Time Importance**: Change `#define WAIT_TIME_WEIGHT` in `ambulance.c`. Higher = faster "Aging".
- **Blocked Roads**: Comment out an `addRoad()` call in `setupRoads`. Dijkstra will automatically route around it.
- **Broken Hospital**: Set a hospital's `capacity` to 0. The dispatching logic will automatically skip it.
- **Return Cooldown**: Change the `cooldown` variable in the `RETURNING` state logic (currently 1-2 mins).

### Algorithm Comparisons
- **Why not BFS?**: BFS picks the path with the fewest "hops", not the shortest distance. In a weighted graph (where one road is 10km and another is 2km), BFS would fail.
- **Why not a simple Queue?**: A FIFO queue would treat a Heart Attack and a Cold/Flu in the order they arrived, which is medically dangerous.

---

## 6. Presentation Strategy: The "Showmanship" Guide

1.  **The Hook**: "My system ensures medical priority while guaranteeing fairness through an Aging algorithm."
2.  **The Demo**:
    -   Report a Low-priority call (General).
    -   Report a High-priority call (Cardiac) 2 mins later.
    -   Show that Cardiac is dispatched *first*.
    -   Wait 15 mins. Show how the General call's priority has risen due to **Wait Time**.
3.  **The Conclusion**: "Using efficient DSA (Heaps and Graphs) allows this system to scale to thousands of calls with minimal CPU overhead."

---

## 7. Configuration Summary
-   **Max Locations**: 11 (10 regular + 4 hospitals, optimized for coordinates)
-   **Max Ambulances**: 5
-   **Reassignment Threshold**: 5 minutes (saves ambulance time by swapping closer units).
-   **Service Time**: Dynamic (1-8 mins) based on patient age and disease.
