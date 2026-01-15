/**
 * AI Image Generation Service
 * Uses Imagine Art 1.5 API for high-quality corporate image generation
 *
 * The service extracts important details from article content and generates
 * professional corporate graphics with a consistent modern aesthetic.
 */

interface ImageGenerationOptions {
  style?: string; // 'realistic' or other style options
  aspect_ratio?: string; // '1:1', '16:9', '9:16'
  seed?: number; // For reproducibility
  negative_prompt?: string; // Negative prompts to avoid unwanted elements
  use_pro_model?: boolean; // Use Pro model for better text rendering (if available)
}

interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  error?: string;
  generationTime?: number;
}

export class ImagineArtService {
  private apiKey: string;
  private baseUrl: string = 'https://api.vyro.ai/v2/image/generations';
  private timeout: number = 120000; // 2 minutes

  constructor() {
    const apiKey = process.env.IMAGINE_ART_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error(
        'IMAGINE_ART_API_KEY is not configured. Please set it in your environment variables.'
      );
    }
    this.apiKey = apiKey.trim();
  }

  /**
   * Build prompt template for corporate image generation
   * Enhanced with specific text placement instructions and quality requirements
   */
  private buildCorporatePrompt(userPrompt: string): string {
    // Extract the most important details from user prompt (limit to key information)
    const importantDetails = userPrompt.substring(0, 500).trim();

    // Build prompt following the exact structure from the working dashboard prompt
    let corporatePrompt = `An image that will display on an image only the most important details for a company's new feed page. `;

    corporatePrompt += `Style and composition: Modern, clean corporate aesthetic, Bold geometric accent shapes. `;
    corporatePrompt += `Contemporary corporate design with organic shapes, professional photograph, clean layout, modern business. `;
    corporatePrompt += `Clean, contemporary business aesthetic with strong contrast between photography and graphic elements. `;
    corporatePrompt += `Minimalist layout with clear hierarchy - large headline text, supporting details, background content. `;
    corporatePrompt += `Professional yet approachable tone. `;

    // Add specific text rendering instructions
    corporatePrompt += `Text must be rendered in large, bold, clear sans-serif typography with perfect legibility. `;
    corporatePrompt += `Headline text should be prominently displayed at the top center or top left in high contrast colors. `;
    corporatePrompt += `Supporting details (dates, times, locations) should be displayed in medium-sized, readable text below the headline. `;
    corporatePrompt += `All text must be sharp, crisp, and free of distortion, garbled characters, or spelling errors. `;

    corporatePrompt += `Only partially detected and displayed important information: ${importantDetails}`;

    return corporatePrompt.trim();
  }

  /**
   * Build negative prompt to avoid unwanted elements
   */
  private buildNegativePrompt(): string {
    return (
      `blurry text, garbled text, distorted text, unreadable text, misspelled words, ` +
      `gibberish, pixelated text, low quality, watermark, signature, copyright, ` +
      `cluttered layout, poor typography, bad spacing, amateur design, ` +
      `text cut off, overlapping text, inconsistent colors, messy, unprofessional`
    );
  }

  /**
   * Generate image from text prompt
   */
  async generateImage(
    prompt: string,
    options: ImageGenerationOptions = {}
  ): Promise<ImageGenerationResponse> {
    if (!prompt || prompt.trim().length === 0) {
      return {
        success: false,
        error: 'Prompt is required',
      };
    }

    // Build corporate prompt template
    const corporatePrompt = this.buildCorporatePrompt(prompt.trim());

    // Validate prompt length
    if (corporatePrompt.length > 2000) {
      return {
        success: false,
        error: `Prompt too long (max 2000 characters)`,
      };
    }

    try {
      const startTime = Date.now();

      // Prepare form data for Imagine Art API
      const formData = new FormData();
      formData.append('prompt', corporatePrompt);
      formData.append('style', options.style || 'realistic');

      // Set default aspect ratio to 1:1 for corporate graphics (can be overridden)
      formData.append('aspect_ratio', options.aspect_ratio || '1:1');

      // Add negative prompt to avoid garbled text and quality issues
      const negativePrompt =
        options.negative_prompt || this.buildNegativePrompt();
      formData.append('negative_prompt', negativePrompt);

      if (options.seed) {
        formData.append('seed', options.seed.toString());
      }

      // Note: Pro model might require different endpoint or parameter
      // If use_pro_model is true, you may need to adjust the endpoint
      // For now, we'll use the standard endpoint as Pro model access may vary

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // Verify API key is set
      const trimmedApiKey = this.apiKey?.trim();
      if (!trimmedApiKey || trimmedApiKey.length === 0) {
        return {
          success: false,
          error: 'IMAGINE_ART_API_KEY is not configured or is empty',
        };
      }

      // Prepare headers - Authorization must be explicitly set
      // Note: Don't set Content-Type when using FormData - fetch will set it with boundary automatically
      // Use plain object to ensure headers are sent correctly with FormData
      const authHeader = `Bearer ${trimmedApiKey}`;

      // Debug logging in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Making request to:', this.baseUrl);
        console.log(
          'Authorization header set:',
          authHeader.substring(0, 20) + '...'
        );
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'Unknown error';
        const contentType = response.headers.get('content-type');

        try {
          if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            errorMessage =
              errorData.error ||
              errorData.message ||
              errorData.message ||
              errorMessage;

            // Log full error details in development
            if (process.env.NODE_ENV === 'development') {
              console.error(
                'Imagine Art API Error:',
                JSON.stringify(errorData, null, 2)
              );
            }
          } else {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        return {
          success: false,
          error: `Imagine Art API error: ${response.status} - ${errorMessage}`,
        };
      }

      // Check if response is actually an image
      const contentType = response.headers.get('content-type');
      if (!contentType?.startsWith('image/')) {
        // If not an image, try to read as error message
        const errorText = await response.text();
        return {
          success: false,
          error: `Unexpected response format: ${errorText.substring(0, 200)}`,
        };
      }

      // Imagine Art API returns binary image data
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const generationTime = Date.now() - startTime;

      // Convert buffer to base64 data URL
      const imageBase64 = `data:image/png;base64,${buffer.toString('base64')}`;

      return {
        success: true,
        imageUrl: imageBase64,
        imageBase64: buffer.toString('base64'),
        generationTime,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Image generation timed out. Please try again.',
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to generate image with Imagine Art',
      };
    }
  }

  /**
   * Check if the API is available
   */
  async healthCheck(): Promise<boolean> {
    // Imagine Art API is always available if API key is set
    return !!this.apiKey;
  }

  /**
   * Get current provider type
   */
  getProvider(): string {
    return 'imagine-art';
  }
}

// Singleton instance
let serviceInstance: ImagineArtService | null = null;

export function getImagineArtService(): ImagineArtService {
  if (!serviceInstance) {
    serviceInstance = new ImagineArtService();
  }
  return serviceInstance;
}

// Backward compatibility alias (deprecated - use getImagineArtService)
export function getStableDiffusionService(): ImagineArtService {
  return getImagineArtService();
}
