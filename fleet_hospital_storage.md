# Fleet & Hospital Storage Documentation

This guide explains specifically how the status of the Ambulance Fleet and Hospitals are stored and tracked in `ambulance.c`.

---

## 1. Ambulance Fleet Storage

### Data Structure: Static Array of Structs
The fleet is managed via a global array of the `Ambulance` structure:
```c
Ambulance ambulances[MAX_AMBULANCES];
```

### Tracking State (Status)
The status/state of each ambulance is tracked using the `AmbulanceState` enum:
- **`IDLE`**: Ready at a base location.
- **`TO_EMERGENCY`**: Dispatched and driving to the caller.
- **`AT_SCENE`**: Arrived and treating the patient.
- **`TO_HOSPITAL`**: Transporting the patient to a medical facility.
- **`RETURNING`**: Patient delivered, driving back to base.

### Storage Logic
1. **Contiguous Memory**: Using an array ensures that all ambulance data is stored together in memory, allowing **O(1)** access by index (Unit ID).
2. **Persistence**: The status is updated in real-time within the `updateAmbulanceStates()` function.
3. **Availability**: The `availableAt` field tracks the exact simulation time when the ambulance will complete its current task and become free.

---

## 2. Hospital Storage

### Data Structure: Shared Pool Array
Hospitals are also stored in a global array, with a counter to track how many are active:
```c
Hospital hospitals[MAX_HOSPITALS];
int hospitalCount = 0;
```

### Status & Capacity Tracking
Each `Hospital` struct tracks its own operational status:
- **`capacity`**: The maximum number of patients the hospital can hold.
- **`patients`**: The current number of patients being treated.
- **`specialty`**: The medical field this hospital excels in (e.g., CARDIAC, TRAUMA).

### Logic Highlights
- **Bed Management**: When an ambulance is dispatched, `hospitals[hospIndex].patients++` is called immediately to "reserve" a spot.
- **Discharge Loop**: In the `advanceTime()` function, patients are automatically discharged (`patients--`) every 15 minutes to simulate throughput.
- **Specialty Bonus**: The system uses the `specialty` field in a heuristic to steer the "Best Hospital" selection towards facilities that can actually handle the specific emergency.

---

## 3. Why this approach?
- **Speed**: Accessing `ambulances[2]` or `hospitals[0]` is instant.
- **Simplicity**: For a standard city-level simulation (5-10 units), arrays are more reliable and easier to debug than complex linked lists or hash maps.
- **State Machine Integration**: Using an enum-based state machine inside an array of structs is the industry standard for logistics and simulation software.
