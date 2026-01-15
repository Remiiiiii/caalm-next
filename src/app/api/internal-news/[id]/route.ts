import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { getUserPermissions } from '@/lib/rbac/permissions';
import { PERMISSIONS } from '@/constants/permissions';
import {
  getNewsArticle,
  updateNewsArticle,
  deleteNewsArticle,
} from '@/lib/database/news-articles';
import { createNewsVersion } from '@/lib/database/news-versions';
import DOMPurify from 'isomorphic-dompurify';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permissions
    const userPermissions = await getUserPermissions(user.$id);
    if (!userPermissions.includes(PERMISSIONS.NEWS.READ)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Permission denied. You need news.read permission.',
        },
        { status: 403 }
      );
    }

    const article = await getNewsArticle(id);

    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      article: {
        id: article.$id,
        title: article.title,
        content: article.content,
        author: article.author,
        authorId: article.authorId,
        date: article.$createdAt,
        type: article.type,
        priority: article.priority,
        department: article.department,
        image: article.thumbnailUrl,
        status: article.status,
        thumbnailPrompt: article.thumbnailPrompt,
        tags: article.tags,
        viewCount: article.viewCount,
        publishedAt: article.publishedAt,
        expiresAt: article.expiresAt,
        scheduledAt: article.scheduledAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching news article:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch news article',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permissions
    const userPermissions = await getUserPermissions(user.$id);
    if (!userPermissions.includes(PERMISSIONS.NEWS.UPDATE)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Permission denied. You need news.update permission.',
        },
        { status: 403 }
      );
    }

    // Get existing article to check ownership (optional - can be removed if all creators can edit)
    const existingArticle = await getNewsArticle(id);
    if (!existingArticle) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      title,
      content,
      type,
      priority,
      department,
      status,
      thumbnailUrl,
      thumbnailPrompt,
      tags,
      scheduledAt,
      expiresAt,
    } = body;

    // Validate title if provided
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Title cannot be empty' },
          { status: 400 }
        );
      }
      if (title.length > 200) {
        return NextResponse.json(
          { success: false, error: 'Title too long (max 200 characters)' },
          { status: 400 }
        );
      }
    }

    // Sanitize content if provided
    let sanitizedContent = content;
    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Content cannot be empty' },
          { status: 400 }
        );
      }
      sanitizedContent = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [
          'p',
          'br',
          'strong',
          'em',
          'u',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'ul',
          'ol',
          'li',
          'a',
        ],
        ALLOWED_ATTR: ['href', 'target'],
      });
    }

    // Validate type if provided
    if (type !== undefined) {
      const validTypes = ['announcement', 'update', 'alert', 'info'];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    // Validate priority if provided
    if (priority !== undefined) {
      const validPriorities = ['high', 'medium', 'low'];
      if (!validPriorities.includes(priority)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid priority. Must be one of: ${validPriorities.join(
              ', '
            )}`,
          },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = sanitizedContent;
    if (department !== undefined) updateData.department = department;
    if (type !== undefined) updateData.type = type;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
    if (thumbnailPrompt !== undefined)
      updateData.thumbnailPrompt = thumbnailPrompt;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt || null;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt || null;

    // Update article
    const article = await updateNewsArticle(id, updateData);

    // Create version entry if content changed
    if (content !== undefined && content !== existingArticle.content) {
      try {
        await createNewsVersion({
          newsId: id,
          content: sanitizedContent,
          modifiedBy: user.$id,
          changeDescription: body.changeDescription || 'Content updated',
          orgId: existingArticle.orgId,
        });
      } catch (versionError) {
        // Log but don't fail - versioning is optional
        console.warn('Failed to create version:', versionError);
      }
    }

    return NextResponse.json({
      success: true,
      article: {
        id: article.$id,
        title: article.title,
        content: article.content,
        author: article.author,
        date: article.$createdAt,
        type: article.type,
        priority: article.priority,
        department: article.department,
        image: article.thumbnailUrl,
        status: article.status,
      },
    });
  } catch (error: any) {
    console.error('Error updating news article:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update news article',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permissions
    const userPermissions = await getUserPermissions(user.$id);
    if (!userPermissions.includes(PERMISSIONS.NEWS.DELETE)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Permission denied. You need news.delete permission.',
        },
        { status: 403 }
      );
    }

    // Check if article exists
    const article = await getNewsArticle(id);
    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    // Get hardDelete query parameter
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hardDelete') === 'true';

    // Delete article (soft delete by default)
    await deleteNewsArticle(id, hardDelete);

    return NextResponse.json({
      success: true,
      message: hardDelete ? 'Article deleted permanently' : 'Article archived',
    });
  } catch (error: any) {
    console.error('Error deleting news article:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete news article',
      },
      { status: 500 }
    );
  }
}
