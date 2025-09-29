#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

// Configuration
const PROJECT_NAME = 'caalm-next'; // Replace with your actual project name
const KEEP_CURRENT = true; // Keep the current deployment
const DRY_RUN = false; // Set to false to actually delete deployments

function runCommand(command) {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    return output.trim();
  } catch (error) {
    console.error(`Error running command: ${command}`);
    console.error(error.message);
    return null;
  }
}

function getAllDeployments() {
  console.log('🔍 Getting all deployments (including paginated results)...');

  let allDeployments = [];
  let nextToken = null;
  let pageCount = 0;

  do {
    pageCount++;
    console.log(`📄 Fetching page ${pageCount}...`);

    let command = 'vercel ls --yes';
    if (nextToken) {
      command += ` --next ${nextToken}`;
    }

    const output = runCommand(command);
    if (!output) {
      console.error('❌ Failed to get deployments list');
      return null;
    }

    // Parse the output from vercel ls
    const lines = output.split('\n').filter((line) => line.trim());

    // Find URLs in the output
    const urlLines = lines.filter((line) => line.includes('https://'));

    // Extract deployments from this page
    const pageDeployments = urlLines.map((url) => {
      // Extract UID from URL - it's the deployment hash part
      const urlParts = url.split('/');
      const domainPart = urlParts[2]; // Get the domain part
      const uid = domainPart.split('-')[2]; // Get the hash after second dash

      return {
        uid: uid,
        url: url,
        state: 'Ready', // Default to Ready since we don't have status in URL-only format
        age: 'unknown',
      };
    });

    allDeployments = allDeployments.concat(pageDeployments);
    console.log(
      `   Found ${pageDeployments.length} deployments on page ${pageCount}`
    );

    // Check if there's a next page token - look for the "To display the next page" line
    const nextLine = lines.find((line) =>
      line.includes('To display the next page')
    );
    if (nextLine) {
      const nextMatch = nextLine.match(/--next (\d+)/);
      if (nextMatch) {
        nextToken = nextMatch[1];
        console.log(`   Next page token: ${nextToken}`);
      } else {
        nextToken = null;
      }
    } else {
      nextToken = null;
    }
  } while (nextToken);

  console.log(
    `📊 Total deployments found across ${pageCount} pages: ${allDeployments.length}`
  );
  return allDeployments;
}

function getCurrentDeployment() {
  console.log('🔍 Getting current deployment...');
  const output = runCommand('vercel ls --yes');
  if (!output) {
    console.error('❌ Failed to get deployments list');
    return null;
  }

  try {
    // Parse the output from vercel ls
    const lines = output.split('\n').filter((line) => line.trim());

    // Find URLs in the output (could be just URLs or full table format)
    const urlLines = lines.filter((line) => line.includes('https://'));

    if (urlLines.length === 0) {
      console.log('📭 No deployments found');
      return null;
    }

    // Get the first URL (most recent deployment)
    const firstUrl = urlLines[0];

    // Extract UID from URL - it's the deployment hash part
    const urlParts = firstUrl.split('/');
    const domainPart = urlParts[2]; // Get the domain part
    const uid = domainPart.split('-')[2]; // Get the hash after second dash

    const deployment = {
      uid: uid,
      url: firstUrl,
      state: 'Ready', // Assume ready for current deployment
      age: 'current',
    };

    console.log(`✅ Current deployment: ${deployment.url} (${deployment.uid})`);
    return deployment;
  } catch (error) {
    console.error('❌ Failed to parse deployments:', error.message);
    return null;
  }
}

function deleteDeployment(deployment) {
  // Use the full URL instead of just the UID
  const command = `vercel rm ${deployment.url} --yes`;
  console.log(`🗑️  Deleting: ${deployment.url} (${deployment.uid})`);

  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would run: ${command}`);
    return true;
  }

  const output = runCommand(command);
  if (output !== null) {
    console.log(`   ✅ Deleted successfully`);
    return true;
  } else {
    console.log(`   ❌ Failed to delete`);
    return false;
  }
}

function cleanupDeployments() {
  console.log('🚀 Vercel Deployment Cleanup Script');
  console.log('=====================================');

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No deployments will actually be deleted');
    console.log('   Set DRY_RUN = false to perform actual deletions\n');
  }

  // Check if Vercel CLI is installed
  try {
    runCommand('vercel --version');
  } catch (error) {
    console.error('❌ Vercel CLI not found. Please install it first:');
    console.error('   npm i -g vercel');
    process.exit(1);
  }

  // Get current deployment
  const currentDeployment = getCurrentDeployment();
  if (!currentDeployment) {
    console.log('❌ No current deployment found. Exiting.');
    process.exit(1);
  }

  // Get all deployments (including paginated results)
  const allDeployments = getAllDeployments();
  if (!allDeployments || allDeployments.length === 0) {
    console.log('❌ No deployments found. Exiting.');
    process.exit(1);
  }

  // Filter out current deployment if we want to keep it
  const deploymentsToDelete = KEEP_CURRENT
    ? allDeployments.filter((d) => d.uid !== currentDeployment.uid)
    : allDeployments;

  if (deploymentsToDelete.length === 0) {
    console.log('✅ No deployments to delete');
    return;
  }

  console.log(
    `\n🎯 ${
      KEEP_CURRENT ? 'Keeping current deployment, deleting' : 'Deleting all'
    } ${deploymentsToDelete.length} deployment(s):`
  );

  let deletedCount = 0;
  let failedCount = 0;

  deploymentsToDelete.forEach((deployment, index) => {
    console.log(`\n[${index + 1}/${deploymentsToDelete.length}]`);
    const success = deleteDeployment(deployment);
    if (success) {
      deletedCount++;
    } else {
      failedCount++;
    }
  });

  console.log('\n📊 Cleanup Summary:');
  console.log(`   ✅ Successfully deleted: ${deletedCount}`);
  console.log(`   ❌ Failed to delete: ${failedCount}`);
  console.log(`   🔒 Kept current: ${KEEP_CURRENT ? '1' : '0'}`);

  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN. To actually delete deployments:');
    console.log('   1. Set DRY_RUN = false in this script');
    console.log('   2. Run the script again');
  }
}

// Run the cleanup
cleanupDeployments();
