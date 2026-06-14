const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

const FALLBACK_QUESTIONS = [
  {
    id: "fb_1",
    category: "GEOGRAPHY",
    question: "Which country has the most natural lakes?",
    options: ["Canada", "Russia", "United States", "Brazil"],
    correctIndex: 0,
    difficulty: "medium"
  },
  {
    id: "fb_2",
    category: "SCIENCE",
    question: "What is the only metal that is liquid at room temperature?",
    options: ["Mercury", "Gallium", "Bromine", "Cesium"],
    correctIndex: 0,
    difficulty: "easy"
  },
  {
    id: "fb_3",
    category: "HISTORY",
    question: "Who was the first Emperor of Rome?",
    options: ["Julius Caesar", "Augustus", "Nero", "Marcus Aurelius"],
    correctIndex: 1,
    difficulty: "medium"
  },
  {
    id: "fb_4",
    category: "TECHNOLOGY",
    question: "What does 'HTTP' stand for in web addresses?",
    options: ["HyperText Transfer Protocol", "HighText Transfer Path", "HyperTech Transmission Protocol", "HyperText Terminal Program"],
    correctIndex: 0,
    difficulty: "easy"
  },
  {
    id: "fb_5",
    category: "POP CULTURE",
    question: "Which movie won the first-ever Academy Award for Best Picture?",
    options: ["Wings", "Metropolis", "The Jazz Singer", "Sunrise"],
    correctIndex: 0,
    difficulty: "hard"
  },
  {
    id: "fb_6",
    category: "SCIENCE",
    question: "Which gas makes up about 78% of Earth's atmosphere?",
    options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Argon"],
    correctIndex: 1,
    difficulty: "easy"
  },
  {
    id: "fb_7",
    category: "GEOGRAPHY",
    question: "What is the capital city of Australia?",
    options: ["Sydney", "Melbourne", "Canberra", "Brisbane"],
    correctIndex: 2,
    difficulty: "easy"
  },
  {
    id: "fb_8",
    category: "LITERATURE",
    question: "Who wrote the classic novel '1984'?",
    options: ["Aldous Huxley", "George Orwell", "Ray Bradbury", "H.G. Wells"],
    correctIndex: 1,
    difficulty: "easy"
  },
  {
    id: "fb_9",
    category: "SPORTS",
    question: "How many players are on the field for one team in a standard soccer match?",
    options: ["10", "11", "12", "9"],
    correctIndex: 1,
    difficulty: "easy"
  },
  {
    id: "fb_10",
    category: "ART",
    question: "Which artist painted the 'Mona Lisa'?",
    options: ["Vincent van Gogh", "Leonardo da Vinci", "Pablo Picasso", "Michelangelo"],
    correctIndex: 1,
    difficulty: "easy"
  }
];

export class GroqService {
  static async generateQuestions(category: string | string[], count: number = 5, difficulty: string | string[] = "medium", retryCount = 0): Promise<any[] | null> {
    const categoriesStr = Array.isArray(category) ? category.join(', ') : category;
    const difficultyStr = Array.isArray(difficulty) ? difficulty.join(', ') : difficulty;

    if (!GROQ_API_KEY) {
      console.warn("⚠️  GROQ_API_KEY missing. Using fallback questions.");
      const shuffled = [...FALLBACK_QUESTIONS].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
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
                content: `You are FUMIK OS AI trivia engine. Generate ${count} fun, engaging trivia questions distributed across these categories: ${categoriesStr}. Use a mix of these difficulty levels: ${difficultyStr}. 
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
            temperature: 0.95
          })
        }
      );

      if (!response.ok) {
        if (retryCount < 1) return this.generateQuestions(category, count, difficulty, retryCount + 1);
        console.warn("⚠️  Groq API response not OK. Using fallback questions.");
        const shuffled = [...FALLBACK_QUESTIONS].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
      }

      const data: any = await response.json();
      const content = JSON.parse(data.choices[0].message.content);
      return content.questions || content;
    } catch (error) {
      if (retryCount < 1) return this.generateQuestions(category, count, difficulty, retryCount + 1);
      console.error("❌ Groq Error:", error);
      const shuffled = [...FALLBACK_QUESTIONS].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    }
  }
}