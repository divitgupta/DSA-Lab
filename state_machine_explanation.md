# Understanding State Machines

In your project, the **State Machine** is the brain that tracks exactly where each ambulance is and what it is doing at any given moment.

---

## 1. What is a State Machine?
A **Finite State Machine (FSM)** is a behavioral model that can be in exactly **one of a limited number of states** at any given time. It changes from one state to another (called a **transition**) in response to an event.

### Real-World Example: A Traffic Light
- **States**: Red, Yellow, Green.
- **Rule**: It can't be both Red and Green at the same time.
- **Event**: A timer finishes, causing a transition from Green to Yellow.

---

## 2. The Ambulance State Machine
In `ambulance.c` (and `app.js`), our "Machine" is the `Ambulance` struct, and its "State" is the `AmbulanceState` enum.

### The 5 States of our System:
1.  **IDLE**: The ambulance is parked at its base (Hospital), waiting for a call.
2.  **TO_EMERGENCY**: A call was received; the ambulance is driving to the patient's location.
3.  **AT_SCENE**: The ambulance has arrived and paramedics are treating the patient.
4.  **TO_HOSPITAL**: The patient is inside, and the ambulance is driving to the hospital.
5.  **RETURNING**: The patient is delivered; the ambulance is on a "cooldown" trip back to its base.

---

## 3. How Transitions Work in your Code
Your `advanceTime()` function is the "Engine" that manages these transitions.

**Logic Flow:**
- **IF** state is `TO_EMERGENCY` **AND** current time matches `availableAt`...
- **THEN** change state to `AT_SCENE` **AND** set a new `availableAt` time (time spend on scene).

### Visualizing the Cycle:
`IDLE` → `TO_EMERGENCY` → `AT_SCENE` → `TO_HOSPITAL` → `RETURNING` → Back to `IDLE`

---

## 4. Key Takeaways for Viva
- **Predictability**: State machines prevent bugs like an ambulance trying to pick up a new patient while it is still delivering one to a hospital.
- **Enumerations (`enum`)**: In C, we use `enum` to make states human-readable (writing `TO_EMERGENCY` instead of just the number `1`).
- **Scalability**: It makes the code easy to expand. If you wanted to add a "Refueling" state, you just add one entry to the `enum` and one `if` statement in the `advanceTime` logic.
