import { env } from "../config/env";

const baseUrl = `${env.CLICKHOUSE_URL}/?database=${env.CLICKHOUSE_DATABASE}&user=${env.CLICKHOUSE_USER}&password=${env.CLICKHOUSE_PASSWORD}`;

export async function clickhouseQuery<T = unknown>(query: string): Promise<T[]> {
  const res = await fetch(`${baseUrl}&default_format=JSON`, {
    method: "POST",
    body: query,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClickHouse query error: ${text}`);
  }
  const json = await res.json() as { data: T[] };
  return json.data;
}

export async function clickhouseInsert(table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;

  const columns = Object.keys(rows[0]);
  const values = rows
    .map((row) =>
      `(${columns.map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return "NULL";
        if (typeof val === "string") return `'${val.replace(/'/g, "\\'")}'`;
        if (typeof val === "number") return val.toString();
        return `'${JSON.stringify(val).replace(/'/g, "\\'")}'`;
      }).join(",")})`
    )
    .join(",");

  const query = `INSERT INTO ${table} (${columns.join(",")}) VALUES ${values}`;
  const res = await fetch(baseUrl, { method: "POST", body: query });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClickHouse insert error: ${text}`);
  }
}
