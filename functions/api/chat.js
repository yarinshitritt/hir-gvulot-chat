export async function onRequest(context) {
    const { request, env } = context;
    
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }
  
    try {
      const { messages } = await request.json();
      const GEMINI_API_KEY = env.GEMINI_API_KEY;
  
      if (!GEMINI_API_KEY) {
        return Response.json({ reply: "ה-Key לא מוגדר" }, { status: 500 });
      }
  
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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

      console.log("Gemini Status:", geminiRes.status);
      const data = await geminiRes.json();
      console.log("Gemini Response:", data);

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "לא קיבלתי תשובה";
  
      return Response.json({ reply });
    } catch (error) {
      console.error(error);
      return Response.json({ reply: "שגיאה בשרת" }, { status: 500 });
    }
  }