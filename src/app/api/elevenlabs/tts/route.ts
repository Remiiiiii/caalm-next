import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, voice_id = '21m00Tcm4TlvDq8ikWAM' } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error('ElevenLabs API key not configured');
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    // Try turbo model first for faster generation, fallback to multilingual if needed
    let response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5', // Use turbo model for faster generation
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      }
    );

    // If turbo model fails, try multilingual as fallback
    if (!response.ok) {
      // Clone response to read error without consuming body
      const responseClone = response.clone();
      const errorText = await responseClone.text().catch(() => 'Unknown error');

      // Try multilingual fallback for 400 errors (likely model issue)
      if (response.status === 400) {
        try {
          const errorData = JSON.parse(errorText);
          // Check if it's a model-related error
          const isModelError =
            errorData.detail?.includes('model') ||
            errorData.detail?.includes('turbo') ||
            errorData.message?.includes('model') ||
            errorData.message?.includes('turbo') ||
            errorText.toLowerCase().includes('model') ||
            errorText.toLowerCase().includes('turbo');

          if (isModelError) {
            console.warn(
              'Turbo model not available, falling back to multilingual:',
              errorData.detail || errorData.message || errorText
            );
            // Try with multilingual model
            response = await fetch(
              `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
              {
                method: 'POST',
                headers: {
                  Accept: 'audio/mpeg',
                  'Content-Type': 'application/json',
                  'xi-api-key': apiKey,
                },
                body: JSON.stringify({
                  text,
                  model_id: 'eleven_multilingual_v2',
                  voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.5,
                    use_speaker_boost: true,
                  },
                }),
              }
            );

            // If fallback also fails, handle the error
            if (!response.ok) {
              const fallbackErrorText = await response
                .text()
                .catch(() => 'Unknown error');
              console.error('ElevenLabs API error (fallback also failed):', {
                status: response.status,
                statusText: response.statusText,
                error: fallbackErrorText,
              });
              return NextResponse.json(
                {
                  error: 'Failed to generate speech',
                  details: fallbackErrorText,
                },
                { status: response.status }
              );
            }
          } else {
            // Not a model error, return original error
            console.error('ElevenLabs API error:', {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
            });
            return NextResponse.json(
              { error: 'Failed to generate speech', details: errorText },
              { status: response.status }
            );
          }
        } catch {
          // If error parsing fails, try multilingual anyway as fallback
          console.warn(
            'Error parsing turbo model error, trying multilingual fallback'
          );
          response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
            {
              method: 'POST',
              headers: {
                Accept: 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': apiKey,
              },
              body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                  stability: 0.5,
                  similarity_boost: 0.75,
                  style: 0.5,
                  use_speaker_boost: true,
                },
              }),
            }
          );

          // If fallback also fails, return error
          if (!response.ok) {
            const fallbackErrorText = await response
              .text()
              .catch(() => 'Unknown error');
            console.error('ElevenLabs API error (fallback also failed):', {
              status: response.status,
              statusText: response.statusText,
              error: fallbackErrorText,
            });
            return NextResponse.json(
              {
                error: 'Failed to generate speech',
                details: fallbackErrorText,
              },
              { status: response.status }
            );
          }
        }
      } else {
        // Not a 400 error, return original error
        console.error('ElevenLabs API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        return NextResponse.json(
          { error: 'Failed to generate speech', details: errorText },
          { status: response.status }
        );
      }
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate speech',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
