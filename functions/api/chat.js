export async function onRequest(context) {
    const { request, env } = context;
    
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }
  
    try {
      const { messages } = await request.json();
      const GEMINI_API_KEY = env.GEMINI_API_KEY;
  
      if (!GEMINI_API_KEY) {
        return Response.json({ reply: "ה-Key לא מוגדר ב-Cloudflare" }, { status: 500 });
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
            })),
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800
            }
          })
        }
      );

      if (!geminiRes.ok) {
        const errorText = await geminiRes.text();
        console.error("Gemini Error:", errorText);
        return Response.json({ reply: `שגיאה מ-Gemini: ${geminiRes.status}` }, { status: 500 });
      }

      const data = await geminiRes.json();
      
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text 
        || data.error?.message 
        || "לא קיבלתי תשובה";

      return Response.json({ reply });

    } catch (error) {
      console.error("Server Error:", error);
      return Response.json({ reply: "שגיאה בשרת - בדוק את ה-API Key" }, { status: 500 });
    }
  }