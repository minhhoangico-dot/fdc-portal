
import { NextResponse } from 'next/server';
import prisma from '@/lib/db/app-client';

export async function GET() {
    try {
        const codes = await prisma.wcrInfectiousCode.findMany({
            orderBy: { display_order: 'asc' }
        });
        return NextResponse.json(codes);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { icd_code, icd_pattern, disease_name_vi, disease_group, color_code } = body;

        // Basic validation
        if (!icd_code || !disease_name_vi || !disease_group) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const created = await prisma.wcrInfectiousCode.create({
            data: {
                icd_code,
                icd_pattern: icd_pattern || (icd_code + '%'),
                disease_name_vi,
                disease_group,
                color_code: color_code || '#cbd5e1',
                display_order: 99
            }
        });

        return NextResponse.json(created);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, ...data } = body;

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const updated = await prisma.wcrInfectiousCode.update({
            where: { id },
            data
        });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    try {
        await prisma.wcrInfectiousCode.delete({
            where: { id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
