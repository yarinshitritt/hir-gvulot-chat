export async function onRequest(context) {
    const { request, env } = context;
    
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }
  
    try {
      const { messages } = await request.json();
      const GEMINI_API_KEY = env.GEMINI_API_KEY;

      if (!GEMINI_API_KEY) {
        return Response.json({ reply: "Key לא מוגדר" });
      }

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: messages.map(m => ({
              role: m.role === "system" ? "user" : m.role,
              parts: [{ text: m.content }]
            }))
          })
        }
      );

      const data = await geminiRes.json();

      return Response.json({ 
        reply: data.candidates?.[0]?.content?.parts?.[0]?.text || "לא קיבלתי תשובה",
        full_response: data   // ← זה מה שחשוב
      });

    } catch (error) {
      return Response.json({ reply: "שגיאה: " + error.message });
    }
  }