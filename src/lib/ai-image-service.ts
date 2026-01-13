/**
 * AI Image Generation Service
 * Supports both self-hosted Docker (Stable Diffusion) and Replicate API
 *
 * Enhanced with QuillBot-style prompt engineering for professional text-integrated images:
 * - Automatically enhances prompts to generate clean, high-quality corporate graphics
 * - Seamlessly integrates text from prompts into the visual design
 * - Detects announcement, welcome, and security styles for appropriate visual treatment
 * - Extracts and prominently displays key information (dates, times, locations, agenda items)
 * - Uses optimized parameters (higher resolution, more steps, better guidance) for quality output
 * - Includes comprehensive negative prompts to avoid unwanted elements
 *
 * Example: A prompt about "all-hands meeting on Friday at 2 PM" will generate a professional
 * announcement graphic with the meeting details prominently displayed in the image.
 */

interface ImageGenerationOptions {
  num_inference_steps?: number; // 20-50, default 30
  guidance_scale?: number; // 1-20, default 9.0
  width?: number; // 512, 768, 1024
  height?: number; // 512, 768, 1024
  negative_prompt?: string;
  seed?: number; // For reproducibility
  enhancePrompt?: boolean; // Enable QuillBot-style prompt enhancement (default: true)
}

interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  error?: string;
  generationTime?: number;
}

type ProviderType = 'docker' | 'replicate';

export class StableDiffusionService {
  private baseUrl: string;
  private timeout: number;
  private provider: ProviderType;
  private replicateApiKey?: string;
  private replicateModel: string =
    'stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf';

  constructor() {
    // Determine provider based on environment variables
    const apiUrl = process.env.STABLE_DIFFUSION_API_URL;
    const replicateKey = process.env.REPLICATE_API_TOKEN;

    if (replicateKey) {
      // Use Replicate API if token is provided
      this.provider = 'replicate';
      this.replicateApiKey = replicateKey;
      this.replicateModel =
        process.env.REPLICATE_MODEL ||
        'stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf';
      this.baseUrl = 'https://api.replicate.com/v1';
      this.timeout = 120000; // 2 minutes for Replicate (longer processing time)
    } else {
      // Use self-hosted Docker API
      this.provider = 'docker';
      this.baseUrl = apiUrl || 'http://localhost:8000';
      this.timeout = 60000; // 60 seconds for local Docker
    }
  }

  /**
   * Enhance prompt with QuillBot-style instructions for professional text-integrated images
   */
  private enhancePromptForQuillBotStyle(originalPrompt: string): {
    enhancedPrompt: string;
    negativePrompt: string;
  } {
    // Extract key information from the prompt
    const lowerPrompt = originalPrompt.toLowerCase();

    // Detect announcement/meeting style
    const isAnnouncement =
      lowerPrompt.includes('meeting') ||
      lowerPrompt.includes('announcement') ||
      lowerPrompt.includes('all-hands') ||
      lowerPrompt.includes('all hands') ||
      lowerPrompt.includes('conference') ||
      lowerPrompt.includes('mandatory') ||
      lowerPrompt.includes('quarterly') ||
      lowerPrompt.includes('department');

    // Detect welcome/onboarding style
    const isWelcome =
      lowerPrompt.includes('welcome') ||
      lowerPrompt.includes('new employee') ||
      lowerPrompt.includes('onboarding') ||
      lowerPrompt.includes('help them feel welcome');

    // Detect security/policy style
    const isSecurity =
      lowerPrompt.includes('security') ||
      lowerPrompt.includes('policy') ||
      lowerPrompt.includes('authentication') ||
      lowerPrompt.includes('effective immediately') ||
      lowerPrompt.includes('two-factor') ||
      lowerPrompt.includes('2fa');

    // Extract dates, times, locations, and agenda items
    const dateMatch = originalPrompt.match(
      /\b(friday|monday|tuesday|wednesday|thursday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)\b/gi
    );
    const timeMatch =
      originalPrompt.match(/\b\d{1,2}\s*(am|pm|AM|PM|:00|PM|AM)\b/gi) ||
      originalPrompt.match(/\b\d{1,2}:\d{2}\s*(am|pm|AM|PM)\b/gi);
    const locationMatch = originalPrompt.match(
      /\b(conference room|main room|main conference room|office|building|location:?)\s+[\w\s]+/gi
    );

    // Extract agenda items (Q4 results, initiatives, achievements, etc.)
    const agendaMatch = originalPrompt.match(
      /\b(q[1-4]\s+results?|results|initiatives?|achievements?|presentations?|discussing|celebrating)\b/gi
    );

    // Build enhanced prompt with QuillBot-style instructions
    let enhancedPrompt = originalPrompt;

    // Add style instructions based on detected type
    if (isAnnouncement || isWelcome || isSecurity) {
      enhancedPrompt = `Professional corporate announcement graphic, ${enhancedPrompt.toLowerCase()}. `;

      // Add text integration instructions
      enhancedPrompt += `The image must seamlessly integrate key text elements from the prompt directly into the visual design. `;
      enhancedPrompt += `Text should be prominently displayed in large, bold, white sans-serif font with perfect readability. `;

      // Add layout instructions
      enhancedPrompt += `Clean, high-quality layout with perfect structure and visual hierarchy. `;
      enhancedPrompt += `Professional typography with well-spaced text elements. `;

      // Add visual style
      if (isAnnouncement) {
        enhancedPrompt += `Modern corporate aesthetic with abstract flowing shapes in teal, blue, orange, and yellow. `;
        enhancedPrompt += `Gradient backgrounds transitioning from dark blue-green to lighter shades. `;
        enhancedPrompt += `Photographic background of diverse professionals in a meeting room, slightly blurred with color overlay. `;
        enhancedPrompt += `Large screen or display visible in background showing relevant agenda text. `;
      } else if (isWelcome) {
        enhancedPrompt += `Warm, welcoming aesthetic with blurred background of smiling diverse team members. `;
        enhancedPrompt += `Colorful rectangular overlays (orange, blue) with white bold text. `;
        enhancedPrompt += `Semi-transparent grey bar at bottom for additional messaging. `;
      } else if (isSecurity) {
        enhancedPrompt += `Security-focused design with dark gradient background (indigo to dark red). `;
        enhancedPrompt += `Vibrant yellow and red borders. `;
        enhancedPrompt += `Lime green security icons (padlock, smartphone with code, shield). `;
        enhancedPrompt += `Bold white text with yellow highlights for critical phrases. `;
      }

      // Add quality instructions
      enhancedPrompt += `Ultra-high resolution, sharp, crisp graphics. `;
      enhancedPrompt += `Professional color palette with excellent contrast. `;
      enhancedPrompt += `Seamless integration of text and graphics. `;
      enhancedPrompt += `Perfect layout and structure, easy to read at a glance. `;

      // Add specific extracted information if found
      if (dateMatch && dateMatch.length > 0) {
        enhancedPrompt += `Prominently display date information: ${dateMatch.join(
          ', '
        )}. `;
      }
      if (timeMatch && timeMatch.length > 0) {
        enhancedPrompt += `Display time clearly in the image: ${timeMatch.join(
          ', '
        )}. `;
      }
      if (locationMatch && locationMatch.length > 0) {
        enhancedPrompt += `Include location information: ${locationMatch.join(
          ', '
        )}. `;
      }
      if (agendaMatch && agendaMatch.length > 0 && isAnnouncement) {
        enhancedPrompt += `Display agenda items or topics on screen or in text: ${agendaMatch
          .slice(0, 3)
          .join(', ')}. `;
      }
    } else {
      // Generic professional style for other prompts
      enhancedPrompt = `Professional, clean, high-quality graphic design. ${enhancedPrompt}. `;
      enhancedPrompt += `Seamlessly integrate any key text or information from the prompt into the image design. `;
      enhancedPrompt += `Modern, polished aesthetic with excellent typography and layout. `;
      enhancedPrompt += `Sharp, crisp, high-resolution output. `;
    }

    // Build negative prompt to avoid unwanted elements
    const negativePrompt =
      `blurry, low quality, distorted text, unreadable text, cluttered layout, ` +
      `poor typography, bad spacing, amateur design, pixelated, grainy, ` +
      `watermark, signature, copyright, logo overlay, ` +
      `inconsistent colors, ugly, messy, unprofessional, ` +
      `text cut off, text outside image, overlapping text, ` +
      `low resolution, jpeg artifacts, compression artifacts`;

    return {
      enhancedPrompt: enhancedPrompt.trim(),
      negativePrompt,
    };
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

    // Enhance prompt if enabled (default: true)
    const shouldEnhance = options.enhancePrompt !== false;
    let finalPrompt = prompt;
    let finalNegativePrompt = options.negative_prompt || '';

    if (shouldEnhance) {
      const enhanced = this.enhancePromptForQuillBotStyle(prompt);
      finalPrompt = enhanced.enhancedPrompt;
      finalNegativePrompt =
        enhanced.negativePrompt +
        (options.negative_prompt ? `, ${options.negative_prompt}` : '');
    }

    // Validate enhanced prompt length (increased limit for enhanced prompts)
    const maxLength = shouldEnhance ? 2000 : 500;
    if (finalPrompt.length > maxLength) {
      return {
        success: false,
        error: `Prompt too long (max ${maxLength} characters)`,
      };
    }

    // Use enhanced options with better defaults for quality
    const enhancedOptions: ImageGenerationOptions = {
      num_inference_steps: options.num_inference_steps || 30, // Increased from 20 for better quality
      guidance_scale: options.guidance_scale || 9.0, // Increased from 7.5 for better prompt adherence
      width: options.width || 1024, // Increased from 512 for better text readability
      height: options.height || 1024,
      negative_prompt: finalNegativePrompt,
      seed: options.seed,
      enhancePrompt: false, // Don't enhance again
    };

    if (this.provider === 'replicate') {
      return this.generateWithReplicate(finalPrompt, enhancedOptions);
    } else {
      return this.generateWithDocker(finalPrompt, enhancedOptions);
    }
  }

  /**
   * Generate image using Replicate API
   */
  private async generateWithReplicate(
    prompt: string,
    options: ImageGenerationOptions
  ): Promise<ImageGenerationResponse> {
    // Re-check token in case env var was set after service initialization
    const token = this.replicateApiKey || process.env.REPLICATE_API_TOKEN;

    if (!token) {
      return {
        success: false,
        error:
          'Replicate API token not configured. Please set REPLICATE_API_TOKEN in your environment variables.',
      };
    }

    try {
      const startTime = Date.now();

      // Extract model version from model string (format: "owner/model:version" or just "version")
      const modelVersion = this.replicateModel.includes(':')
        ? this.replicateModel.split(':')[1]
        : this.replicateModel;

      // Create prediction
      const createResponse = await fetch(
        'https://api.replicate.com/v1/predictions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({
            version: modelVersion,
            input: {
              prompt: prompt.trim(),
              num_inference_steps: options.num_inference_steps || 30,
              guidance_scale: options.guidance_scale || 9.0,
              width: options.width || 1024,
              height: options.height || 1024,
              ...(options.negative_prompt && {
                negative_prompt: options.negative_prompt,
              }),
              ...(options.seed && { seed: options.seed }),
            },
          }),
        }
      );

      if (!createResponse.ok) {
        let errorData: any;
        try {
          errorData = await createResponse.json();
        } catch {
          const errorText = await createResponse.text();
          errorData = { detail: errorText };
        }
        return {
          success: false,
          error: `Replicate API error: ${createResponse.status} - ${
            errorData.detail || errorData.message || 'Unknown error'
          }`,
        };
      }

      const prediction = await createResponse.json();

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes max (2s * 60)

      while (
        prediction.status === 'starting' ||
        prediction.status === 'processing'
      ) {
        if (attempts >= maxAttempts) {
          return {
            success: false,
            error: 'Image generation timed out',
          };
        }

        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

        const statusResponse = await fetch(
          `https://api.replicate.com/v1/predictions/${prediction.id}`,
          {
            headers: {
              Authorization: `Token ${token}`,
            },
          }
        );

        if (!statusResponse.ok) {
          let errorData: any;
          try {
            errorData = await statusResponse.json();
          } catch {
            const errorText = await statusResponse.text();
            errorData = { detail: errorText };
          }
          return {
            success: false,
            error: `Replicate API error: ${statusResponse.status} - ${
              errorData.detail || errorData.message || 'Unknown error'
            }`,
          };
        }

        const statusData = await statusResponse.json();
        Object.assign(prediction, statusData);

        if (statusData.status === 'succeeded' && statusData.output) {
          const generationTime = Date.now() - startTime;
          const imageUrl = Array.isArray(statusData.output)
            ? statusData.output[0]
            : statusData.output;

          return {
            success: true,
            imageUrl,
            generationTime,
          };
        }

        if (
          statusData.status === 'failed' ||
          statusData.status === 'canceled'
        ) {
          return {
            success: false,
            error: statusData.error || 'Image generation failed',
          };
        }

        attempts++;
      }

      return {
        success: false,
        error: 'Unexpected prediction status',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate image with Replicate',
      };
    }
  }

  /**
   * Generate image using self-hosted Docker API
   */
  private async generateWithDocker(
    prompt: string,
    options: ImageGenerationOptions
  ): Promise<ImageGenerationResponse> {
    try {
      const startTime = Date.now();

      const requestBody = {
        prompt: prompt.trim(),
        num_inference_steps: options.num_inference_steps || 30,
        guidance_scale: options.guidance_scale || 9.0,
        width: options.width || 1024,
        height: options.height || 1024,
        ...(options.negative_prompt && {
          negative_prompt: options.negative_prompt,
        }),
        ...(options.seed && { seed: options.seed }),
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/v1/txt2img`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `API error: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json();
      const generationTime = Date.now() - startTime;

      // API returns base64 image or URL
      if (data.image) {
        // If base64, convert to data URL
        const imageBase64 = data.image;
        const imageUrl = `data:image/png;base64,${imageBase64}`;

        return {
          success: true,
          imageUrl,
          imageBase64,
          generationTime,
        };
      } else if (data.url) {
        return {
          success: true,
          imageUrl: data.url,
          generationTime,
        };
      } else {
        return {
          success: false,
          error: 'Invalid response format from API',
        };
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Image generation timed out. Please try again.',
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to generate image',
      };
    }
  }

  /**
   * Check if the API is available
   */
  async healthCheck(): Promise<boolean> {
    if (this.provider === 'replicate') {
      // Replicate API is always available if token is set
      return !!this.replicateApiKey;
    } else {
      // Check Docker API health endpoint
      try {
        const response = await fetch(`${this.baseUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        return response.ok;
      } catch {
        return false;
      }
    }
  }

  /**
   * Get current provider type
   */
  getProvider(): ProviderType {
    return this.provider;
  }
}

// Singleton instance
let serviceInstance: StableDiffusionService | null = null;

export function getStableDiffusionService(): StableDiffusionService {
  if (!serviceInstance) {
    serviceInstance = new StableDiffusionService();
  }
  return serviceInstance;
}
