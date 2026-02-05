# Presentation Guide: Ambulance Dispatch System

Use this guide to structure your project demonstration during the SEE exam. This strategy is designed to impress the examiners by showing complexity and fairness.

---

## 1. The "Elevator Pitch" (1 Minute)
"My project is an **Automated Emergency Dispatch System**. It doesn't just send an ambulance; it uses **Dijkstra's Algorithm** to find the fastest route, a **Max-Heap** to prioritize according to medical urgency, and an **Aging Algorithm** to ensure that even low-priority patients are never ignored (Starvation prevention)."

---

## 2. Walkthrough Structure

### Step 1: Initialization
-   **Show the Console**: Show the system initializing.
-   **Mention**: "The system starts by building a **Graph** of the city using an **Adjacency List**. We use `malloc` for dynamic memory allocation to store road objects."

### Step 2: Reporting an Emergency (The "Critical" Case)
-   **Input**: Report a 'Cardiac' emergency with 'Critical' status.
-   **Point out**: "Observe how the system calculates a high priority score based on the disease type and age. This is pushed into our **Priority Queue (Max-Heap)**."

### Step 3: Strategic Wait (The "Starvation" Case)
-   **Action**: Report a 'General' (Low) call first, then a 'Cardiac' (High) call.
-   **Advanced Tip**: Advance time by 10-15 minutes without assigning an ambulance.
-   **Show**: Show the 'Pending Queue'.
-   **Point out**: "Notice how the priority of the older 'General' call increases over time. This is called **Aging**. It prevents a low-priority patient from waiting forever."

---

## 3. Explaining the "DSA" Magic

When the examiner points at a function, use these "Keyword Blitz" sentences:

-   **On `findShortestPath`**: "This is a **Greedy Algorithm (Dijkstra)**. It finds the shortest path on a weighted graph by relaxation of edges. Complexity is $O(V^2)$."
-   **On `refreshPendingQueue`**: "This is a **Bottom-Up Heapify**. Instead of re-sorting the array ($O(N \log N)$), we rebuild the heap in $O(N)$ time by bubbling down from the last non-leaf node."
-   **On `hospitals[i].specialty == disease`**: "This is a **Heuristic Hospital Match**. We give a 50-point bonus to hospitals that match the medical condition, effectively prioritizing the *correct* care over the *closest* care."

---

## 4. The "Key Strengths" to Highlight
-   **Fairness**: The system is designed to be ethical. Even if many critical calls come in, a simple flu patient won't be forgotten.
-   **Efficiency**: Using a Max-Heap means we can find the most urgent patient in **$O(1)$** time.
-   **Real-time Logic**: The state machine (IDLE -> TO_EMERGENCY -> AT_SCENE) mimics real-world logistics perfectly.

---

## 5. Potential Conclusion Hook
"In the future, this system could be scaled with **GPS integration** and **Google Maps API** for live traffic, but the core DSA foundations (Heaps and Graphs) remain the most efficient way to save lives."
