import { NextRequest } from "next/server";
import { callAI, parseAIJson } from "@/lib/ai";

export type InterviewPrepResponse = {
  questions: { question: string; tip: string }[];
  generalTips: string[];
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobType, city, targetRole, skills, summary } = body as {
      jobType: string;
      city?: string;
      targetRole?: string;
      skills?: string[];
      summary?: string;
    };

    if (!jobType) {
      return Response.json({ questions: [], generalTips: [] } satisfies InterviewPrepResponse);
    }

    const role = targetRole || jobType;
    const location = city || "Canada";
    const skillsList = skills?.slice(0, 10).join(", ") || "";
    const summarySnippet = summary?.slice(0, 300) || "";

    const systemPrompt = `You are a Canadian career coach helping job seekers prepare for interviews.

Generate interview preparation content for a ${role} role in ${location}, Canada.

Rules:
- Write 5 to 7 behavioral or situational interview questions relevant to ${role} positions.
- For each question, include a short tip (1–2 sentences) on how to answer it well (e.g., use STAR method, mention specific tools, highlight Canadian workplace values like teamwork and safety).
- Write 3 to 4 general interview tips specific to the ${jobType} industry in Canada.
- Keep language simple and practical for newcomers to Canada.
- Canadian spelling.

Return ONLY valid JSON, no markdown:
{
  "questions": [
    { "question": "...", "tip": "..." }
  ],
  "generalTips": ["tip 1", "tip 2", "tip 3"]
}`;

    const userPrompt = `Role: ${role}
Location: ${location}
Job sector: ${jobType}
${skillsList ? `Candidate skills: ${skillsList}` : ""}
${summarySnippet ? `Candidate summary: ${summarySnippet}` : ""}

Return the JSON.`;

    const { content } = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    let parsed: InterviewPrepResponse;
    try {
      parsed = parseAIJson<InterviewPrepResponse>(content);
      if (!Array.isArray(parsed.questions)) parsed.questions = [];
      if (!Array.isArray(parsed.generalTips)) parsed.generalTips = [];
      parsed.questions = parsed.questions.slice(0, 7).filter((q) => q.question && q.tip);
      parsed.generalTips = parsed.generalTips.slice(0, 4).filter(Boolean);
    } catch {
      parsed = { questions: [], generalTips: [] };
    }

    return Response.json(parsed);
  } catch (err) {
    console.error("/api/resume/interview-prep error:", err);
    return Response.json({ questions: [], generalTips: [] } satisfies InterviewPrepResponse);
  }
}
