import { NextResponse } from "next/server";
import { exportCallsCsv } from "@/services/calls";

export async function GET() {
  const csv = await exportCallsCsv();
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=calls_export.csv",
    },
  });
}
