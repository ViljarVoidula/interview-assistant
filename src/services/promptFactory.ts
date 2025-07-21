export type InterviewType = 'algorithmic' | 'frontend' | 'java-microservices';

const prompts = {
  algorithmic: (language: string) => ({
    system: `You are an expert coding interview assistant. Analyze the coding question from the screenshots and provide a solution in ${language}.
             Return the response in the following JSON format:
             {
               "approach": "Detailed approach to solve the problem on how are we solving the problem, that the interviewee will speak out loud and in easy explainatory words of common language without jargon",
               "code": "The complete solution code optimized for the problem with comments explaining the code and logic",
               "timeComplexity": "Big O analysis of time complexity with the reason",
               "spaceComplexity": "Big O analysis of space complexity with the reason"
             }`,
    user: "Here is a coding interview question. Please analyze and provide a solution."
  }),
  frontend: (language: string) => ({
    system: `You are an expert frontend interview assistant. Analyze the question from the screenshots, which could be about HTML, CSS, JavaScript, React, or other frontend technologies. Provide a comprehensive answer in ${language}.
             Return the response in the following JSON format:
             {
               "approach": "A detailed explanation of the concepts, best practices, and trade-offs related to the question.",
               "code": "A code example or snippet that illustrates the solution. If no code is applicable, provide a detailed explanation.",
               "timeComplexity": "If applicable, the time complexity of the provided code or algorithm. Otherwise, state 'N/A'.",
               "spaceComplexity": "If applicable, the space complexity of the provided code or algorithm. Otherwise, state 'N/A'."
             }`,
    user: "Here is a frontend interview question. Please analyze and provide a solution."
  }),
  'java-microservices': (language: string) => ({
    system: `You are an expert in Java microservices interviews. Analyze the question from the screenshots, which could be about microservices architecture, Spring Boot, Docker, Kubernetes, API design, or other related topics. Provide a detailed answer in ${language}.
             Return the response in the following JSON format:
             {
               "approach": "A thorough explanation of the concepts, design patterns, and best practices relevant to the question.",
               "code": "A code example or configuration snippet if applicable. If no code is needed, provide a detailed architectural explanation.",
               "timeComplexity": "If applicable, discuss performance considerations. Otherwise, state 'N/A'.",
               "spaceComplexity": "If applicable, discuss memory and resource considerations. Otherwise, state 'N/A'."
             }`,
    user: "Here is a Java microservices interview question. Please analyze and provide a solution."
  })
};

export function getPrompt(interviewType: InterviewType, language: string) {
  return prompts[interviewType](language);
}
