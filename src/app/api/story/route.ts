import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUser } from '@/lib/db'
import { generateEmbedding, processStoryToTimeline, generateTitle } from '@/lib/embeddings'
import prisma from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const auth0Id = req.headers.get('x-auth-user-id')
    const username = req.headers.get('x-auth-username')

    if (!auth0Id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { story } = await req.json()
    const sessionId = req.cookies.get('sessionId')?.value

    const { user, sessionId: newSessionId } = await getOrCreateUser(
      sessionId,
      auth0Id,
      username || undefined
    )

    // Process the story asynchronously
    const [timelineJson, embedding, title] = await Promise.all([
      processStoryToTimeline(story),
      generateEmbedding(story),
      generateTitle(story)
    ])

    // Save to database
    await prisma.story.create({
      data: {
        userId: user.id,
        title,
        rawText: story,
        timelineJson,
        embedding
      }
    })

    const response = NextResponse.json({ success: true })

    // Set session cookie if it's a new user
    if (!sessionId) {
      response.cookies.set('sessionId', newSessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365 // 1 year
      })
    }

    return response
  } catch (error) {
    console.error('Error processing story:', error)
    return NextResponse.json(
      { error: 'Failed to process story' },
      { status: 500 }
    )
  }
}
