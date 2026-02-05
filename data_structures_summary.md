# 5. Data Structures Used

| Data Structure | Role in System | Justification |
| :--- | :--- | :--- |
| **Weighted Graph (Adjacency List)** | City Map Representation | Models the road network where intersections are nodes and roads are edges. It allows the system to calculate real travel distances between locations using Dijkstra's algorithm. |
| **Priority Queue (Max-Heap)** | Emergency Triage | Manages incoming emergency calls by ordering them based on medical severity (e.g., critical vs. mild) and wait time, rather than just the order they were received ($O(\log N)$ inserts). |
| **State Machine** | Ambulance Life-cycle | Tracks the exact operational state of each vehicle (IDLE, TO_EMERGENCY, AT_SCENE, etc.) to ensure predictable transitions and accurate time simulation. |
| **Static Arrays of Structs** | Fleet & Hospital Management | Provides $O(1)$ access to a fixed number of ambulances and hospitals, ensuring memory safety and fast lookup without the overhead of dynamic allocation during simulation. |
| **Dynamic Memory (malloc)** | Graph Construction | Used to build the adjacency list roads at runtime. This allows the map to be flexible and defined by the user without wasting static memory for unused connections. |

---

### DSA Performance Matrix (The "Viva" View)

| Object | Operations | Complexity | Why This Matters |
| :--- | :--- | :--- | :--- |
| **Triage Queue** | Insert / Pop Max | $O(\log N)$ | Rapidly sorts hundreds of emergencies without lag. |
| **Pathfinding** | Shortest Path | $O(V^2)$ | Simple Dijkstra implementation is efficient enough for small city maps ($V=10$). |
| **Fleet Lookup** | Get Status | $O(1)$ | Instant response when searching for available units. |
| **Road Storage** | Storage Space | $O(V + E)$ | Uses minimum RAM by only storing actual connections (Sparse Graph). |
