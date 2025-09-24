#!/usr/bin/env node

/**
 * Script to toggle Coming Soon mode for Vercel deployment
 * 
 * Usage:
 * node scripts/toggle-coming-soon.js enable   # Enable coming soon mode
 * node scripts/toggle-coming-soon.js disable  # Disable coming soon mode
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const envExamplePath = path.join(process.cwd(), '.env.example');

function updateEnvFile(action) {
  let envContent = '';
  
  // Read existing .env.local if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Remove existing SHOW_COMING_SOON line
  envContent = envContent.replace(/^SHOW_COMING_SOON=.*$/m, '');
  
  // Add or remove the setting
  if (action === 'enable') {
    envContent += '\nSHOW_COMING_SOON=true\n';
    console.log('✅ Coming Soon mode ENABLED');
    console.log('   Visitors will see the coming soon page in production');
  } else if (action === 'disable') {
    envContent += '\nSHOW_COMING_SOON=false\n';
    console.log('✅ Coming Soon mode DISABLED');
    console.log('   Full website will be accessible in production');
  }
  
  // Write back to .env.local
  fs.writeFileSync(envPath, envContent.trim() + '\n');
  
  console.log('\n📝 Updated .env.local file');
  console.log('🚀 Deploy to Vercel to apply changes');
}

function showStatus() {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/SHOW_COMING_SOON=(true|false)/);
    if (match) {
      const status = match[1] === 'true' ? 'ENABLED' : 'DISABLED';
      console.log(`📊 Current status: Coming Soon mode is ${status}`);
    } else {
      console.log('📊 Current status: SHOW_COMING_SOON not set (defaults to disabled)');
    }
  } else {
    console.log('📊 Current status: .env.local not found (defaults to disabled)');
  }
}

// Main execution
const action = process.argv[2];

switch (action) {
  case 'enable':
    updateEnvFile('enable');
    break;
  case 'disable':
    updateEnvFile('disable');
    break;
  case 'status':
    showStatus();
    break;
  default:
    console.log('Usage: node scripts/toggle-coming-soon.js [enable|disable|status]');
    console.log('');
    console.log('Commands:');
    console.log('  enable  - Show coming soon page in production');
    console.log('  disable - Show full website in production');
    console.log('  status  - Show current status');
    console.log('');
    console.log('After running enable/disable, deploy to Vercel to apply changes.');
    process.exit(1);
}
