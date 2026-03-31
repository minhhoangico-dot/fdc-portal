
import { NextResponse } from 'next/server';
import { queryHis } from '@/lib/db/his-client';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'group' | 'subgroup'
    const groupId = searchParams.get('group_id');

    try {
        if (type === 'subgroup') {
            if (!groupId) {
                return NextResponse.json({ error: 'group_id is required for subgroups' }, { status: 400 });
            }
            const result = await queryHis(
                `SELECT dm_servicesubgroupid, dm_servicesubgroupname 
         FROM tb_dm_servicesubgroup 
         WHERE dm_servicegroupid = $1 AND dm_servicesubgroupdisable = 0
         ORDER BY dm_servicesubgroupid`,
                [groupId]
            );
            return NextResponse.json(result.rows);
        } else {
            // Default to groups
            const result = await queryHis(
                `SELECT dm_servicegroupid, dm_servicegroupname 
         FROM tb_dm_servicegroup 
         WHERE dm_servicegroupdisable = 0
         ORDER BY dm_servicegroupid`
            );
            return NextResponse.json(result.rows);
        }
    } catch (error) {
        console.error('Error fetching service categories:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
