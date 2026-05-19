const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

export class GroqService {
  static async generateQuestions(category: string, count: number = 5) {
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
            model: "mixtral-8x7b-32768",
            messages: [
              {
                role: "system",
                content: "You are a trivia master for a social gaming app called FUMIK. Generate fun, engaging, and slightly challenging trivia questions. Return ONLY a JSON array of questions. Each question must have: id (unique string), category, question, options (array of 4 strings), correctIndex (number 0-3), and difficulty (easy, medium, or hard)."
              },
              {
                role: "user",
                content: `Generate ${count} trivia questions about ${category}.`
              }
            ],
            response_format: { type: "json_object" }
          })
        }
      );

      const data: any = await response.json();
      const content = JSON.parse(data.choices[0].message.content);
      return content.questions || content;
    } catch (error) {
      console.error("❌ Groq Error:", error);
      return null;
    }
  }
}
