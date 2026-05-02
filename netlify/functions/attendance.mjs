import { listAttendance, json } from "./_airtable.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed." });
  }
  const sessionId = event.queryStringParameters?.sessionId || undefined;
  try {
    const attendance = await listAttendance({ sessionId });
    return json(200, { attendance, sessionId: sessionId || null, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Attendance endpoint error:", error);
    return json(200, {
      attendance: [],
      sessionId: sessionId || null,
      warning: "Airtable unavailable; returned empty list.",
      updatedAt: new Date().toISOString(),
    });
  }
};
