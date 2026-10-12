import sys

with open('src/pages/WorkoutPage.tsx', 'r') as f:
    lines = f.readlines()

# Current content of lines 1650-1680 (1-indexed)
# Print with line numbers to identify which lines need fixing
for i in range(1648, 1679):
    print(f"{i+1}: {lines[i]!r}")
