# Glossary

- **DT (Distribution Transformer)**: Steps down the 11kV voltage from the feeder to Low Tension (LT) voltage for residential use. In our topology, it is the root of the pole tree.
- **Feeder**: The 11kV line that supplies power from a substation to multiple DTs.
- **Substation**: The source of power for multiple feeders.
- **Pole**: The structure holding the LT wire. They have sensors (devices) reporting live/dark state.
- **Topology**: The graph/tree showing how poles are wired to each other and to the DT.
- **Surveyed Topology**: Topology where we exactly know the parent-child relationship of poles.
- **Inferred Topology**: Topology approximated using a Minimum Spanning Tree (MST) because the exact wiring data is missing.
- **Boundary**: The specific span (edge) between a live parent pole and a dark child pole. This indicates the exact location of a fault.
- **MST (Minimum Spanning Tree)**: A subset of edges that connects all poles to the DT with the minimum possible total wire length. Used for topology inference.
- **Prim's Algorithm**: A greedy algorithm that finds an MST by growing a single connected tree outward from a root (our DT).
- **Boundary Traversal (DFS)**: A depth-first search through the pole tree to find the exact edge where power drops from live to dark.
- **Corroboration Confidence**: A factor in our localization score reflecting how many downstream poles also reported power loss, verifying it wasn't just a single broken sensor.
- **Boundary Clarity**: A confidence factor based on whether the boundary edge connects two known devices, or if it crosses over a "gap" pole with no device.
- **Hardware Issue (Broken Sensor)**: A state where a pole claims to be dark, but poles downstream of it have power. This breaks the physics of a wire fault and must be a localized device failure.
- **Simulator**: An internal engine designed to inject faults (span, DT, feeder) and generate realistic, imperfect telemetry payloads, modeling real-world noise like capacitor failures and bad firmware.
