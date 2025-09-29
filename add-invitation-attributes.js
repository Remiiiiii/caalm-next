const { Client, Databases } = require('node-appwrite');

// Initialize the Appwrite client
const client = new Client();
client
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('685ed77d00186ae8176b')
  .setKey(
    'standard_d5b870dbbc897474524cc6d242b6c936db789b90d284e18faf9ee48e7c26784d882aab0348d30f1d42964ac0fdefe57be5ad47881fa1667ca2c8654e98d504f4be21e9f1effb1f8022fda13dca1dcbba4513da94add6ff71219ebdbab0c6ee20db701c60695fa6bb40a007ea1954414ecf3edb46193a235b6a7f1f78027313cf'
  );

const databases = new Databases(client);

async function addInvitationAttributes() {
  try {
    console.log('Adding attributes to invitations collection...');

    const databaseId = '685ed87c0009d8189fc7';
    const collectionId = 'invitations';

    // List of attributes to add
    const attributes = [
      {
        key: 'email',
        type: 'string',
        size: 255,
        required: true,
      },
      {
        key: 'orgId',
        type: 'string',
        size: 255,
        required: true,
      },
      {
        key: 'role',
        type: 'string',
        size: 50,
        required: true,
      },
      {
        key: 'department',
        type: 'string',
        size: 100,
        required: true,
      },
      {
        key: 'division',
        type: 'string',
        size: 100,
        required: false,
      },
      {
        key: 'name',
        type: 'string',
        size: 255,
        required: true,
      },
      {
        key: 'token',
        type: 'string',
        size: 255,
        required: true,
      },
      {
        key: 'expiresAt',
        type: 'datetime',
        required: true,
      },
      {
        key: 'status',
        type: 'string',
        size: 20,
        required: true,
        default: 'pending',
      },
      {
        key: 'revoked',
        type: 'boolean',
        required: true,
        default: false,
      },
      {
        key: 'invitedBy',
        type: 'string',
        size: 255,
        required: true,
      },
    ];

    for (const attr of attributes) {
      try {
        console.log(`Adding attribute: ${attr.key}`);

        if (attr.type === 'string') {
          const result = await databases.createStringAttribute(
            databaseId,
            collectionId,
            attr.key,
            attr.size,
            attr.required,
            '', // No default value
            false // array
          );
          console.log(`✓ Added ${attr.key} successfully`);
        } else if (attr.type === 'boolean') {
          const result = await databases.createBooleanAttribute(
            databaseId,
            collectionId,
            attr.key,
            attr.required,
            false // No default value
          );
          console.log(`✓ Added ${attr.key} successfully`);
        } else if (attr.type === 'datetime') {
          const result = await databases.createDatetimeAttribute(
            databaseId,
            collectionId,
            attr.key,
            attr.required,
            '' // No default value
          );
          console.log(`✓ Added ${attr.key} successfully`);
        }
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠ ${attr.key} already exists, skipping...`);
        } else {
          console.error(`✗ Failed to add ${attr.key}:`, error.message);
        }
      }
    }

    console.log('Finished adding attributes!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

addInvitationAttributes();
