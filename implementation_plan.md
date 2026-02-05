# Enhancement Plan for Ambulance Dispatch System (Frontend Sync)

This plan bridges the gap between the `ambulance.c` backend and the frontend (`app.js`, `index.html`), specifically focusing on Criticality Levels and dynamic wait-time priority.

## Proposed Changes

### Backend Logic (`ambulance.c`)

#### [MODIFY] [ambulance.c](file:///Users/divitgupta/Desktop/3rd_Sem/DSA%20LAB/DSA%20LAB%20EL/Finaleeeeee/ambulance.c)

- **Sync with Frontend Data Structures**:
    - Add `CriticalityLevel` enum: `LOW=1, MEDIUM=2, HIGH=3, CRITICAL=4`.
    - Update `Emergency` struct to include `criticalityLevel` and `basePriority`.

- **Wait-Time Priority Weighting**:
    - Update `calculatePriority` to reflect the frontend's formula: `(CriticalityLevel * 20) + (DiseaseType * 2) + age_modifier`.
    - Implement a `refreshPriorities()` function that adjusts the `priority` of each queued emergency based on its wait time: `currentPriority = basePriority + (currentTime - reportTime) * WAIT_WEIGHT`.
    - Modify `processQueue` to call `refreshPriorities()` so the most urgent/longest-waiting patient is always dispatched first.

- **Real-Time Simulation Syncing**:
    - Ensure `advanceTime` and the user interface loops in the C code reflect the same time units and state transitions as the frontend.
    - Standardize `AmbulanceState` names and transitions to match `app.js`.

- **UI Improvements (CLI)**:
    - Update `makeEmergencyCall` to ask for `Criticality Level` instead of just using hardcoded disease weights.
    - Update `viewPendingEmergencies` to show the wait time and dynamic priority score.

## Verification Plan

### Automated Tests
- Create a test scenario:
    1.  Queue a `LOW` priority emergency at `T=0`.
    2.  Queue a `MEDIUM` priority emergency at `T=5`.
    3.  Advance time and verify that the `LOW` priority emergency eventually gains enough wait-time weighting to be prioritized if no other high-priority calls arrive, or simply verify the score increase.

### Manual Verification
- Run the simulation, add emergencies with various criticality levels.
- Observe the "Pending Queue" as time advances to see priorities update dynamically.
