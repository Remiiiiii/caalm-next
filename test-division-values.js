const { Client, Databases, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('685ed77d00186ae8176b')
  .setKey('standard_379b20332a4fc391d986a49e3d69b289a27ba4f54b7a9877070d1e810d2df68a663d0bf0e407e2f6079d734365e7972533ab56485717effa72b19e5d3e86bf973d8c2c59ceb09b61a45de1a9157232e9a0e3c52edea6511f0f6e1325e918ae6fec26985f60c921be9b4adb8460c4d27aa79f967ba89c3700fb3e62c5375d5c44');

const databases = new Databases(client);

async function checkDivisionAttributes() {
  try {
    console.log('Checking users collection attributes...');
    const usersAttributes = await databases.listAttributes('685ed87c0009d8189fc7', '685ed8a60030f6d7b1f3');
    
    console.log('Users collection attributes:');
    usersAttributes.attributes.forEach(attr => {
      if (attr.key === 'division') {
        console.log('Division attribute:', JSON.stringify(attr, null, 2));
      }
    });

    console.log('\nChecking invitations collection attributes...');
    const invitationsAttributes = await databases.listAttributes('685ed87c0009d8189fc7', 'invitations');
    
    console.log('Invitations collection attributes:');
    invitationsAttributes.attributes.forEach(attr => {
      if (attr.key === 'division') {
        console.log('Division attribute:', JSON.stringify(attr, null, 2));
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDivisionAttributes();
