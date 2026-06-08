import { GoogleGenerativeAI, Tool } from '@google/generative-ai'

export function createGeminiModel(apiKey: string, modelName = 'gemini-2.5-flash', tools?: Tool[]) {
  const genAI = new GoogleGenerativeAI(apiKey)
  if (tools) {
    return genAI.getGenerativeModel({ model: modelName, tools })
  }
  return genAI.getGenerativeModel({ model: modelName })
}
