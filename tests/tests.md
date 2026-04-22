Error:   1) [chromium] › tests/components/notification-/notification-api-only.spec.ts:165:7 › Notification System API Tests (Working Endpoints Only) › API Endpoints with Required Parameters › should handle dashboard stats with orgId parameter 
    Error: expect(received).toHaveProperty(path)

    Expected path: "totalContracts"
    Received path: []

    Received value: {"data": {"activeUsers": 3, "complianceRate": "95%", "expiringContracts": 0, "totalContracts": 3}}

      173 | 			const data = await response.json();
      174 |
    > 175 | 			expect(data).toHaveProperty("totalContracts");
          | 			             ^
      176 | 			expect(data).toHaveProperty("activeContracts");
      177 | 			expect(data).toHaveProperty("pendingContracts");
      178 | 			expect(data).toHaveProperty("completedContracts");
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:175:17
Error:   1) [chromium] › tests/components/notification-/notification-api-only.spec.ts:165:7 › Notification System API Tests (Working Endpoints Only) › API Endpoints with Required Parameters › should handle dashboard stats with orgId parameter 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(received).toHaveProperty(path)

    Expected path: "totalContracts"
    Received path: []

    Received value: {"data": {"activeUsers": 3, "complianceRate": "95%", "expiringContracts": 0, "totalContracts": 3}}

      173 | 			const data = await response.json();
      174 |
    > 175 | 			expect(data).toHaveProperty("totalContracts");
          | 			             ^
      176 | 			expect(data).toHaveProperty("activeContracts");
      177 | 			expect(data).toHaveProperty("pendingContracts");
      178 | 			expect(data).toHaveProperty("completedContracts");
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:175:17
Error:   2) [chromium] › tests/components/notification-/notification-api-only.spec.ts:238:7 › Notification System API Tests (Working Endpoints Only) › API Error Handling › should handle missing orgId parameter gracefully 
    Error: expect(received).toHaveProperty(path)

    Expected path: "message"
    Received path: []

    Received value: {"error": "Organization ID is required"}

      247 | 				const data = await response.json();
      248 | 				expect(data).toHaveProperty("error");
    > 249 | 				expect(data).toHaveProperty("message");
          | 				             ^
      250 | 				expect(data.message).toContain("orgId is required");
      251 | 			}
      252 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:249:18
Error:   2) [chromium] › tests/components/notification-/notification-api-only.spec.ts:238:7 › Notification System API Tests (Working Endpoints Only) › API Error Handling › should handle missing orgId parameter gracefully 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(received).toHaveProperty(path)

    Expected path: "message"
    Received path: []

    Received value: {"error": "Organization ID is required"}

      247 | 				const data = await response.json();
      248 | 				expect(data).toHaveProperty("error");
    > 249 | 				expect(data).toHaveProperty("message");
          | 				             ^
      250 | 				expect(data.message).toContain("orgId is required");
      251 | 			}
      252 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:249:18
Error:   3) [chromium] › tests/components/notification-/notification-component.spec.ts:7:6 › Notification System Component Tests › should render notification center with test data 
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
Error:   3) [chromium] › tests/components/notification-/notification-component.spec.ts:7:6 › Notification System Component Tests › should render notification center with test data 

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
Error:   4) [chromium] › tests/components/notification-/notification-component.spec.ts:92:6 › Notification System Component Tests › should handle API errors gracefully 
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
Error:   4) [chromium] › tests/components/notification-/notification-component.spec.ts:92:6 › Notification System Component Tests › should handle API errors gracefully 

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
Error:   5) [chromium] › tests/components/notification-/notification-component.spec.ts:116:6 › Notification System Component Tests › should handle empty notification list 
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
Error:   5) [chromium] › tests/components/notification-/notification-component.spec.ts:116:6 › Notification System Component Tests › should handle empty notification list 

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
Error:   6) [chromium] › tests/components/notification-/notification-system.spec.ts:237:7 › Notification System Enhancement › NotificationCenter Component › should display notification center 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-center"]') to be visible


      243 |
      244 | 			// Wait for the notification center to be visible
    > 245 | 			await page.waitForSelector('[data-testid="notification-center"]', {
          | 			           ^
      246 | 				timeout: 10000,
      247 | 			});
      248 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:245:15
Error:   6) [chromium] › tests/components/notification-/notification-system.spec.ts:237:7 › Notification System Enhancement › NotificationCenter Component › should display notification center 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-center"]') to be visible


      243 |
      244 | 			// Wait for the notification center to be visible
    > 245 | 			await page.waitForSelector('[data-testid="notification-center"]', {
          | 			           ^
      246 | 				timeout: 10000,
      247 | 			});
      248 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:245:15
Error:   7) [chromium] › tests/components/notification-/notification-system.spec.ts:256:7 › Notification System Enhancement › NotificationCenter Component › should display notification list 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      261 |
      262 | 			// Wait for notifications to load
    > 263 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      264 | 				timeout: 10000,
      265 | 			});
      266 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:263:15
Error:   7) [chromium] › tests/components/notification-/notification-system.spec.ts:256:7 › Notification System Enhancement › NotificationCenter Component › should display notification list 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      261 |
      262 | 			// Wait for notifications to load
    > 263 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      264 | 				timeout: 10000,
      265 | 			});
      266 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:263:15
Error:   8) [chromium] › tests/components/notification-/notification-system.spec.ts:273:7 › Notification System Enhancement › NotificationCenter Component › should display notification filters 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-filters"]') to be visible


      278 |
      279 | 			// Wait for filters to be visible
    > 280 | 			await page.waitForSelector('[data-testid="notification-filters"]', {
          | 			           ^
      281 | 				timeout: 10000,
      282 | 			});
      283 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:280:15
Error:   8) [chromium] › tests/components/notification-/notification-system.spec.ts:273:7 › Notification System Enhancement › NotificationCenter Component › should display notification filters 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-filters"]') to be visible


      278 |
      279 | 			// Wait for filters to be visible
    > 280 | 			await page.waitForSelector('[data-testid="notification-filters"]', {
          | 			           ^
      281 | 				timeout: 10000,
      282 | 			});
      283 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:280:15
Error:   9) [chromium] › tests/components/notification-/notification-system.spec.ts:296:7 › Notification System Enhancement › NotificationCenter Component › should display notification statistics 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-stats"]') to be visible


      301 |
      302 | 			// Wait for stats to be visible
    > 303 | 			await page.waitForSelector('[data-testid="notification-stats"]', {
          | 			           ^
      304 | 				timeout: 10000,
      305 | 			});
      306 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:303:15
Error:   9) [chromium] › tests/components/notification-/notification-system.spec.ts:296:7 › Notification System Enhancement › NotificationCenter Component › should display notification statistics 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-stats"]') to be visible


      301 |
      302 | 			// Wait for stats to be visible
    > 303 | 			await page.waitForSelector('[data-testid="notification-stats"]', {
          | 			           ^
      304 | 				timeout: 10000,
      305 | 			});
      306 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:303:15
Error:   10) [chromium] › tests/components/notification-/notification-system.spec.ts:321:7 › Notification System Enhancement › Notification Interactions › should mark notification as read when clicked 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-item"]') to be visible


      326 |
      327 | 			// Wait for notifications to load
    > 328 | 			await page.waitForSelector('[data-testid="notification-item"]', {
          | 			           ^
      329 | 				timeout: 10000,
      330 | 			});
      331 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:328:15
Error:   10) [chromium] › tests/components/notification-/notification-system.spec.ts:321:7 › Notification System Enhancement › Notification Interactions › should mark notification as read when clicked 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-item"]') to be visible


      326 |
      327 | 			// Wait for notifications to load
    > 328 | 			await page.waitForSelector('[data-testid="notification-item"]', {
          | 			           ^
      329 | 				timeout: 10000,
      330 | 			});
      331 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:328:15
Error:   11) [chromium] › tests/components/notification-/notification-system.spec.ts:350:7 › Notification System Enhancement › Notification Interactions › should filter notifications by priority 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="priority-filter"]') to be visible


      355 |
      356 | 			// Wait for filters to load
    > 357 | 			await page.waitForSelector('[data-testid="priority-filter"]', {
          | 			           ^
      358 | 				timeout: 10000,
      359 | 			});
      360 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:357:15
Error:   11) [chromium] › tests/components/notification-/notification-system.spec.ts:350:7 › Notification System Enhancement › Notification Interactions › should filter notifications by priority 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="priority-filter"]') to be visible


      355 |
      356 | 			// Wait for filters to load
    > 357 | 			await page.waitForSelector('[data-testid="priority-filter"]', {
          | 			           ^
      358 | 				timeout: 10000,
      359 | 			});
      360 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:357:15
Error:   12) [chromium] › tests/components/notification-/notification-system.spec.ts:382:7 › Notification System Enhancement › Notification Interactions › should sort notifications by date 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="sort-controls"]') to be visible


      387 |
      388 | 			// Wait for sort controls to load
    > 389 | 			await page.waitForSelector('[data-testid="sort-controls"]', {
          | 			           ^
      390 | 				timeout: 10000,
      391 | 			});
      392 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:389:15
Error:   12) [chromium] › tests/components/notification-/notification-system.spec.ts:382:7 › Notification System Enhancement › Notification Interactions › should sort notifications by date 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="sort-controls"]') to be visible


      387 |
      388 | 			// Wait for sort controls to load
    > 389 | 			await page.waitForSelector('[data-testid="sort-controls"]', {
          | 			           ^
      390 | 				timeout: 10000,
      391 | 			});
      392 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:389:15
Error:   13) [chromium] › tests/components/notification-/notification-system.spec.ts:422:7 › Notification System Enhancement › Real-time Updates › should update notification count in real-time 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="unread-count"]') to be visible


      430 |
      431 | 			// Wait for initial load
    > 432 | 			await page.waitForSelector('[data-testid="unread-count"]', {
          | 			           ^
      433 | 				timeout: 10000,
      434 | 			});
      435 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:432:15
Error:   13) [chromium] › tests/components/notification-/notification-system.spec.ts:422:7 › Notification System Enhancement › Real-time Updates › should update notification count in real-time 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="unread-count"]') to be visible


      430 |
      431 | 			// Wait for initial load
    > 432 | 			await page.waitForSelector('[data-testid="unread-count"]', {
          | 			           ^
      433 | 				timeout: 10000,
      434 | 			});
      435 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:432:15
Error:   14) [chromium] › tests/components/notification-/notification-system.spec.ts:465:7 › Notification System Enhancement › Error Handling › should handle API errors gracefully 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="error-message"]') to be visible


      479 |
      480 | 			// Wait for error state
    > 481 | 			await page.waitForSelector('[data-testid="error-message"]', {
          | 			           ^
      482 | 				timeout: 10000,
      483 | 			});
      484 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:481:15
Error:   14) [chromium] › tests/components/notification-/notification-system.spec.ts:465:7 › Notification System Enhancement › Error Handling › should handle API errors gracefully 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="error-message"]') to be visible


      479 |
      480 | 			// Wait for error state
    > 481 | 			await page.waitForSelector('[data-testid="error-message"]', {
          | 			           ^
      482 | 				timeout: 10000,
      483 | 			});
      484 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:481:15
Error:   15) [chromium] › tests/components/notification-/notification-system.spec.ts:490:7 › Notification System Enhancement › Error Handling › should handle empty notification list 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="empty-state"]') to be visible


      504 |
      505 | 			// Wait for empty state
    > 506 | 			await page.waitForSelector('[data-testid="empty-state"]', {
          | 			           ^
      507 | 				timeout: 10000,
      508 | 			});
      509 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:506:15
Error:   15) [chromium] › tests/components/notification-/notification-system.spec.ts:490:7 › Notification System Enhancement › Error Handling › should handle empty notification list 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="empty-state"]') to be visible


      504 |
      505 | 			// Wait for empty state
    > 506 | 			await page.waitForSelector('[data-testid="empty-state"]', {
          | 			           ^
      507 | 				timeout: 10000,
      508 | 			});
      509 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:506:15
Error:   16) [chromium] › tests/components/notification-/notification-system.spec.ts:517:7 › Notification System Enhancement › Performance › should load notifications efficiently 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      524 |
      525 | 			// Wait for notifications to load
    > 526 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      527 | 				timeout: 10000,
      528 | 			});
      529 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:526:15
Error:   16) [chromium] › tests/components/notification-/notification-system.spec.ts:517:7 › Notification System Enhancement › Performance › should load notifications efficiently 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      524 |
      525 | 			// Wait for notifications to load
    > 526 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      527 | 				timeout: 10000,
      528 | 			});
      529 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:526:15
Error:   17) [chromium] › tests/components/notification-/notification-system.spec.ts:536:7 › Notification System Enhancement › Performance › should handle large notification lists 
    TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      561 |
      562 | 			// Wait for notifications to load
    > 563 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      564 | 				timeout: 15000,
      565 | 			});
      566 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:563:15
Error:   17) [chromium] › tests/components/notification-/notification-system.spec.ts:536:7 › Notification System Enhancement › Performance › should handle large notification lists 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      561 |
      562 | 			// Wait for notifications to load
    > 563 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      564 | 				timeout: 15000,
      565 | 			});
      566 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:563:15
Error:   18) [chromium] › tests/contract-expiry-alerts.spec.ts:131:6 › Contract Expiry Alerts Widget › should render contract expiry alerts widget 
    Error: expect(locator).toBeVisible() failed

    Locator: locator('text=Contract Expiry Alerts').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for locator('text=Contract Expiry Alerts').first()


      126 |
      127 | 		// Now wait for it to be visible
    > 128 | 		await expect(widgetLocator).toBeVisible({ timeout: 10000 });
          | 		                            ^
      129 | 	});
      130 |
      131 | 	test("should render contract expiry alerts widget", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/contract-expiry-alerts.spec.ts:128:31
Error:   18) [chromium] › tests/contract-expiry-alerts.spec.ts:131:6 › Contract Expiry Alerts Widget › should render contract expiry alerts widget 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed

    Locator: locator('text=Contract Expiry Alerts').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for locator('text=Contract Expiry Alerts').first()


      126 |
      127 | 		// Now wait for it to be visible
    > 128 | 		await expect(widgetLocator).toBeVisible({ timeout: 10000 });
          | 		                            ^
      129 | 	});
      130 |
      131 | 	test("should render contract expiry alerts widget", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/contract-expiry-alerts.spec.ts:128:31
Error:   19) [chromium] › tests/contract-expiry-alerts.spec.ts:140:6 › Contract Expiry Alerts Widget › should display filter dropdown 
    Error: expect(locator).toBeVisible() failed

    Locator: locator('text=Contract Expiry Alerts').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for locator('text=Contract Expiry Alerts').first()


      126 |
      127 | 		// Now wait for it to be visible
    > 128 | 		await expect(widgetLocator).toBeVisible({ timeout: 10000 });
          | 		                            ^
      129 | 	});
      130 |
      131 | 	test("should render contract expiry alerts widget", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/contract-expiry-alerts.spec.ts:128:31
Error:   19) [chromium] › tests/contract-expiry-alerts.spec.ts:140:6 › Contract Expiry Alerts Widget › should display filter dropdown 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed

    Locator: locator('text=Contract Expiry Alerts').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for locator('text=Contract Expiry Alerts').first()


      126 |
      127 | 		// Now wait for it to be visible
    > 128 | 		await expect(widgetLocator).toBeVisible({ timeout: 10000 });
          | 		                            ^
      129 | 	});
      130 |
      131 | 	test("should render contract expiry alerts widget", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/contract-expiry-alerts.spec.ts:128:31
Error:   20) [chromium] › tests/contract-expiry-alerts.spec.ts:160:6 › Contract Expiry Alerts Widget › should filter contracts by time period 
    Error: expect(locator).toBeVisible() failed

    Locator: locator('text=Contract Expiry Alerts').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for locator('text=Contract Expiry Alerts').first()


      126 |
      127 | 		// Now wait for it to be visible
    > 128 | 		await expect(widgetLocator).toBeVisible({ timeout: 10000 });
          | 		                            ^
      129 | 	});
      130 |
      131 | 	test("should render contract expiry alerts widget", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/contract-expiry-alerts.spec.ts:128:31
Error:   20) [chromium] › tests/contract-expiry-alerts.spec.ts:160:6 › Contract Expiry Alerts Widget › should filter contracts by time period 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed

    Locator: locator('text=Contract Expiry Alerts').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for locator('text=Contract Expiry Alerts').first()


      126 |
      127 | 		// Now wait for it to be visible
    > 128 | 		await expect(widgetLocator).toBeVisible({ timeout: 10000 });
          | 		                            ^
      129 | 	});
      130 |
      131 | 	test("should render contract expiry alerts widget", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/contract-expiry-alerts.spec.ts:128:31
Error:   21) [chromium] › tests/contract-expiry-alerts.spec.ts:189:6 › Contract Expiry Alerts Widget › should show expired contracts when Expired filter is selected 
    Error: expect(locator).toBeVisible() failed

    Locator: locator('text=Contract Expiry Alerts').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for locator('text=Contract Expiry Alerts').first()


      126 |
      127 | 		// Now wait for it to be visible
    > 128 | 		await expect(widgetLocator).toBeVisible({ timeout: 10000 });
          | 		                            ^
      129 | 	});
      130 |
      131 | 	test("should render contract expiry alerts widget", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/contract-expiry-alerts.spec.ts:128:31
Error:   21) [chromium] › tests/contract-expiry-alerts.spec.ts:189:6 › Contract Expiry Alerts Widget › should show expired contracts when Expired filter is selected 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed

    Locator: locator('text=Contract Expiry Alerts').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for locator('text=Contract Expiry Alerts').first()


      126 |
      127 | 		// Now wait for it to be visible
    > 128 | 		await expect(widgetLocator).toBeVisible({ timeout: 10000 });
          | 		                            ^
      129 | 	});
      130 |
      131 | 	test("should render contract expiry alerts widget", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/contract-expiry-alerts.spec.ts:128:31
Error:   22) [chromium] › tests/contract-expiry-alerts.spec.ts:207:6 › Contract Expiry Alerts Widget › should show pulsating animation for expiring contracts badge 
    Error: expect(locator).toBeVisible() failed

    Locator: locator('text=Contract Expiry Alerts').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for locator('text=Contract Expiry Alerts').first()


      126 |
      127 | 		// Now wait for it to be visible
    > 128 | 		await expect(widgetLocator).toBeVisible({ timeout: 10000 });
          | 		                            ^
      129 | 	});
      130 |
      131 | 	test("should render contract expiry alerts widget", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/contract-expiry-alerts.spec.ts:128:31
Error:   22) [chromium] › tests/contract-expiry-alerts.spec.ts:207:6 › Contract Expiry Alerts Widget › should show pulsating animation for expiring contracts badge 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed

    Locator: locator('text=Contract Expiry Alerts').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for locator('text=Contract Expiry Alerts').first()


      126 |
      127 | 		// Now wait for it to be visible
    > 128 | 		await expect(widgetLocator).toBeVisible({ timeout: 10000 });
          | 		                            ^
      129 | 	});
      130 |
      131 | 	test("should render contract expiry alerts widget", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/contract-expiry-alerts.spec.ts:128:31
Error:   23) [chromium] › tests/contract-expiry-alerts.spec.ts:227:6 › Contract Expiry Alerts Widget › should display status badges with correct counts 
    Error: expect(locator).toBeVisible() failed

    Locator: locator('text=Contract Expiry Alerts').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for locator('text=Contract Expiry Alerts').first()


      126 |
      127 | 		// Now wait for it to be visible
    > 128 | 		await expect(widgetLocator).toBeVisible({ timeout: 10000 });
          | 		                            ^
      129 | 	});
      130 |
      131 | 	test("should render contract expiry alerts widget", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/contract-expiry-alerts.spec.ts:128:31
Error:   23) [chromium] › tests/contract-expiry-alerts.spec.ts:227:6 › Contract Expiry Alerts Widget › should display status badges with correct counts 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed

    Locator: locator('text=Contract Expiry Alerts').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for locator('text=Contract Expiry Alerts').first()


      126 |
      127 | 		// Now wait for it to be visible
    > 128 | 		await expect(widgetLocator).toBeVisible({ timeout: 10000 });
          | 		                            ^
      129 | 	});
      130 |
      131 | 	test("should render contract expiry alerts widget", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/contract-expiry-alerts.spec.ts:128:31
Error:   24) [chromium] › tests/contract-expiry-alerts.spec.ts:241:6 › Contract Expiry Alerts Widget › should show empty state when no contracts match filter 
    Error: expect(locator).toBeVisible() failed

    Locator: locator('text=Contract Expiry Alerts').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for locator('text=Contract Expiry Alerts').first()


      126 |
      127 | 		// Now wait for it to be visible
    > 128 | 		await expect(widgetLocator).toBeVisible({ timeout: 10000 });
          | 		                            ^
      129 | 	});
      130 |
      131 | 	test("should render contract expiry alerts widget", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/contract-expiry-alerts.spec.ts:128:31
Error:   24) [chromium] › tests/contract-expiry-alerts.spec.ts:241:6 › Contract Expiry Alerts Widget › should show empty state when no contracts match filter 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed

    Locator: locator('text=Contract Expiry Alerts').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for locator('text=Contract Expiry Alerts').first()


      126 |
      127 | 		// Now wait for it to be visible
    > 128 | 		await expect(widgetLocator).toBeVisible({ timeout: 10000 });
          | 		                            ^
      129 | 	});
      130 |
      131 | 	test("should render contract expiry alerts widget", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/contract-expiry-alerts.spec.ts:128:31
Error:   25) [chromium] › tests/contract-expiry-alerts.spec.ts:258:6 › Contract Expiry Alerts Widget › should handle error state 
    Error: expect(locator).toBeVisible() failed

    Locator: locator('text=Contract Expiry Alerts').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for locator('text=Contract Expiry Alerts').first()


      126 |
      127 | 		// Now wait for it to be visible
    > 128 | 		await expect(widgetLocator).toBeVisible({ timeout: 10000 });
          | 		                            ^
      129 | 	});
      130 |
      131 | 	test("should render contract expiry alerts widget", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/contract-expiry-alerts.spec.ts:128:31
Error:   25) [chromium] › tests/contract-expiry-alerts.spec.ts:258:6 › Contract Expiry Alerts Widget › should handle error state 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed

    Locator: locator('text=Contract Expiry Alerts').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for locator('text=Contract Expiry Alerts').first()


      126 |
      127 | 		// Now wait for it to be visible
    > 128 | 		await expect(widgetLocator).toBeVisible({ timeout: 10000 });
          | 		                            ^
      129 | 	});
      130 |
      131 | 	test("should render contract expiry alerts widget", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/contract-expiry-alerts.spec.ts:128:31
Error:   26) [chromium] › tests/contract-expiry-alerts.spec.ts:279:6 › Contract Expiry Alerts Widget › should update expired contracts on mount 
    Error: expect(locator).toBeVisible() failed

    Locator: locator('text=Contract Expiry Alerts').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for locator('text=Contract Expiry Alerts').first()


      126 |
      127 | 		// Now wait for it to be visible
    > 128 | 		await expect(widgetLocator).toBeVisible({ timeout: 10000 });
          | 		                            ^
      129 | 	});
      130 |
      131 | 	test("should render contract expiry alerts widget", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/contract-expiry-alerts.spec.ts:128:31
Error:   26) [chromium] › tests/contract-expiry-alerts.spec.ts:279:6 › Contract Expiry Alerts Widget › should update expired contracts on mount 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed

    Locator: locator('text=Contract Expiry Alerts').first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for locator('text=Contract Expiry Alerts').first()


      126 |
      127 | 		// Now wait for it to be visible
    > 128 | 		await expect(widgetLocator).toBeVisible({ timeout: 10000 });
          | 		                            ^
      129 | 	});
      130 |
      131 | 	test("should render contract expiry alerts widget", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/contract-expiry-alerts.spec.ts:128:31
Error:   27) [chromium-no-auth] › tests/components/notification-/notification-api-only.spec.ts:165:7 › Notification System API Tests (Working Endpoints Only) › API Endpoints with Required Parameters › should handle dashboard stats with orgId parameter 
    Error: expect(received).toHaveProperty(path)

    Expected path: "totalContracts"
    Received path: []

    Received value: {"data": {"activeUsers": 3, "complianceRate": "95%", "expiringContracts": 0, "totalContracts": 3}}

      173 | 			const data = await response.json();
      174 |
    > 175 | 			expect(data).toHaveProperty("totalContracts");
          | 			             ^
      176 | 			expect(data).toHaveProperty("activeContracts");
      177 | 			expect(data).toHaveProperty("pendingContracts");
      178 | 			expect(data).toHaveProperty("completedContracts");
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:175:17
Error:   27) [chromium-no-auth] › tests/components/notification-/notification-api-only.spec.ts:165:7 › Notification System API Tests (Working Endpoints Only) › API Endpoints with Required Parameters › should handle dashboard stats with orgId parameter 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(received).toHaveProperty(path)

    Expected path: "totalContracts"
    Received path: []

    Received value: {"data": {"activeUsers": 3, "complianceRate": "95%", "expiringContracts": 0, "totalContracts": 3}}

      173 | 			const data = await response.json();
      174 |
    > 175 | 			expect(data).toHaveProperty("totalContracts");
          | 			             ^
      176 | 			expect(data).toHaveProperty("activeContracts");
      177 | 			expect(data).toHaveProperty("pendingContracts");
      178 | 			expect(data).toHaveProperty("completedContracts");
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:175:17
Error:   28) [chromium-no-auth] › tests/components/notification-/notification-api-only.spec.ts:238:7 › Notification System API Tests (Working Endpoints Only) › API Error Handling › should handle missing orgId parameter gracefully 
    Error: expect(received).toHaveProperty(path)

    Expected path: "message"
    Received path: []

    Received value: {"error": "Organization ID is required"}

      247 | 				const data = await response.json();
      248 | 				expect(data).toHaveProperty("error");
    > 249 | 				expect(data).toHaveProperty("message");
          | 				             ^
      250 | 				expect(data.message).toContain("orgId is required");
      251 | 			}
      252 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:249:18
Error:   28) [chromium-no-auth] › tests/components/notification-/notification-api-only.spec.ts:238:7 › Notification System API Tests (Working Endpoints Only) › API Error Handling › should handle missing orgId parameter gracefully 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(received).toHaveProperty(path)

    Expected path: "message"
    Received path: []

    Received value: {"error": "Organization ID is required"}

      247 | 				const data = await response.json();
      248 | 				expect(data).toHaveProperty("error");
    > 249 | 				expect(data).toHaveProperty("message");
          | 				             ^
      250 | 				expect(data.message).toContain("orgId is required");
      251 | 			}
      252 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-api-only.spec.ts:249:18
Error:   29) [chromium-no-auth] › tests/components/notification-/notification-component.spec.ts:7:6 › Notification System Component Tests › should render notification center with test data 
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
Error:   29) [chromium-no-auth] › tests/components/notification-/notification-component.spec.ts:7:6 › Notification System Component Tests › should render notification center with test data 

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
Error:   30) [chromium-no-auth] › tests/components/notification-/notification-component.spec.ts:92:6 › Notification System Component Tests › should handle API errors gracefully 
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
Error:   30) [chromium-no-auth] › tests/components/notification-/notification-component.spec.ts:92:6 › Notification System Component Tests › should handle API errors gracefully 

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
Error:   31) [chromium-no-auth] › tests/components/notification-/notification-component.spec.ts:116:6 › Notification System Component Tests › should handle empty notification list 
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
Error:   31) [chromium-no-auth] › tests/components/notification-/notification-component.spec.ts:116:6 › Notification System Component Tests › should handle empty notification list 

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
Error:   32) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:237:7 › Notification System Enhancement › NotificationCenter Component › should display notification center 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-center"]') to be visible


      243 |
      244 | 			// Wait for the notification center to be visible
    > 245 | 			await page.waitForSelector('[data-testid="notification-center"]', {
          | 			           ^
      246 | 				timeout: 10000,
      247 | 			});
      248 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:245:15
Error:   32) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:237:7 › Notification System Enhancement › NotificationCenter Component › should display notification center 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-center"]') to be visible


      243 |
      244 | 			// Wait for the notification center to be visible
    > 245 | 			await page.waitForSelector('[data-testid="notification-center"]', {
          | 			           ^
      246 | 				timeout: 10000,
      247 | 			});
      248 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:245:15
Error:   33) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:256:7 › Notification System Enhancement › NotificationCenter Component › should display notification list 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      261 |
      262 | 			// Wait for notifications to load
    > 263 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      264 | 				timeout: 10000,
      265 | 			});
      266 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:263:15
Error:   33) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:256:7 › Notification System Enhancement › NotificationCenter Component › should display notification list 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      261 |
      262 | 			// Wait for notifications to load
    > 263 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      264 | 				timeout: 10000,
      265 | 			});
      266 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:263:15
Error:   34) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:273:7 › Notification System Enhancement › NotificationCenter Component › should display notification filters 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-filters"]') to be visible


      278 |
      279 | 			// Wait for filters to be visible
    > 280 | 			await page.waitForSelector('[data-testid="notification-filters"]', {
          | 			           ^
      281 | 				timeout: 10000,
      282 | 			});
      283 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:280:15
Error:   34) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:273:7 › Notification System Enhancement › NotificationCenter Component › should display notification filters 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-filters"]') to be visible


      278 |
      279 | 			// Wait for filters to be visible
    > 280 | 			await page.waitForSelector('[data-testid="notification-filters"]', {
          | 			           ^
      281 | 				timeout: 10000,
      282 | 			});
      283 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:280:15
Error:   35) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:296:7 › Notification System Enhancement › NotificationCenter Component › should display notification statistics 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-stats"]') to be visible


      301 |
      302 | 			// Wait for stats to be visible
    > 303 | 			await page.waitForSelector('[data-testid="notification-stats"]', {
          | 			           ^
      304 | 				timeout: 10000,
      305 | 			});
      306 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:303:15
Error:   35) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:296:7 › Notification System Enhancement › NotificationCenter Component › should display notification statistics 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-stats"]') to be visible


      301 |
      302 | 			// Wait for stats to be visible
    > 303 | 			await page.waitForSelector('[data-testid="notification-stats"]', {
          | 			           ^
      304 | 				timeout: 10000,
      305 | 			});
      306 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:303:15
Error:   36) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:321:7 › Notification System Enhancement › Notification Interactions › should mark notification as read when clicked 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-item"]') to be visible


      326 |
      327 | 			// Wait for notifications to load
    > 328 | 			await page.waitForSelector('[data-testid="notification-item"]', {
          | 			           ^
      329 | 				timeout: 10000,
      330 | 			});
      331 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:328:15
Error:   36) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:321:7 › Notification System Enhancement › Notification Interactions › should mark notification as read when clicked 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-item"]') to be visible


      326 |
      327 | 			// Wait for notifications to load
    > 328 | 			await page.waitForSelector('[data-testid="notification-item"]', {
          | 			           ^
      329 | 				timeout: 10000,
      330 | 			});
      331 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:328:15
Error:   37) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:350:7 › Notification System Enhancement › Notification Interactions › should filter notifications by priority 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="priority-filter"]') to be visible


      355 |
      356 | 			// Wait for filters to load
    > 357 | 			await page.waitForSelector('[data-testid="priority-filter"]', {
          | 			           ^
      358 | 				timeout: 10000,
      359 | 			});
      360 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:357:15
Error:   37) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:350:7 › Notification System Enhancement › Notification Interactions › should filter notifications by priority 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="priority-filter"]') to be visible


      355 |
      356 | 			// Wait for filters to load
    > 357 | 			await page.waitForSelector('[data-testid="priority-filter"]', {
          | 			           ^
      358 | 				timeout: 10000,
      359 | 			});
      360 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:357:15
Error:   38) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:382:7 › Notification System Enhancement › Notification Interactions › should sort notifications by date 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="sort-controls"]') to be visible


      387 |
      388 | 			// Wait for sort controls to load
    > 389 | 			await page.waitForSelector('[data-testid="sort-controls"]', {
          | 			           ^
      390 | 				timeout: 10000,
      391 | 			});
      392 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:389:15
Error:   38) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:382:7 › Notification System Enhancement › Notification Interactions › should sort notifications by date 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="sort-controls"]') to be visible


      387 |
      388 | 			// Wait for sort controls to load
    > 389 | 			await page.waitForSelector('[data-testid="sort-controls"]', {
          | 			           ^
      390 | 				timeout: 10000,
      391 | 			});
      392 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:389:15
Error:   39) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:422:7 › Notification System Enhancement › Real-time Updates › should update notification count in real-time 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="unread-count"]') to be visible


      430 |
      431 | 			// Wait for initial load
    > 432 | 			await page.waitForSelector('[data-testid="unread-count"]', {
          | 			           ^
      433 | 				timeout: 10000,
      434 | 			});
      435 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:432:15
Error:   39) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:422:7 › Notification System Enhancement › Real-time Updates › should update notification count in real-time 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="unread-count"]') to be visible


      430 |
      431 | 			// Wait for initial load
    > 432 | 			await page.waitForSelector('[data-testid="unread-count"]', {
          | 			           ^
      433 | 				timeout: 10000,
      434 | 			});
      435 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:432:15
Error:   40) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:465:7 › Notification System Enhancement › Error Handling › should handle API errors gracefully 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="error-message"]') to be visible


      479 |
      480 | 			// Wait for error state
    > 481 | 			await page.waitForSelector('[data-testid="error-message"]', {
          | 			           ^
      482 | 				timeout: 10000,
      483 | 			});
      484 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:481:15
Error:   40) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:465:7 › Notification System Enhancement › Error Handling › should handle API errors gracefully 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="error-message"]') to be visible


      479 |
      480 | 			// Wait for error state
    > 481 | 			await page.waitForSelector('[data-testid="error-message"]', {
          | 			           ^
      482 | 				timeout: 10000,
      483 | 			});
      484 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:481:15
Error:   41) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:490:7 › Notification System Enhancement › Error Handling › should handle empty notification list 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="empty-state"]') to be visible


      504 |
      505 | 			// Wait for empty state
    > 506 | 			await page.waitForSelector('[data-testid="empty-state"]', {
          | 			           ^
      507 | 				timeout: 10000,
      508 | 			});
      509 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:506:15
Error:   41) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:490:7 › Notification System Enhancement › Error Handling › should handle empty notification list 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="empty-state"]') to be visible


      504 |
      505 | 			// Wait for empty state
    > 506 | 			await page.waitForSelector('[data-testid="empty-state"]', {
          | 			           ^
      507 | 				timeout: 10000,
      508 | 			});
      509 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:506:15
Error:   42) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:517:7 › Notification System Enhancement › Performance › should load notifications efficiently 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      524 |
      525 | 			// Wait for notifications to load
    > 526 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      527 | 				timeout: 10000,
      528 | 			});
      529 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:526:15
Error:   42) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:517:7 › Notification System Enhancement › Performance › should load notifications efficiently 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      524 |
      525 | 			// Wait for notifications to load
    > 526 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      527 | 				timeout: 10000,
      528 | 			});
      529 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:526:15
Error:   43) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:536:7 › Notification System Enhancement › Performance › should handle large notification lists 
    TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      561 |
      562 | 			// Wait for notifications to load
    > 563 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      564 | 				timeout: 15000,
      565 | 			});
      566 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:563:15
Error:   43) [chromium-no-auth] › tests/components/notification-/notification-system.spec.ts:536:7 › Notification System Enhancement › Performance › should handle large notification lists 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      561 |
      562 | 			// Wait for notifications to load
    > 563 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      564 | 				timeout: 15000,
      565 | 			});
      566 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:563:15
Error:   44) [setup] › tests/auth.setup.js:6:5 › authenticate ─────────────────────────────────────────────
    TimeoutError: page.goto: Timeout 10000ms exceeded.
    Call log:
      - navigating to "http://localhost:3000/dashboard", waiting until "domcontentloaded"


      55 |
      56 | 		// Navigate to dashboard directly
    > 57 | 		await page.goto("/dashboard", {
         | 		           ^
      58 | 			waitUntil: "domcontentloaded",
      59 | 			timeout: 10000,
      60 | 		});
        at /home/runner/work/caalm-next/caalm-next/tests/auth.setup.js:57:14