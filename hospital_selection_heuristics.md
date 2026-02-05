# Deep Dive: Hospital Selection Heuristics

This document explains how the system decides *which* hospital a patient should be taken to. It’s not just about the nearest building; it’s about the **best** building for that specific patient.

---

## 1. The Logic (The "Why")
In a simple system, you'd just pick the closest hospital. In our **Smart System**, we use a **Weighted Heuristic** to balance two factors:
1.  **Distance**: How far is the hospital? (Lower is better).
2.  **Specialty**: Does the hospital have a dedicated unit for this disease? (Specialty is better).

## 2. The Formula
We calculate a **Score** for every hospital. The hospital with the **Lowest Score** wins.

`Score = (Shortest Distance × 10) - (Specialty Bonus)`

- **Distance Weight (10)**: Every kilometer adds 10 points to the score.
- **Specialty Bonus (50)**: If the hospital matches the patient's disease (e.g., Heart Center for Cardiac), we **subtract 50 points** from the score.

### Decision Example:
A Cardiac patient is at Point A.
- **City General (3km away)**: No specialty.
    - Score = (3 × 10) - 0 = **30**
- **Heart Center (7km away)**: Has Specialty.
    - Score = (7 × 10) - 50 = 20 - 50 = **20**

**Result**: Even though Heart Center is 4km further away, it has a lower score (20 vs 30). The system will send the patient there.

---

## 3. Implementation in C (`ambulance.c`)

Found at **Line 223**:

```c
int findBestHospital(int emergencyLoc, DiseaseType disease) {
    int best = -1, bestScore = 99999;
    
    for(int i = 0; i < hospitalCount; i++) {
        // 1. Availability Check: Is there a free bed?
        if(hospitals[i].patients >= hospitals[i].capacity) continue;
        
        // 2. Shortest Path: Calculated using Dijkstra's Algorithm
        int distance = findShortestPath(emergencyLoc, hospitals[i].location);
        
        // 3. Score Calculation
        int score = distance * 10;
        
        // 4. Specialty Bonus (-50 points)
        if(hospitals[i].specialty == disease) score -= 50;
        
        // 5. Comparison: Keep track of the lowest score
        if(score < bestScore) {
            bestScore = score;
            best = i;
        }
    }
    return best;
}
```

---

## 4. Key Takeaways for Viva
- **Heuristics**: Explain that this is a "greedy heuristic" because it makes the best local decision for that specific patient.
- **Capacity Management**: Mention that the system **skips** hospitals that are full, automatically routing patients to the next best option. This is a critical safety feature.
- **DSA Concept**: This uses **Search & Optimization** (looping through all candidates and finding the minimum).
