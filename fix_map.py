with open('src/pages/WorkoutPage.tsx', 'r') as f:
    lines = f.readlines()

# Current lines 1664-1673 (0-indexed: 1663-1672)
# Line 1664: </button> + 23 spaces + </div> (merged)
# Line 1665: ))} with 20 spaces (should be 23 spaces + ))})
# Line 1666: </div> with 19 spaces (should be 20 spaces + </div>)
# Line 1671: </div> + 18 spaces + })} (should be </Button>)
# Line 1672: </div> with 13 spaces (should be 18 spaces + </div>)
# Line 1673: </div> with 9 spaces (should be 19 spaces + ))})

# Print current state to verify
for i in range(1663, 1675):
    print(f"{i+1}: {lines[i]!r}")
