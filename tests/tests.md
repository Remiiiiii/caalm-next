Error:   1) [chromium] › tests/components/notification-/notification-component.spec.ts:11:6 › Notification System Component Tests › should render notification center with test data 
    Error: expect(locator).toBeVisible() failed

    Locator: locator('[data-testid="notification-center"]')
    Expected: visible
    Timeout: 8000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for locator('[data-testid="notification-center"]')


      91 | 		await expect(
      92 | 			page.locator('[data-testid="notification-center"]'),
    > 93 | 		).toBeVisible();
         | 		  ^
      94 | 	});
      95 |
      96 | 	test("should handle API errors gracefully", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-component.spec.ts:93:5
Error:   1) [chromium] › tests/components/notification-/notification-component.spec.ts:11:6 › Notification System Component Tests › should render notification center with test data 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed

    Locator: locator('[data-testid="notification-center"]')
    Expected: visible
    Timeout: 8000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for locator('[data-testid="notification-center"]')


      91 | 		await expect(
      92 | 			page.locator('[data-testid="notification-center"]'),
    > 93 | 		).toBeVisible();
         | 		  ^
      94 | 	});
      95 |
      96 | 	test("should handle API errors gracefully", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-component.spec.ts:93:5
Error:   2) [chromium] › tests/components/notification-/notification-component.spec.ts:96:6 › Notification System Component Tests › should handle API errors gracefully 
    Error: expect(locator).toBeVisible() failed

    Locator: locator('[data-testid="error-message"]')
    Expected: visible
    Timeout: 8000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for locator('[data-testid="error-message"]')


      115 |
      116 | 		await openNotificationCenter(page);
    > 117 | 		await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
          | 		                                                            ^
      118 | 	});
      119 |
      120 | 	test("should handle empty notification list", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-component.spec.ts:117:63
Error:   2) [chromium] › tests/components/notification-/notification-component.spec.ts:96:6 › Notification System Component Tests › should handle API errors gracefully 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed

    Locator: locator('[data-testid="error-message"]')
    Expected: visible
    Timeout: 8000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for locator('[data-testid="error-message"]')


      115 |
      116 | 		await openNotificationCenter(page);
    > 117 | 		await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
          | 		                                                            ^
      118 | 	});
      119 |
      120 | 	test("should handle empty notification list", async ({ page }) => {
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-component.spec.
Error:   3) [chromium] › tests/components/notification-/notification-component.spec.ts:120:6 › Notification System Component Tests › should handle empty notification list 
    Error: expect(locator).toBeVisible() failed

    Locator: locator('[data-testid="empty-state"]')
    Expected: visible
    Timeout: 8000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for locator('[data-testid="empty-state"]')


      139 |
      140 | 		await openNotificationCenter(page);
    > 141 | 		await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
          | 		                                                          ^
      142 | 	});
      143 | });
      144 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-component.spec.ts:141:61
Error:   3) [chromium] › tests/components/notification-/notification-component.spec.ts:120:6 › Notification System Component Tests › should handle empty notification list 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed

    Locator: locator('[data-testid="empty-state"]')
    Expected: visible
    Timeout: 8000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for locator('[data-testid="empty-state"]')


      139 |
      140 | 		await openNotificationCenter(page);
    > 141 | 		await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
          | 		                                                          ^
      142 | 	});
      143 | });
      144 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-component.spec.ts:141:61
Error:   4) [chromium] › tests/components/notification-/notification-system-optimized.spec.ts:187:7 › Notification System Enhancement (Optimized) › Component Integration › should display notification center when integrated 
    Error: expect(locator).toBeVisible() failed

    Locator: locator('main, [data-testid="dashboard"], body')
    Expected: visible
    Error: strict mode violation: locator('main, [data-testid="dashboard"], body') resolved to 2 elements:
        1) <body class="poppins_e4cc8876-module__k0OalW__variable font-poppins antialiased">…</body> aka locator('body')
        2) <main class="flex h-screen overflow-hidden">…</main> aka getByText('Loading navigation...SettingsUpload AuditSchedule ReviewGenerate ReportTU')

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for locator('main, [data-testid="dashboard"], body')


      221 | 					'main, [data-testid="dashboard"], body',
      222 | 				);
    > 223 | 				await expect(mainElement).toBeVisible();
          | 	
Error:   4) [chromium] › tests/components/notification-/notification-system-optimized.spec.ts:187:7 › Notification System Enhancement (Optimized) › Component Integration › should display notification center when integrated 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed

    Locator: locator('main, [data-testid="dashboard"], body')
    Expected: visible
    Error: strict mode violation: locator('main, [data-testid="dashboard"], body') resolved to 2 elements:
        1) <body class="poppins_e4cc8876-module__k0OalW__variable font-poppins antialiased">…</body> aka locator('body')
        2) <main class="flex h-screen overflow-hidden">…</main> aka getByText('Loading navigation...SettingsUpload AuditSchedule ReviewGenerate ReportTU')

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for locator('main, [data-testid="dashboard"], body')


      221 | 					'main, [data-testid="dashboa
Error:   5) [chromium] › tests/components/notification-/notification-system-optimized.spec.ts:275:7 › Notification System Enhancement (Optimized) › Performance › should handle large notification lists 
    Error: expect(locator).toBeVisible() failed

    Locator: locator('main, [data-testid="dashboard"], body')
    Expected: visible
    Error: strict mode violation: locator('main, [data-testid="dashboard"], body') resolved to 2 elements:
        1) <body class="poppins_e4cc8876-module__k0OalW__variable font-poppins antialiased">…</body> aka locator('body')
        2) <main class="flex h-screen overflow-hidden">…</main> aka getByText('Loading navigation...SettingsUpload AuditSchedule ReviewGenerate ReportTU')

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for locator('main, [data-testid="dashboard"], body')


      294 | 			// Verify the page loads without crashing
      295 | 			const mainElement = page.locator('main, [data-testid="dashboard"], body');
    > 296 | 			await e
Error:   5) [chromium] › tests/components/notification-/notification-system-optimized.spec.ts:275:7 › Notification System Enhancement (Optimized) › Performance › should handle large notification lists 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    Error: expect(locator).toBeVisible() failed

    Locator: locator('main, [data-testid="dashboard"], body')
    Expected: visible
    Error: strict mode violation: locator('main, [data-testid="dashboard"], body') resolved to 2 elements:
        1) <body class="poppins_e4cc8876-module__k0OalW__variable font-poppins antialiased">…</body> aka locator('body')
        2) <main class="flex h-screen overflow-hidden">…</main> aka getByText('Loading navigation...SettingsUpload AuditSchedule ReviewGenerate ReportTU')

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for locator('main, [data-testid="dashboard"], body')


      294 | 			// Verify the page loads without crashing
      295 
Error:   6) [chromium] › tests/components/notification-/notification-system.spec.ts:245:7 › Notification System Enhancement › NotificationCenter Component › should display notification center 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-center"]') to be visible


      253 |
      254 | 			// Wait for the notification center to be visible
    > 255 | 			await page.waitForSelector('[data-testid="notification-center"]', {
          | 			           ^
      256 | 				timeout: 10000,
      257 | 			});
      258 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:255:15
Error:   6) [chromium] › tests/components/notification-/notification-system.spec.ts:245:7 › Notification System Enhancement › NotificationCenter Component › should display notification center 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-center"]') to be visible


      253 |
      254 | 			// Wait for the notification center to be visible
    > 255 | 			await page.waitForSelector('[data-testid="notification-center"]', {
          | 			           ^
      256 | 				timeout: 10000,
      257 | 			});
      258 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:255:15
Error:   7) [chromium] › tests/components/notification-/notification-system.spec.ts:266:7 › Notification System Enhancement › NotificationCenter Component › should display notification list 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      273 |
      274 | 			// Wait for notifications to load
    > 275 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      276 | 				timeout: 10000,
      277 | 			});
      278 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:275:15
Error:   7) [chromium] › tests/components/notification-/notification-system.spec.ts:266:7 › Notification System Enhancement › NotificationCenter Component › should display notification list 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      273 |
      274 | 			// Wait for notifications to load
    > 275 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      276 | 				timeout: 10000,
      277 | 			});
      278 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:275:15
Error:   8) [chromium] › tests/components/notification-/notification-system.spec.ts:285:7 › Notification System Enhancement › NotificationCenter Component › should display notification filters 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-filters"]') to be visible


      292 |
      293 | 			// Wait for filters to be visible
    > 294 | 			await page.waitForSelector('[data-testid="notification-filters"]', {
          | 			           ^
      295 | 				timeout: 10000,
      296 | 			});
      297 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:294:15
Error:   8) [chromium] › tests/components/notification-/notification-system.spec.ts:285:7 › Notification System Enhancement › NotificationCenter Component › should display notification filters 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-filters"]') to be visible


      292 |
      293 | 			// Wait for filters to be visible
    > 294 | 			await page.waitForSelector('[data-testid="notification-filters"]', {
          | 			           ^
      295 | 				timeout: 10000,
      296 | 			});
      297 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:294:15
Error:   9) [chromium] › tests/components/notification-/notification-system.spec.ts:310:7 › Notification System Enhancement › NotificationCenter Component › should display notification statistics 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-center"]') to be visible


      316 | 			await openNotificationCenter(page);
      317 |
    > 318 | 			await page.waitForSelector('[data-testid="notification-center"]', {
          | 			           ^
      319 | 				timeout: 10000,
      320 | 			});
      321 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:318:15
Error:   9) [chromium] › tests/components/notification-/notification-system.spec.ts:310:7 › Notification System Enhancement › NotificationCenter Component › should display notification statistics 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-center"]') to be visible


      316 | 			await openNotificationCenter(page);
      317 |
    > 318 | 			await page.waitForSelector('[data-testid="notification-center"]', {
          | 			           ^
      319 | 				timeout: 10000,
      320 | 			});
      321 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:318:15
Error:   10) [chromium] › tests/components/notification-/notification-system.spec.ts:333:7 › Notification System Enhancement › Notification Interactions › should mark notification as read when clicked 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-item"]') to be visible


      340 |
      341 | 			// Wait for notifications to load
    > 342 | 			await page.waitForSelector('[data-testid="notification-item"]', {
          | 			           ^
      343 | 				timeout: 10000,
      344 | 			});
      345 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:342:15
Error:   10) [chromium] › tests/components/notification-/notification-system.spec.ts:333:7 › Notification System Enhancement › Notification Interactions › should mark notification as read when clicked 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-item"]') to be visible


      340 |
      341 | 			// Wait for notifications to load
    > 342 | 			await page.waitForSelector('[data-testid="notification-item"]', {
          | 			           ^
      343 | 				timeout: 10000,
      344 | 			});
      345 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:342:15
Error:   11) [chromium] › tests/components/notification-/notification-system.spec.ts:364:7 › Notification System Enhancement › Notification Interactions › should filter notifications by priority 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="priority-filter"]') to be visible


      371 |
      372 | 			// Wait for filters to load
    > 373 | 			await page.waitForSelector('[data-testid="priority-filter"]', {
          | 			           ^
      374 | 				timeout: 10000,
      375 | 			});
      376 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:373:15
Error:   11) [chromium] › tests/components/notification-/notification-system.spec.ts:364:7 › Notification System Enhancement › Notification Interactions › should filter notifications by priority 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="priority-filter"]') to be visible


      371 |
      372 | 			// Wait for filters to load
    > 373 | 			await page.waitForSelector('[data-testid="priority-filter"]', {
          | 			           ^
      374 | 				timeout: 10000,
      375 | 			});
      376 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:373:15
Error:   12) [chromium] › tests/components/notification-/notification-system.spec.ts:398:7 › Notification System Enhancement › Notification Interactions › should sort notifications by date 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="sort-controls"]') to be visible


      405 |
      406 | 			// Wait for sort controls to load
    > 407 | 			await page.waitForSelector('[data-testid="sort-controls"]', {
          | 			           ^
      408 | 				timeout: 10000,
      409 | 			});
      410 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:407:15
Error:   12) [chromium] › tests/components/notification-/notification-system.spec.ts:398:7 › Notification System Enhancement › Notification Interactions › should sort notifications by date 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="sort-controls"]') to be visible


      405 |
      406 | 			// Wait for sort controls to load
    > 407 | 			await page.waitForSelector('[data-testid="sort-controls"]', {
          | 			           ^
      408 | 				timeout: 10000,
      409 | 			});
      410 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:407:15
Error:   13) [chromium] › tests/components/notification-/notification-system.spec.ts:440:7 › Notification System Enhancement › Real-time Updates › should update notification count in real-time 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="unread-count"]') to be visible


      450 |
      451 | 			// Wait for initial load
    > 452 | 			await page.waitForSelector('[data-testid="unread-count"]', {
          | 			           ^
      453 | 				timeout: 10000,
      454 | 			});
      455 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:452:15
Error:   13) [chromium] › tests/components/notification-/notification-system.spec.ts:440:7 › Notification System Enhancement › Real-time Updates › should update notification count in real-time 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="unread-count"]') to be visible


      450 |
      451 | 			// Wait for initial load
    > 452 | 			await page.waitForSelector('[data-testid="unread-count"]', {
          | 			           ^
      453 | 				timeout: 10000,
      454 | 			});
      455 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:452:15
Error:   14) [chromium] › tests/components/notification-/notification-system.spec.ts:545:7 › Notification System Enhancement › Performance › should load notifications efficiently 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      554 |
      555 | 			// Wait for notifications to load
    > 556 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      557 | 				timeout: 10000,
      558 | 			});
      559 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:556:15
Error:   14) [chromium] › tests/components/notification-/notification-system.spec.ts:545:7 › Notification System Enhancement › Performance › should load notifications efficiently 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      554 |
      555 | 			// Wait for notifications to load
    > 556 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      557 | 				timeout: 10000,
      558 | 			});
      559 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:556:15
Error:   15) [chromium] › tests/components/notification-/notification-system.spec.ts:566:7 › Notification System Enhancement › Performance › should handle large notification lists 
    TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      593 |
      594 | 			// Wait for notifications to load
    > 595 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      596 | 				timeout: 15000,
      597 | 			});
      598 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:595:15
Error:   15) [chromium] › tests/components/notification-/notification-system.spec.ts:566:7 › Notification System Enhancement › Performance › should handle large notification lists 

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────
    TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="notification-list"]') to be visible


      593 |
      594 | 			// Wait for notifications to load
    > 595 | 			await page.waitForSelector('[data-testid="notification-list"]', {
          | 			           ^
      596 | 				timeout: 15000,
      597 | 			});
      598 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:595:15
Error:   16) [chromium] › tests/components/notification-/notification-system-optimized.spec.ts:315:7 › Notification System Enhancement (Optimized) › Error Handling › should handle API errors gracefully 
    Error: expect(locator).toBeVisible() failed

    Locator: locator('main, [data-testid="dashboard"], body')
    Expected: visible
    Error: strict mode violation: locator('main, [data-testid="dashboard"], body') resolved to 2 elements:
        1) <body class="poppins_e4cc8876-module__k0OalW__variable font-poppins antialiased">…</body> aka locator('body')
        2) <main class="flex h-screen overflow-hidden">…</main> aka getByText('Loading navigation...SettingsUpload AuditSchedule ReviewGenerate ReportTU')

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for locator('main, [data-testid="dashboard"], body')


      342 | 					'main, [data-testid="dashboard"], body',
      343 | 				);
    > 344 | 				await expect(mainElement).toBeVisible();
          | 				                  
Error:   17) [chromium] › tests/components/notification-/notification-system-optimized.spec.ts:348:7 › Notification System Enhancement (Optimized) › Error Handling › should handle empty notification list 
    Error: expect(locator).toBeVisible() failed

    Locator: locator('main, [data-testid="dashboard"], body')
    Expected: visible
    Error: strict mode violation: locator('main, [data-testid="dashboard"], body') resolved to 2 elements:
        1) <body class="poppins_e4cc8876-module__k0OalW__variable font-poppins antialiased">…</body> aka locator('body')
        2) <main class="flex h-screen overflow-hidden">…</main> aka getByText('Loading navigation...SettingsUpload AuditSchedule ReviewGenerate ReportTU')

    Call log:
      - Expect "toBeVisible" with timeout 8000ms
      - waiting for locator('main, [data-testid="dashboard"], body')


      386 | 					'main, [data-testid="dashboard"], body',
      387 | 				);
    > 388 | 				await expect(mainElement).toBeVisible();
          | 				                
Error:   18) [chromium] › tests/components/notification-/notification-system.spec.ts:516:7 › Notification System Enhancement › Error Handling › should handle empty notification list 
    TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
    Call log:
      - waiting for locator('[data-testid="empty-state"]') to be visible


      532 |
      533 | 			// Wait for empty state
    > 534 | 			await page.waitForSelector('[data-testid="empty-state"]', {
          | 			           ^
      535 | 				timeout: 10000,
      536 | 			});
      537 |
        at /home/runner/work/caalm-next/caalm-next/tests/components/notification-/notification-system.spec.ts:534:15