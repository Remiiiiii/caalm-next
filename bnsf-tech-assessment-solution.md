### Task 1 solution (`solution.java`)

```java
import java.util.HashMap;
import java.util.Map;

class Solution {
    public int solution(int[] A, int R) {
        int totalShelfCount = A.length;
        if (R >= totalShelfCount) {
            return 0;
        }

        Map<Integer, Integer> typeTotalFrequency = new HashMap<>();
        for (int shelfPointer = 0; shelfPointer < totalShelfCount; shelfPointer++) {
            int shelfTypeId = A[shelfPointer];
            typeTotalFrequency.put(shelfTypeId, typeTotalFrequency.getOrDefault(shelfTypeId, 0) + 1);
        }

        int distinctTypeCount = typeTotalFrequency.size();
        Map<Integer, Integer> typeWindowFrequency = new HashMap<>();
        int remainingTypeCount = distinctTypeCount;

        // Initialize first window [0, R - 1]
        for (int windowIndex = 0; windowIndex < R; windowIndex++) {
            int windowTypeId = A[windowIndex];
            int windowInsideBefore = typeWindowFrequency.getOrDefault(windowTypeId, 0);
            int windowInsideAfter = windowInsideBefore + 1;
            typeWindowFrequency.put(windowTypeId, windowInsideAfter);

            if (windowInsideAfter == typeTotalFrequency.get(windowTypeId)) {
                remainingTypeCount--;
            }
        }

        int bestRemainingTypeCount = remainingTypeCount;

        // Slide window across shelves
        for (int windowStartIndex = 1; windowStartIndex + R <= totalShelfCount; windowStartIndex++) {
            int windowEndIndex = windowStartIndex + R - 1;

            // Element leaving the window (at windowStartIndex - 1)
            int leavingTypeId = A[windowStartIndex - 1];
            int leavingInsideBefore = typeWindowFrequency.get(leavingTypeId);
            if (leavingInsideBefore == typeTotalFrequency.get(leavingTypeId)) {
                remainingTypeCount++;
            }
            int leavingInsideAfter = leavingInsideBefore - 1;
            if (leavingInsideAfter == 0) {
                typeWindowFrequency.remove(leavingTypeId);
            } else {
                typeWindowFrequency.put(leavingTypeId, leavingInsideAfter);
            }

            // Element entering the window (at windowEndIndex)
            int enteringTypeId = A[windowEndIndex];
            int enteringInsideBefore = typeWindowFrequency.getOrDefault(enteringTypeId, 0);
            int enteringInsideAfter = enteringInsideBefore + 1;
            typeWindowFrequency.put(enteringTypeId, enteringInsideAfter);

            if (enteringInsideAfter == typeTotalFrequency.get(enteringTypeId)) {
                remainingTypeCount--;
            }

            if (remainingTypeCount > bestRemainingTypeCount) {
                bestRemainingTypeCount = remainingTypeCount;
            }
        }

        return bestRemainingTypeCount;
    }
}
```



















