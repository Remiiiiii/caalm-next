import { NextRequest, NextResponse } from 'next/server';
import { Client, Storage, Databases, ID } from 'appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

// Initialize Appwrite client for server-side operations
const client = new Client()
  .setEndpoint(appwriteConfig.endpointUrl!)
  .setProject(appwriteConfig.projectId!);

const storage = new Storage(client);
const databases = new Databases(client);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Create a unique file ID
    const fileId = `profile_${userId}_${Date.now()}`;

    // Convert File to Blob for Appwrite
    const fileBlob = new Blob([await file.arrayBuffer()], { type: file.type });
    
    // Upload to Appwrite Storage
    const uploadedFile = await storage.createFile(
      appwriteConfig.bucketId!,
      fileId,
      fileBlob as any, // Appwrite accepts Blob/File
      [
        `read("user:${userId}")`, // Only the user can read their profile picture
        `write("user:${userId}")`, // Only the user can update their profile picture
      ]
    );

    // Get the file URL
    const fileUrl = storage.getFileView(appwriteConfig.bucketId!, uploadedFile.$id);

    // Update user preferences with the new profile picture URL
    try {
      await databases.updateDocument(
        appwriteConfig.databaseId!,
        appwriteConfig.usersCollectionId!,
        userId,
        {
          profileImage: fileUrl.toString(),
          profileImageFileId: uploadedFile.$id,
        }
      );
    } catch (error) {
      // If updating user document fails, we should clean up the uploaded file
      try {
        await storage.deleteFile(appwriteConfig.bucketId!, uploadedFile.$id);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      imageUrl: fileUrl.toString(),
      fileId: uploadedFile.$id,
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload profile picture' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get current user document to find the profile image file ID
    let userDoc;
    try {
      userDoc = await databases.getDocument(
        appwriteConfig.databaseId!,
        appwriteConfig.usersCollectionId!,
        userId
      );
    } catch (error) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const profileImageFileId = userDoc.profileImageFileId;

    // Update user document to remove profile picture
    await databases.updateDocument(
      appwriteConfig.databaseId!,
      appwriteConfig.usersCollectionId!,
      userId,
      {
        profileImage: null,
        profileImageFileId: null,
      }
    );

    // Delete the file from storage if it exists
    if (profileImageFileId) {
      try {
        await storage.deleteFile(appwriteConfig.bucketId!, profileImageFileId);
      } catch (error) {
        console.error('Failed to delete file from storage:', error);
        // Continue even if file deletion fails - user document is already updated
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile picture removed successfully',
    });
  } catch (error) {
    console.error('Profile picture deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to remove profile picture' },
      { status: 500 }
    );
  }
}