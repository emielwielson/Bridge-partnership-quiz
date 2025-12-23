import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { generateClassLink } from '@/lib/class-link'
import { ClassMemberRole } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Class name is required' },
        { status: 400 }
      )
    }

    // Generate unique class link
    const classLink = await generateClassLink()

    // Create class and add creator as teacher in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create class
      const newClass = await tx.class.create({
        data: {
          name: name.trim(),
          classLink,
          teacherId: user.id,
        },
      })

      // Add creator as teacher
      await tx.classMember.create({
        data: {
          classId: newClass.id,
          userId: user.id,
          role: ClassMemberRole.TEACHER,
        },
      })

      // Return class with members
      return await tx.class.findUnique({
        where: { id: newClass.id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
          teacher: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      })
    })

    return NextResponse.json(
      {
        message: 'Class created successfully',
        class: result,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Create class error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

