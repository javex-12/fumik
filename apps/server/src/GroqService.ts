const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

export class GroqService {
  static async generateQuestions(category: string, count: number = 5, retryCount = 0): Promise<any[] | null> {
    if (!GROQ_API_KEY) {
      console.warn("⚠️  GROQ_API_KEY missing.");
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
                content: `You are FUMIK OS AI trivia engine. Generate ${count} fun, engaging trivia questions about ${category}. 
                Ensure extreme variety. Seed: ${Date.now()}_${Math.random()}.
                Return ONLY a JSON object with a 'questions' array.
                Structure: id (unique), category, question, options (4 strings), correctIndex (0-3), difficulty.`
              },
              {
                role: "user",
                content: `Generate ${count} questions now.`
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.8
          })
        }
      );

      if (!response.ok) {
        if (retryCount < 1) return this.generateQuestions(category, count, retryCount + 1);
        return null;
      }

      const data: any = await response.json();
      const content = JSON.parse(data.choices[0].message.content);
      return content.questions || content;
    } catch (error) {
      if (retryCount < 1) return this.generateQuestions(category, count, retryCount + 1);
      console.error("❌ Groq Error:", error);
      return null;
    }
  }
}