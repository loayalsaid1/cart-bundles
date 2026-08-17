import { db } from "@/lib/db";
import { sql } from "drizzle-orm";


export const runtime = "nodejs";

export async function GET() {

  await db.execute(sql`select 1`);

  return Response.json({
    ok: true,
    message: "Drizzle is connected.",
  });
}
