import { config as loadEnv } from "dotenv";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { resolve } from "path";

for (const envPath of [
  resolve(__dirname, "..", ".env"),
  resolve(__dirname, "..", "..", "..", "..", "fdc-lan-bridge", ".env"),
]) {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath });
    break;
  }
}

const expectMissing = process.argv.includes("--expect-missing");

type QueryRow = Record<string, unknown>;

function fail(message: string): never {
  throw new Error(message);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    fail(`${name} is required.`);
  }
  return value;
}

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) {
    fail(message);
  }
}

const supabaseUrl = requireEnv("SUPABASE_URL");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

async function runQuery<T extends QueryRow = QueryRow>(query: string): Promise<T[]> {
  const headers = new Headers({
    "Content-Type": "application/json",
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  });

  const response = await fetch(`${supabaseUrl}/pg/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    fail(`SQL endpoint returned ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as { value?: T[] } | T[];
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload.value)) {
    return payload.value;
  }

  fail(`Unexpected SQL payload: ${JSON.stringify(payload)}`);
}

async function expectTableMissing() {
  const [row] = await runQuery<{ table_name: string | null }>(
    "select to_regclass('public.fdc_supply_item_history') as table_name",
  );

  if (row?.table_name) {
    fail(`Expected public.fdc_supply_item_history to be missing, found ${row.table_name}.`);
  }

  console.log("PASS: fdc_supply_item_history is not present yet.");
}

async function verifySchema() {
  const columns = await runQuery<{ column_name: string; data_type: string; is_nullable: string }>(`
    select column_name, data_type, is_nullable
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'fdc_supply_item_history'
    order by ordinal_position
  `);

  expect(columns.length > 0, "fdc_supply_item_history columns not found.");

  const expectedColumns = [
    "id",
    "room_id",
    "item_name",
    "unit",
    "last_qty",
    "use_count",
    "last_used_at",
    "created_at",
  ];

  for (const columnName of expectedColumns) {
    expect(
      columns.some((column) => column.column_name === columnName),
      `Missing column ${columnName}.`,
    );
  }

  const uniqueConstraints = await runQuery<{ columns: string[] | string }>(`
    select array_agg(att.attname order by att.attnum) as columns
    from pg_constraint con
    join pg_class rel
      on rel.oid = con.conrelid
    join unnest(con.conkey) with ordinality as key_columns(attnum, ordinality)
      on true
    join pg_attribute att
      on att.attrelid = rel.oid
     and att.attnum = key_columns.attnum
    where rel.relname = 'fdc_supply_item_history'
      and rel.relnamespace = 'public'::regnamespace
      and con.contype = 'u'
    group by con.oid
  `);

  expect(
    uniqueConstraints.some(
      (constraint) =>
        (Array.isArray(constraint.columns)
          ? constraint.columns.join(",")
          : String(constraint.columns).replace(/^\{|\}$/g, "")) === "room_id,item_name,unit",
    ),
    "Unique constraint on (room_id, item_name, unit) is missing.",
  );

  const indexes = await runQuery<{ indexname: string }>(`
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'fdc_supply_item_history'
  `);

  for (const indexName of [
    "idx_supply_item_history_room",
    "idx_supply_item_history_global",
  ]) {
    expect(
      indexes.some((index) => index.indexname === indexName),
      `Missing index ${indexName}.`,
    );
  }

  const policies = await runQuery<{ policyname: string }>(`
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'fdc_supply_item_history'
  `);

  for (const policyName of [
    "Authenticated users can read supply item history",
    "Authenticated users can insert supply item history",
    "Authenticated users can update supply item history",
  ]) {
    expect(
      policies.some((policy) => policy.policyname === policyName),
      `Missing policy ${policyName}.`,
    );
  }

  const triggers = await runQuery<{ trigger_name: string }>(`
    select trigger_name
    from information_schema.triggers
    where trigger_schema = 'public'
      and event_object_table = 'fdc_supply_item_history'
  `);

  expect(
    triggers.some((trigger) => trigger.trigger_name === "trg_supply_item_history_increment_use_count"),
    "Missing trigger trg_supply_item_history_increment_use_count.",
  );
}

async function verifyBehavior() {
  const roomId = `verify-room-${randomUUID()}`;
  const primaryItem = "Khan giay";
  const secondaryItem = "Gang tay";

  try {
    await runQuery(`
      delete from public.fdc_supply_item_history
      where room_id = '${roomId}';
    `);

    await runQuery(`
      insert into public.fdc_supply_item_history (
        room_id,
        item_name,
        unit,
        last_qty,
        use_count,
        last_used_at
      )
      values ('${roomId}', '${primaryItem}', 'hop', 2, 1, '2026-04-01T08:00:00Z')
      on conflict (room_id, item_name, unit)
      do update
      set
        last_qty = excluded.last_qty,
        use_count = excluded.use_count,
        last_used_at = excluded.last_used_at;

      insert into public.fdc_supply_item_history (
        room_id,
        item_name,
        unit,
        last_qty,
        use_count,
        last_used_at
      )
      values ('${roomId}', '${primaryItem}', 'hop', 5, 1, '2026-04-01T09:00:00Z')
      on conflict (room_id, item_name, unit)
      do update
      set
        last_qty = excluded.last_qty,
        use_count = excluded.use_count,
        last_used_at = excluded.last_used_at;

      insert into public.fdc_supply_item_history (
        room_id,
        item_name,
        unit,
        last_qty,
        use_count,
        last_used_at
      )
      values ('${roomId}', '${secondaryItem}', 'hop', 1, 1, '2026-04-01T09:30:00Z')
      on conflict (room_id, item_name, unit)
      do update
      set
        last_qty = excluded.last_qty,
        use_count = excluded.use_count,
        last_used_at = excluded.last_used_at;
    `);

    const rows = await runQuery<{
      item_name: string;
      unit: string;
      last_qty: number;
      use_count: number;
      last_used_at: string;
    }>(`
      select item_name, unit, last_qty, use_count, last_used_at
      from public.fdc_supply_item_history
      where room_id = '${roomId}'
      order by use_count desc, item_name asc
    `);

    expect(rows.length === 2, `Expected 2 rows for ${roomId}, found ${rows.length}.`);
    expect(rows[0].item_name === primaryItem, `Expected ${primaryItem} to rank first.`);
    expect(Number(rows[0].use_count) === 2, `Expected ${primaryItem} use_count to be 2.`);
    expect(Number(rows[0].last_qty) === 5, `Expected ${primaryItem} last_qty to be 5.`);
    expect(
      new Date(rows[0].last_used_at).toISOString() === "2026-04-01T09:00:00.000Z",
      "Expected latest timestamp on repeated upsert.",
    );
    expect(rows[1].item_name === secondaryItem, `Expected ${secondaryItem} to rank second.`);
    expect(Number(rows[1].use_count) === 1, `Expected ${secondaryItem} use_count to be 1.`);
  } finally {
    await runQuery(`
      delete from public.fdc_supply_item_history
      where room_id = '${roomId}';
    `);
  }
}

async function main() {
  if (expectMissing) {
    await expectTableMissing();
    return;
  }

  await verifySchema();
  await verifyBehavior();
  console.log("PASS: supply item history schema and behavior verified.");
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
