const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

if (!GROQ_API_KEY) {
  console.warn("⚠️  GROQ_API_KEY is not set — AI trivia generation will be disabled.");
}

export class GroqService {
  static async generateQuestions(category: string, count: number = 5) {
    if (!GROQ_API_KEY) {
      console.warn("⚠️  Skipping Groq call — API key missing.");
      return null;
    }

    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: `You are a trivia master for a social gaming app called FUMIK. 
                Generate fun, engaging, and slightly challenging trivia questions. 
                Ensure extreme variety in topics even within a category. 
                DO NOT repeat common trivia questions. 
                Current seed: ${Date.now()}. 
                Return ONLY a JSON object with a 'questions' array. 
                Each question must have: id (unique string), category, question, options (array of 4 strings), correctIndex (number 0-3), and difficulty (easy, medium, or hard).`
              },
              {
                role: "user",
                content: `Generate ${count} fresh and unique trivia questions about ${category}. Mix easy and hard ones.`
              }
            ],
            response_format: { type: "json_object" }
          })
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.error("❌ Groq API error:", response.status, err);
        return null;
      }

      const data: any = await response.json();
      const content = JSON.parse(data.choices[0].message.content);
      return content.questions || content;
    } catch (error) {
      console.error("❌ Groq Error:", error);
      return null;
    }
  }
}
