import { GoogleGenAI, Type } from "@google/genai";
import { Rule, ValidationRequest, ValidationResponse, Publisher, PublisherPrivileges, RuleCondition, ParticipationType } from '../types';
import { generateUUID } from './utils';
import { factDictionary } from './ruleFacts';

// Lazy initialization for the AI instance to prevent app crash on load if API key is missing.
let ai: GoogleGenAI | null = null;

function getAiInstance(): GoogleGenAI {
    if (!ai) {
        if (!process.env.API_KEY) {
            console.error("Google GenAI API Key is missing.");
            throw new Error("A chave da API para a IA não está configurada. A geração de regras está desativada.");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}


const ruleSchema = {
    type: Type.OBJECT,
    properties: {
        description: {
            type: Type.STRING,
            description: "Uma descrição clara e concisa da regra em linguagem natural."
        },
        conditions: {
            type: Type.ARRAY,
            description: "Uma lista de condições que DEVEM TODAS ser verdadeiras para a regra ser violada.",
            items: {
                type: Type.OBJECT,
                properties: {
                    fact: {
                        type: Type.STRING,
                        description: "O atributo do publicador ou da designação a ser verificado. Use os nomes técnicos do dicionário de fatos."
                    },
                    operator: {
                        type: Type.STRING,
                        description: "O operador lógico a ser aplicado. Valores possíveis: 'equal', 'notEqual', 'in', 'notIn', 'contains'."
                    },
                    value: {
                        // The value can be string, boolean, number, or array. The schema doesn't support union types well, so we omit the type and let the model infer it based on the fact.
                        description: "O valor com o qual o 'fact' será comparado. Pode ser uma string, booleano, ou um array de strings (para 'in' e 'notIn')."
                    }
                },
                required: ["fact", "operator", "value"]
            }
        }
    },
    required: ["description", "conditions"]
};

export async function createRuleFromNaturalLanguage(prompt: string): Promise<Omit<Rule, 'id' | 'isActive'>> {
    try {
        const genAI = getAiInstance();
        
        const dictionaryForPrompt = Object.entries(factDictionary)
            .map(([technicalName, { naturalName, singleWordName, description }]) =>
                `- "${naturalName}" (nome técnico: \`${technicalName}\`, alternativa: \`${singleWordName}\`): ${description}`
            )
            .join('\n');

        const fullPrompt = `
            Você é um especialista em criar regras lógicas. Converta a regra de linguagem natural do usuário em uma estrutura JSON.
            As condições no JSON devem representar o cenário em que a regra é VIOLADA.

            **Dicionário de Variáveis (Fatos):**
            Use este dicionário para mapear os termos da regra do usuário (nomes naturais ou suas alternativas) para os nomes técnicos corretos. O JSON final DEVE usar os nomes técnicos (ex: 'condition', 'canGiveTalks').
            ${dictionaryForPrompt}

            **Exemplo de Lógica:**
            - Se a regra do usuário for "Apenas anciãos podem presidir", a violação ocorre se 'Tipo da Parte' é 'Presidente' E a 'Condição' NÃO É 'Ancião'.
            - A condição JSON correspondente seria: { "fact": "partType", "operator": "equal", "value": "Presidente" } E { "fact": "condition", "operator": "notEqual", "value": "Ancião" }.

            **Regra do Usuário para Converter:**
            "${prompt}"
        `;


        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: ruleSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);

        // Basic validation
        if (typeof parsedJson.description !== 'string' || !Array.isArray(parsedJson.conditions)) {
            throw new Error("Formato de regra inválido retornado pela IA.");
        }

        return parsedJson;

    } catch (error) {
        console.error("Erro ao criar regra com IA:", error);
        if (error instanceof Error) {
            throw new Error(`Não foi possível processar a regra: ${error.message}`);
        }
        throw new Error("Não foi possível processar a regra. Verifique a chave da API e a complexidade da regra.");
    }
}

const isPublisherAvailable = (publisher: Publisher, meetingDate: string): boolean => {
    if (!publisher.availability) return true; // Default to available
    const { mode, exceptionDates } = publisher.availability;
    if (mode === 'always') {
        return !exceptionDates.includes(meetingDate);
    }
    if (mode === 'never') {
        return exceptionDates.includes(meetingDate);
    }
    return false;
};

function checkCondition(condition: RuleCondition, publisher: Publisher, partType: string, partTitle: string, meetingDate: string): boolean {
    const { fact, operator, value } = condition;
    let factValue: unknown;

    if (fact === 'isAvailable') {
        factValue = isPublisherAvailable(publisher, meetingDate);
    } else if (fact === 'partType') {
        factValue = partType;
    } else if (fact === 'partTitle') {
        factValue = partTitle;
    } else if (fact in publisher.privileges) {
        factValue = publisher.privileges[fact as keyof PublisherPrivileges];
    } else if (fact in publisher) {
        factValue = publisher[fact as keyof Omit<Publisher, 'privileges'>];
    } else {
        // This fact doesn't exist on the publisher or part, so the condition can't be met.
        return false;
    }

    switch (operator) {
        case 'equal':
            return factValue === value;
        case 'notEqual':
            return factValue !== value;
        case 'in':
            if (!Array.isArray(value)) return false;
            return (value as unknown[]).includes(factValue);
        case 'notIn':
            if (!Array.isArray(value)) return false;
            return !(value as unknown[]).includes(factValue);
        case 'contains':
            if (typeof factValue === 'string' && typeof value === 'string') {
                return factValue.toLowerCase().includes(value.toLowerCase());
            }
            return false;
        default:
            return false;
    }
}


export function validateAssignment(request: ValidationRequest, allRules: Rule[]): ValidationResponse {
    const { publisher, partType, partTitle, meetingDate } = request;
    const activeRules = allRules.filter(rule => rule.isActive);

    for (const rule of activeRules) {
        // A rule is violated if ALL of its conditions are met (logical AND).
        const isViolated = rule.conditions.every(condition => 
            checkCondition(condition, publisher, partType, partTitle, meetingDate)
        );

        if (isViolated) {
            return {
                isValid: false,
                reason: rule.description,
            };
        }
    }

    return {
        isValid: true,
        reason: 'Todas as regras foram atendidas.',
    };
}

export async function suggestPartTitle(publisher: Publisher, partType: ParticipationType): Promise<string> {
    try {
        const genAI = getAiInstance();
        
        const privileges = Object.entries(publisher.privileges)
            .filter(([, canDo]) => canDo)
            .map(([privilege]) => privilege)
            .join(', ');

        const prompt = `
            Você é um assistente para criar pautas de reuniões para Testemunhas de Jeová.
            Com base nas informações do publicador e no tipo de parte, sugira um título de discurso ou tema de parte apropriado e criativo.
            
            Informações do Publicador:
            - Gênero: ${publisher.gender === 'brother' ? 'Irmão' : 'Irmã'}
            - Condição: ${publisher.condition}
            - Privilégios: ${privileges || 'Nenhum específico'}
            
            Tipo da Parte:
            - ${partType}
            
            Instrução: O título deve ser curto, relevante e direto. Retorne APENAS o título em texto simples, sem aspas, marcadores, ou qualquer texto adicional como "Título sugerido:".
            Exemplos de bons títulos: "Como usar bem as publicações", "Leitura da Bíblia: Gênesis 1-3", "Jeová, o Deus de consolo".
        `;

        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text.trim();

    } catch (error) {
        console.error("Erro ao sugerir título com IA:", error);
        if (error instanceof Error) {
            return `Sugestão para ${partType}`;
        }
        return "Não foi possível gerar sugestão";
    }
}