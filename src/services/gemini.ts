import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const geminiModel = "gemini-3-flash-preview";
export const imageModel = "gemini-2.5-flash-image";

export interface CareerQuestion {
  question: string;
  context: string;
  options?: string[];
}

export const STATIC_QUESTIONS: CareerQuestion[] = [
  {
    question: "What is your primary area of study or passion?",
    context: "Establishes the industry foundation for the entire roadmap.",
    options: ["Computer Science", "Medicine/Health", "Business/Economics", "Arts/Humanities", "Engineering/Applied Sciences"]
  },
  {
    question: "Which skills do you currently have or most enjoy using?",
    context: "Identifies existing leverage points to build upon.",
    options: ["Technical/Programming", "Writing/Communication", "Analytical/Math", "Creative/Design", "Leadership/Organization"]
  },
  {
    question: "What motivates you most in a career?",
    context: "Helps prioritize specific roles or companies (e.g., Startups for innovation vs. Corporate for stability).",
    options: ["Financial security", "Social impact", "Constant learning/growth", "Innovation", "Stability"]
  },
  {
    question: "What is your preferred learning style and current constraint?",
    context: "Ensures the suggested educational resources are realistic and sustainable.",
    options: ["Hands-on projects (low budget)", "Structured courses (flexible time)", "Mentorship (willing to invest)", "Self-paced (online/free)"]
  },
  {
    question: "What is your preferred timeline to achieve your primary career goal?",
    context: "Determines the 'pace' of the roadmap—whether it should be an intensive sprint or a gradual climb.",
    options: ["1–2 years (Short-term)", "3–5 years (Medium-term)", "5–10 years (Long-term)", "Flexible/Milestone-based"]
  }
];

export async function generateQuestions(initialGoal: string): Promise<CareerQuestion[]> {
  // We now use static questions but we can still use Gemini to "personalize" them if needed, 
  // but for now, let's stick to the user's requested 5 questions.
  return STATIC_QUESTIONS;
}

export interface RoadmapPhase {
  title: string;
  description: string;
  skills: string[];
  resources: string[];
}

export interface RoadmapData {
  executiveSummary: string;
  phases: RoadmapPhase[];
  milestones: string[];
  strategy: string;
}

export async function generateRoadmap(goal: string, answers: { question: string, answer: string }[]): Promise<RoadmapData> {
  const prompt = `Based on the following career interview for the goal "${goal}":
  ${answers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}
  
  Generate a comprehensive, high-level career roadmap in JSON format.
  The JSON must include:
  1. executiveSummary (A clear, simple overview)
  2. phases (An array of objects with: title, description (simple words), skills (array), and resources (array of specific learning links/platforms))
  3. milestones (An array of simple goals)
  4. strategy (A simple plan for networking and brand building)
  
  Use very simple, easy-to-understand language. No difficult words.`;

  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          executiveSummary: { type: Type.STRING },
          phases: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                resources: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["title", "description", "skills", "resources"]
            }
          },
          milestones: { type: Type.ARRAY, items: { type: Type.STRING } },
          strategy: { type: Type.STRING }
        },
        required: ["executiveSummary", "phases", "milestones", "strategy"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function chatWithMKK(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) {
  const chat = ai.chats.create({
    model: geminiModel,
    config: {
      systemInstruction: "Your name is 'Hello MKK'. You are a friendly career mentor. Use very simple language. No difficult words. Help the user with their career questions.",
    },
    history: history,
  });

  const response = await chat.sendMessage({ message });
  return response.text;
}

export async function generateRoadmapImage(roadmapSummary: string) {
  const prompt = `A cinematic, high-quality visual representation of a career journey roadmap. 
  The image should feature a winding road or path leading from a humble beginning towards a glowing, 
  futuristic city of success on the horizon. Along the road, there are symbolic milestones representing 
  growth and achievement. Style: Professional, inspiring, digital art, high contrast, atmospheric lighting. 
  Context: ${roadmapSummary.substring(0, 500)}`;

  const response = await ai.models.generateContent({
    model: imageModel,
    contents: prompt,
    config: {
      imageConfig: {
        aspectRatio: "9:16",
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}
