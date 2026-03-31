
import { NextResponse } from 'next/server';
import { queryHis } from '@/lib/db/his-client';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
        return NextResponse.json({ error: 'Query too short' }, { status: 400 });
    }

    try {
        const result = await queryHis(
            `SELECT DISTINCT servicename 
       FROM tb_servicedata 
       WHERE servicedatausedate >= CURRENT_DATE - INTERVAL '60 days'
         AND servicename ILIKE $1
       ORDER BY servicename
       LIMIT 100`,
            [`%${query}%`]
        );
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error searching services:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
