# Deep Dive: The Aging Algorithm (Wait-Time Priority)

This document explains the "Aging" mechanism used in the Ambulance Dispatch System to ensure fairness and prevent patient starvation.

---

## 1. The Concept of "Starvation"
In a standard **Priority Queue**, a "Low Priority" patient (e.g., General Emergency) could theoretically wait forever if "High Priority" patients (e.g., Cardiac Arrest) keep arriving. This is known as **Starvation**.

## 2. The Solution: Aging
**Aging** is a technique that gradually increases the priority of a task (or patient) based on how long they have been waiting in the queue.

### The Mathematical Formula
Every minute, the system recalculates the priority score:
`currentPriority = basePriority + (waitTime * WAIT_TIME_WEIGHT)`

- **`basePriority`**: Set at the moment the call is received (based on Criticality + Disease + Age).
- **`waitTime`**: `currentTime - reportTime`.
- **`WAIT_TIME_WEIGHT`**: Currently set to `1` (increases priority by 1 point every minute).

---

## 3. Implementation in C (`ambulance.c`)

The update happens in the `refreshPendingQueue()` function:

```c
void refreshPendingQueue() {
    // 1. Update scores for all patients currently in the heap
    for(int i = 0; i < queueSize; i++) {
        int waitTime = currentTime - pendingQueue[i].reportTime;
        pendingQueue[i].priority = pendingQueue[i].basePriority + (waitTime * WAIT_TIME_WEIGHT);
    }
    
    // 2. Rebuild the Heap (Bottom-Up Heapify)
    // Since priorities have changed, we must re-establish the Max-Heap property.
    // Complexity: O(N)
    for(int i = (queueSize/2) - 1; i >= 0; i--) {
        heapifyDown(i); 
    }
}
```

---

## 4. Key Takeaways for Viva
1.  **Dynamic Nature**: Priority is not a static property; it is a **dynamic value** that reflects both medical urgency and waiting time.
2.  **Ethics & Fairness**: Aging ensures that the system is ethically sound by guaranteeing that even minor cases eventually reach a high enough priority to be served.
3.  **Heap Maintenance**: We use **Bottom-Up Heapify** ($O(N)$) after every aging pulse. This is more efficient than a full $O(N \log N)$ sort because we are only fixing the internal structure of an existing array.
4.  **Tuning**: By changing `WAIT_TIME_WEIGHT`, you can control how "impatient" the system is. A weight of `2` or `5` would make old calls leapfrog new ones much faster.
