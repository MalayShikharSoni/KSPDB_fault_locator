# Glossary

- **DT (Distribution Transformer)**: Steps down the 11kV voltage from the feeder to Low Tension (LT) voltage for residential use. In our topology, it is the root of the pole tree.
- **Feeder**: The 11kV line that supplies power from a substation to multiple DTs.
- **Substation**: The source of power for multiple feeders.
- **Pole**: The structure holding the LT wire. They have sensors (devices) reporting live/dark state.
- **Topology**: The graph/tree showing how poles are wired to each other and to the DT.
- **Surveyed Topology**: Topology where we exactly know the parent-child relationship of poles.
- **Inferred Topology**: Topology approximated using a Minimum Spanning Tree (MST) because the exact wiring data is missing.
- **Boundary**: The specific span (edge) between a live parent pole and a dark child pole. This indicates the exact location of a fault.
