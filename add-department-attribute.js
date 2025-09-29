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

async function addDepartmentAttribute() {
  try {
    console.log('Adding department attribute to invitations collection...');

    const databaseId = '685ed87c0009d8189fc7';
    const collectionId = 'invitations';

    // Try to add the department attribute
    try {
      await databases.createStringAttribute(
        databaseId,
        collectionId,
        'department',
        100,
        true, // required
        '', // default value (empty for required)
        false // array
      );
      console.log('✓ Added department attribute successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠ department attribute already exists');
      } else {
        console.error('✗ Failed to add department attribute:', error.message);
        console.error('Full error:', error);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

addDepartmentAttribute();
