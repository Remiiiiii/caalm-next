// Quick script to check relationship attribute status
// Run with: node check-relationship-status.js

const _https = require("node:https");

async function checkAttributeStatus() {
	console.log("Checking relationship attribute status...\n");

	// Note: This requires the MCP tool or direct API access
	// For now, we'll provide instructions on how to check manually

	console.log("To check the relationship status, you can:");
	console.log("1. Use the Appwrite Console UI");
	console.log("2. Use the MCP tool (if available)");
	console.log("3. Check via the API endpoint we created\n");

	console.log("Collections to check:");
	console.log(
		'- Users collection (685ed8a60030f6d7b1f3): Check "files" attribute',
	);
	console.log(
		'- Files collection (6934a3120033b4a5c4da): Check "owner" attribute\n',
	);

	console.log('Expected status: "available" (not "processing")');
	console.log(
		'If status is "processing" for more than 10-15 minutes, it may be stuck.\n',
	);
}

checkAttributeStatus();
