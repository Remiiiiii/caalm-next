 Error: expect(received).toHaveProperty(path)

    Expected path: "notifications"
    Received path: []

    Received value: {"data": [], "limit": 20, "page": 1, "success": true, "total": 0}

      63 | 			const data = await response.json();
      64 |
    > 65 | 			expect(data).toHaveProperty("notifications");
         | 			             ^
      66 | 			expect(data).toHaveProperty("total");
      67 | 			expect(Array.isArray(data.notifications)).toBe(true);
      68 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:65:17

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-5c8ee-oint-with-user-id-parameter-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

  2) [chromium] › tests/components/notification-/notification-api-only.spec.ts:72:7 › Notification System API Tests (Working Endpoints Only) › API Endpoints with Required Parameters › should handle notifications endpoint without user_id parameter (should fail) 

    Error: expect(received).toHaveProperty(path)

    Expected path: "message"
    Received path: []

    Received value: {"error": "User ID is required"}

      80 |
      81 | 			expect(data).toHaveProperty("error");
    > 82 | 			expect(data).toHaveProperty("message");
         | 			             ^
      83 | 			expect(data.message).toContain("user_id is required");
      84 |
      85 | 			console.log(
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:82:17

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-88321-r-id-parameter-should-fail--chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: expect(received).toHaveProperty(path)

    Expected path: "message"
    Received path: []

    Received value: {"error": "User ID is required"}

      80 |
      81 | 			expect(data).toHaveProperty("error");
    > 82 | 			expect(data).toHaveProperty("message");
         | 			             ^
      83 | 			expect(data.message).toContain("user_id is required");
      84 |
      85 | 			console.log(
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:82:17

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-88321-r-id-parameter-should-fail--chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

  3) [chromium] › tests/components/notification-/notification-api-only.spec.ts:90:7 › Notification System API Tests (Working Endpoints Only) › API Endpoints with Required Parameters › should handle stats endpoint with user_id parameter 

    Error: expect(received).toHaveProperty(path)

    Expected path: "total"
    Received path: []

    Received value: {"data": {"byPriority": {"high": 0, "low": 0, "medium": 0, "urgent": 0}, "byType": {}, "read": 0, "total": 0, "unread": 0}, "success": true}

       98 | 			const data = await response.json();
       99 |
    > 100 | 			expect(data).toHaveProperty("total");
          | 			             ^
      101 | 			expect(data).toHaveProperty("unread");
      102 | 			expect(data).toHaveProperty("read");
      103 | 			expect(data).toHaveProperty("byType");
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:100:17

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-24826-oint-with-user-id-parameter-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: expect(received).toHaveProperty(path)

    Expected path: "total"
    Received path: []

    Received value: {"data": {"byPriority": {"high": 0, "low": 0, "medium": 0, "urgent": 0}, "byType": {}, "read": 0, "total": 0, "unread": 0}, "success": true}

       98 | 			const data = await response.json();
       99 |
    > 100 | 			expect(data).toHaveProperty("total");
          | 			             ^
      101 | 			expect(data).toHaveProperty("unread");
      102 | 			expect(data).toHaveProperty("read");
      103 | 			expect(data).toHaveProperty("byType");
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:100:17

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-24826-oint-with-user-id-parameter-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

  4) [chromium] › tests/components/notification-/notification-api-only.spec.ts:109:7 › Notification System API Tests (Working Endpoints Only) › API Endpoints with Required Parameters › should handle unread count endpoint with user_id parameter 

    Error: expect(received).toHaveProperty(path)

    Expected path: "count"
    Received path: []

    Received value: {"data": {"count": 0}, "success": true}

      117 | 			const data = await response.json();
      118 |
    > 119 | 			expect(data).toHaveProperty("count");
          | 			             ^
      120 | 			expect(typeof data.count).toBe("number");
      121 |
      122 | 			console.log("✅ Unread count endpoint works with user_id parameter");
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:119:17

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-7e265-oint-with-user-id-parameter-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: expect(received).toHaveProperty(path)

    Expected path: "count"
    Received path: []

    Received value: {"data": {"count": 0}, "success": true}

      117 | 			const data = await response.json();
      118 |
    > 119 | 			expect(data).toHaveProperty("count");
          | 			             ^
      120 | 			expect(typeof data.count).toBe("number");
      121 |
      122 | 			console.log("✅ Unread count endpoint works with user_id parameter");
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:119:17

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-7e265-oint-with-user-id-parameter-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

  5) [chromium] › tests/components/notification-/notification-api-only.spec.ts:125:7 › Notification System API Tests (Working Endpoints Only) › API Endpoints with Required Parameters › should handle recent notifications endpoint with user_id parameter 

    Error: expect(received).toHaveProperty(path)

    Expected path: "notifications"
    Received path: []

    Received value: {"data": [], "success": true}

      133 | 			const data = await response.json();
      134 |
    > 135 | 			expect(data).toHaveProperty("notifications");
          | 			             ^
      136 | 			expect(data).toHaveProperty("total");
      137 | 			expect(Array.isArray(data.notifications)).toBe(true);
      138 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:135:17

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-750e4-oint-with-user-id-parameter-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: expect(received).toHaveProperty(path)

    Expected path: "notifications"
    Received path: []

    Received value: {"data": [], "success": true}

      133 | 			const data = await response.json();
      134 |
    > 135 | 			expect(data).toHaveProperty("notifications");
          | 			             ^
      136 | 			expect(data).toHaveProperty("total");
      137 | 			expect(Array.isArray(data.notifications)).toBe(true);
      138 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:135:17

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-750e4-oint-with-user-id-parameter-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

  6) [chromium] › tests/components/notification-/notification-api-only.spec.ts:144:7 › Notification System API Tests (Working Endpoints Only) › API Endpoints with Required Parameters › should handle dashboard stats with orgId parameter 

    Error: expect(received).toHaveProperty(path)

    Expected path: "totalContracts"
    Received path: []

    Received value: {"data": {"activeUsers": 3, "complianceRate": "95%", "expiringContracts": 0, "totalContracts": 3}}

      152 | 			const data = await response.json();
      153 |
    > 154 | 			expect(data).toHaveProperty("totalContracts");
          | 			             ^
      155 | 			expect(data).toHaveProperty("activeContracts");
      156 | 			expect(data).toHaveProperty("pendingContracts");
      157 | 			expect(data).toHaveProperty("completedContracts");
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:154:17

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-26716--stats-with-orgId-parameter-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: expect(received).toHaveProperty(path)

    Expected path: "totalContracts"
    Received path: []

    Received value: {"data": {"activeUsers": 3, "complianceRate": "95%", "expiringContracts": 0, "totalContracts": 3}}

      152 | 			const data = await response.json();
      153 |
    > 154 | 			expect(data).toHaveProperty("totalContracts");
          | 			             ^
      155 | 			expect(data).toHaveProperty("activeContracts");
      156 | 			expect(data).toHaveProperty("pendingContracts");
      157 | 			expect(data).toHaveProperty("completedContracts");
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:154:17

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-26716--stats-with-orgId-parameter-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

  7) [chromium] › tests/components/notification-/notification-api-only.spec.ts:192:7 › Notification System API Tests (Working Endpoints Only) › API Error Handling › should handle missing user_id parameter gracefully 

    Error: expect(received).toHaveProperty(path)

    Expected path: "message"
    Received path: []

    Received value: {"error": "User ID is required"}

      206 | 				const data = await response.json();
      207 | 				expect(data).toHaveProperty("error");
    > 208 | 				expect(data).toHaveProperty("message");
          | 				             ^
      209 | 				expect(data.message).toContain("user_id is required");
      210 | 			}
      211 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:208:18

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-39c89-ser-id-parameter-gracefully-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: expect(received).toHaveProperty(path)

    Expected path: "message"
    Received path: []

    Received value: {"error": "User ID is required"}

      206 | 				const data = await response.json();
      207 | 				expect(data).toHaveProperty("error");
    > 208 | 				expect(data).toHaveProperty("message");
          | 				             ^
      209 | 				expect(data.message).toContain("user_id is required");
      210 | 			}
      211 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:208:18

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-39c89-ser-id-parameter-gracefully-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

  8) [chromium] › tests/components/notification-/notification-api-only.spec.ts:217:7 › Notification System API Tests (Working Endpoints Only) › API Error Handling › should handle missing orgId parameter gracefully 

    Error: expect(received).toHaveProperty(path)

    Expected path: "message"
    Received path: []

    Received value: {"error": "Organization ID is required"}

      226 | 				const data = await response.json();
      227 | 				expect(data).toHaveProperty("error");
    > 228 | 				expect(data).toHaveProperty("message");
          | 				             ^
      229 | 				expect(data.message).toContain("orgId is required");
      230 | 			}
      231 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:228:18

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-997a9--orgId-parameter-gracefully-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: expect(received).toHaveProperty(path)

    Expected path: "message"
    Received path: []

    Received value: {"error": "Organization ID is required"}

      226 | 				const data = await response.json();
      227 | 				expect(data).toHaveProperty("error");
    > 228 | 				expect(data).toHaveProperty("message");
          | 				             ^
      229 | 				expect(data.message).toContain("orgId is required");
      230 | 			}
      231 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:228:18

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-997a9--orgId-parameter-gracefully-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

  9) [chromium] › tests/components/notification-/notification-component.spec.ts:7:6 › Notification System Component Tests › should render notification center with test data 

    Error: expect(locator).toBeVisible() failed

    Locator: locator('[data-testid="notification-center"]')
    Expected: visible
    Timeout: 8000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for locator('[data-testid="notification-center"]')


      87 | 		await expect(
      88 | 			page.locator('[data-testid="notification-center"]'),
    > 89 | 		).toBeVisible();
         | 		  ^
      90 | 	});
      91 |
      92 | 	test("should handle API errors gracefully", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-component.spec.ts:89:5

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-551ce-ation-center-with-test-data-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-551ce-ation-center-with-test-data-chromium/error-context.md

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: expect(locator).toBeVisible() failed

    Locator: locator('[data-testid="notification-center"]')
    Expected: visible
    Timeout: 8000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for locator('[data-testid="notification-center"]')


      87 | 		await expect(
      88 | 			page.locator('[data-testid="notification-center"]'),
    > 89 | 		).toBeVisible();
         | 		  ^
      90 | 	});
      91 |
      92 | 	test("should handle API errors gracefully", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-component.spec.ts:89:5

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-551ce-ation-center-with-test-data-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-551ce-ation-center-with-test-data-chromium-retry1/error-context.md

  10) [chromium] › tests/components/notification-/notification-component.spec.ts:92:6 › Notification System Component Tests › should handle API errors gracefully 

    Error: expect(locator).toBeVisible() failed

    Locator: locator('[data-testid="error-message"]')
    Expected: visible
    Timeout: 8000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for locator('[data-testid="error-message"]')


      111 |
      112 | 		// Check for error handling
    > 113 | 		await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
          | 		                                                            ^
      114 | 	});
      115 |
      116 | 	test("should handle empty notification list", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-component.spec.ts:113:63

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-9cbae-andle-API-errors-gracefully-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-9cbae-andle-API-errors-gracefully-chromium/error-context.md

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: expect(locator).toBeVisible() failed

    Locator: locator('[data-testid="error-message"]')
    Expected: visible
    Timeout: 8000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for locator('[data-testid="error-message"]')


      111 |
      112 | 		// Check for error handling
    > 113 | 		await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
          | 		                                                            ^
      114 | 	});
      115 |
      116 | 	test("should handle empty notification list", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-component.spec.ts:113:63

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-9cbae-andle-API-errors-gracefully-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-9cbae-andle-API-errors-gracefully-chromium-retry1/error-context.md

  11) [chromium] › tests/components/notification-/notification-component.spec.ts:116:6 › Notification System Component Tests › should handle empty notification list 

    Error: expect(locator).toBeVisible() failed

    Locator: locator('[data-testid="empty-state"]')
    Expected: visible
    Timeout: 8000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for locator('[data-testid="empty-state"]')


      135 |
      136 | 		// Check for empty state
    > 137 | 		await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
          | 		                                                          ^
      138 | 	});
      139 | });
      140 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-component.spec.ts:137:61

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-933ee-dle-empty-notification-list-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-933ee-dle-empty-notification-list-chromium/error-context.md

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: expect(locator).toBeVisible() failed

    Locator: locator('[data-testid="empty-state"]')
    Expected: visible
    Timeout: 8000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for locator('[data-testid="empty-state"]')


      135 |
      136 | 		// Check for empty state
    > 137 | 		await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
          | 		                                                          ^
      138 | 	});
      139 | });
      140 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-component.spec.ts:137:61

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-933ee-dle-empty-notification-list-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-933ee-dle-empty-notification-list-chromium-retry1/error-context.md

  12) [chromium] › tests/components/notification-/notification-system.spec.ts:216:7 › Notification System Enhancement › NotificationCenter Component › should display notification center 

    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-center"]') to be visible


      222 |
      223 | 			// Wait for the notification center to be visible
    > 224 | 			await page.waitForSelector('[data-testid="notification-center"]', {
          | 			           ^
      225 | 				timeout: 10000,
      226 | 			});
      227 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:224:15

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-af74b-display-notification-center-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-af74b-display-notification-center-chromium/error-context.md

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-center"]') to be visible


      222 |
      223 | 			// Wait for the notification center to be visible
    > 224 | 			await page.waitForSelector('[data-testid="notification-center"]', {
          | 			           ^
      225 | 				timeout: 10000,
      226 | 			});
      227 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:224:15

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-af74b-display-notification-center-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-af74b-display-notification-center-chromium-retry1/error-context.md

  13) [chromium] › tests/components/notification-/notification-system.spec.ts:235:7 › Notification System Enhancement › NotificationCenter Component › should display notification list 

    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      240 |
      241 | 			// Wait for notifications to load
    > 242 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      243 | 				timeout: 10000,
      244 | 			});
      245 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:242:15

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-41596-d-display-notification-list-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-41596-d-display-notification-list-chromium/error-context.md

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      240 |
      241 | 			// Wait for notifications to load
    > 242 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      243 | 				timeout: 10000,
      244 | 			});
      245 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:242:15

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-41596-d-display-notification-list-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-41596-d-display-notification-list-chromium-retry1/error-context.md

  14) [chromium] › tests/components/notification-/notification-system.spec.ts:252:7 › Notification System Enhancement › NotificationCenter Component › should display notification filters 

    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-filters"]') to be visible


      257 |
      258 | 			// Wait for filters to be visible
    > 259 | 			await page.waitForSelector('[data-testid="notification-filters"]', {
          | 			           ^
      260 | 				timeout: 10000,
      261 | 			});
      262 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:259:15

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-040c0-isplay-notification-filters-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-040c0-isplay-notification-filters-chromium/error-context.md

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-filters"]') to be visible


      257 |
      258 | 			// Wait for filters to be visible
    > 259 | 			await page.waitForSelector('[data-testid="notification-filters"]', {
          | 			           ^
      260 | 				timeout: 10000,
      261 | 			});
      262 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:259:15

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-040c0-isplay-notification-filters-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-040c0-isplay-notification-filters-chromium-retry1/error-context.md

  15) [chromium] › tests/components/notification-/notification-system.spec.ts:275:7 › Notification System Enhancement › NotificationCenter Component › should display notification statistics 

    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-stats"]') to be visible


      280 |
      281 | 			// Wait for stats to be visible
    > 282 | 			await page.waitForSelector('[data-testid="notification-stats"]', {
          | 			           ^
      283 | 				timeout: 10000,
      284 | 			});
      285 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:282:15

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-1f582-lay-notification-statistics-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-1f582-lay-notification-statistics-chromium/error-context.md

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-stats"]') to be visible


      280 |
      281 | 			// Wait for stats to be visible
    > 282 | 			await page.waitForSelector('[data-testid="notification-stats"]', {
          | 			           ^
      283 | 				timeout: 10000,
      284 | 			});
      285 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:282:15

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-1f582-lay-notification-statistics-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-1f582-lay-notification-statistics-chromium-retry1/error-context.md

  16) [chromium] › tests/components/notification-/notification-system.spec.ts:300:7 › Notification System Enhancement › Notification Interactions › should mark notification as read when clicked 

    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-item"]') to be visible


      305 |
      306 | 			// Wait for notifications to load
    > 307 | 			await page.waitForSelector('[data-testid="notification-item"]', {
          | 			           ^
      308 | 				timeout: 10000,
      309 | 			});
      310 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:307:15

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-e5e75-cation-as-read-when-clicked-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-e5e75-cation-as-read-when-clicked-chromium/error-context.md

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-item"]') to be visible


      305 |
      306 | 			// Wait for notifications to load
    > 307 | 			await page.waitForSelector('[data-testid="notification-item"]', {
          | 			           ^
      308 | 				timeout: 10000,
      309 | 			});
      310 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:307:15

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-e5e75-cation-as-read-when-clicked-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-e5e75-cation-as-read-when-clicked-chromium-retry1/error-context.md

  17) [chromium] › tests/components/notification-/notification-system.spec.ts:329:7 › Notification System Enhancement › Notification Interactions › should filter notifications by priority 

    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="priority-filter"]') to be visible


      334 |
      335 | 			// Wait for filters to load
    > 336 | 			await page.waitForSelector('[data-testid="priority-filter"]', {
          | 			           ^
      337 | 				timeout: 10000,
      338 | 			});
      339 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:336:15

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-be7b8-r-notifications-by-priority-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-be7b8-r-notifications-by-priority-chromium/error-context.md

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="priority-filter"]') to be visible


      334 |
      335 | 			// Wait for filters to load
    > 336 | 			await page.waitForSelector('[data-testid="priority-filter"]', {
          | 			           ^
      337 | 				timeout: 10000,
      338 | 			});
      339 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:336:15

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-be7b8-r-notifications-by-priority-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-be7b8-r-notifications-by-priority-chromium-retry1/error-context.md

  18) [chromium] › tests/components/notification-/notification-system.spec.ts:361:7 › Notification System Enhancement › Notification Interactions › should sort notifications by date 

    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="sort-controls"]') to be visible


      366 |
      367 | 			// Wait for sort controls to load
    > 368 | 			await page.waitForSelector('[data-testid="sort-controls"]', {
          | 			           ^
      369 | 				timeout: 10000,
      370 | 			});
      371 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:368:15

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-6b661--sort-notifications-by-date-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-6b661--sort-notifications-by-date-chromium/error-context.md

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="sort-controls"]') to be visible


      366 |
      367 | 			// Wait for sort controls to load
    > 368 | 			await page.waitForSelector('[data-testid="sort-controls"]', {
          | 			           ^
      369 | 				timeout: 10000,
      370 | 			});
      371 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:368:15

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-6b661--sort-notifications-by-date-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-6b661--sort-notifications-by-date-chromium-retry1/error-context.md

  19) [chromium] › tests/components/notification-/notification-system.spec.ts:401:7 › Notification System Enhancement › Real-time Updates › should update notification count in real-time 

    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="unread-count"]') to be visible


      409 |
      410 | 			// Wait for initial load
    > 411 | 			await page.waitForSelector('[data-testid="unread-count"]', {
          | 			           ^
      412 | 				timeout: 10000,
      413 | 			});
      414 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:411:15

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-e0c14-fication-count-in-real-time-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-e0c14-fication-count-in-real-time-chromium/error-context.md

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="unread-count"]') to be visible


      409 |
      410 | 			// Wait for initial load
    > 411 | 			await page.waitForSelector('[data-testid="unread-count"]', {
          | 			           ^
      412 | 				timeout: 10000,
      413 | 			});
      414 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:411:15

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/components-notification--n-e0c14-fication-count-in-real-time-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/components-notification--n-e0c14-fication-count-in-real-time-chromium-retry1/error-context.md

  20) [chromium] › tests/components/notification-/notification-system.spec.ts:444:7 › Notification System Enhancement › Error Handling › should handle API errors gracefully 

    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="error-message"]') to be visible


      458 |
      459 | 			// Wait for error state
    > 460 | 			await page.waitForSelector('[data-testid="error-message"]', {
          | 			           ^
      461 | 				timeout: 10000,
      462 | 			});
      463 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:460:15