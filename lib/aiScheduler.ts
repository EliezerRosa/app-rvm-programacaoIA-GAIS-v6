import { GoogleGenAI, Type } from "@google/genai";
import { Publisher, Participation, Rule, Workbook, ParticipationType, AiScheduleResult, SpecialEvent, EventTemplate } from '../types';
import { validateAssignment } from './inferenceEngine';
import { calculatePartDate, PAIRABLE_PART_TYPES, normalizeName } from './utils';

let ai: GoogleGenAI | null = null;

function getAiInstance(): GoogleGenAI {
    if (!ai) {
        if (!process.env.API_KEY) throw new Error("A chave da API do Google GenAI não está configurada.");
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}

// Define an interface for the parts processed by the AI scheduler
interface AiProcessablePart {
    partTitle: string;
    type: ParticipationType;
    duration?: number;
    assignedTo?: string; // Optional field for pre-assigned publisher for events/special rules
    requiresHelper: boolean;
}

// Helper to map the detailed types from AI extraction (ExtractedSchedule) to our ParticipationType enum
function mapAiTypeToParticipationType(aiType: string, partTitle: string, currentSectionContext: ParticipationType): ParticipationType {
    const titleLower = partTitle.toLowerCase();
    // Strict checking for Opening/Closing prayers based on keywords AND context/position logic handled by caller
    if (titleLower.includes('oração') && titleLower.includes('inicial')) return ParticipationType.ORACAO_INICIAL;
    if (titleLower.includes('oração') && titleLower.includes('final')) return ParticipationType.ORACAO_FINAL;
    
    if (titleLower.includes('comentários iniciais')) return ParticipationType.PRESIDENTE;
    if (titleLower.includes('comentários finais')) return ParticipationType.COMENTARIOS_FINAIS;
    if (titleLower.includes('leitura da bíblia')) return ParticipationType.TESOUROS;
    if (titleLower.includes('estudo bíblico') || aiType === 'BIBLE_STUDY') return ParticipationType.DIRIGENTE;
    
    if (aiType === 'STUDENT_PART') {
        return ParticipationType.MINISTERIO;
    }
    if (aiType === 'DISCOURSE') {
        // Keep the section context (Tesouros or Vida Cristã)
        return currentSectionContext; 
    }
    
    return currentSectionContext; // Default fallback
}

const getPartsFromWorkbook = async (
    workbook: Workbook,
    specialEvents: SpecialEvent[],
    eventTemplates: EventTemplate[],
    week: string
): Promise<AiProcessablePart[]> => {
    let baseParts: AiProcessablePart[] = [];
    try {
        // USE THE NEW ROBUST AI EXTRACTION
        // We can pass the full workbook file data. The extract function will handle finding the specific week.
        const extracted = await extractScheduleFromPdf(workbook.fileData, week);
        
        // Correct iteration to track section context
        let currentSectionContext = ParticipationType.VIDA_CRISTA; // Default init

        for (const item of extracted.parts) {
            if (item.type === 'SECTION_HEADER') {
                const titleLower = item.part.toLowerCase();
                if (titleLower.includes('tesouros')) currentSectionContext = ParticipationType.TESOUROS;
                else if (titleLower.includes('ministério')) currentSectionContext = ParticipationType.MINISTERIO;
                else if (titleLower.includes('vida cristã')) currentSectionContext = ParticipationType.VIDA_CRISTA;
                continue;
            }
            
            if (item.type === 'CÂNTICO' || item.part.toUpperCase().includes('TÉRMINO')) continue;

            const type = mapAiTypeToParticipationType(item.type, item.part, currentSectionContext);
            
            // Determine helper requirement
            let requiresHelper = PAIRABLE_PART_TYPES.includes(type) && !item.part.toLowerCase().includes('discurso');
            
            baseParts.push({
                partTitle: item.part,
                type: type,
                duration: item.min,
                requiresHelper: requiresHelper,
                assignedTo: undefined
            });
        }

        if (baseParts.length === 0) {
            console.warn(`Extração IA retornou 0 partes para a apostila: ${workbook.name}, semana: ${week}`);
        }
    } catch (error) {
        console.error(`Falha ao analisar o PDF "${workbook.name}" para a semana ${week} com IA.`, error);
        baseParts = []; 
    }
    
    const event = specialEvents.find(e => e.week === week);
    const template = event ? eventTemplates.find(t => t.id === event.templateId) : null;

    let finalParts = [...baseParts];

    if (event && template) {
        const { impact } = template;
        
        if (event.configuration?.timeReduction && event.configuration.timeReduction.minutes > 0) {
            const targetTypeToReduce = event.configuration.timeReduction.targetType;
            const targetPartIndex = finalParts.findIndex(p => p.type === targetTypeToReduce);
            if (targetPartIndex !== -1) {
                finalParts[targetPartIndex] = {
                    ...finalParts[targetPartIndex],
                    duration: (finalParts[targetPartIndex].duration || 30) - event.configuration.timeReduction.minutes,
                };
            }
        }

        const specialPart: AiProcessablePart = {
            partTitle: event.theme,
            type: ParticipationType.VIDA_CRISTA, 
            duration: event.duration,
            assignedTo: event.assignedTo, 
            requiresHelper: false, 
        };

        if (impact.action === 'REPLACE_PART' || impact.action === 'REPLACE_SECTION') {
            const targetTypes = new Set(Array.isArray(impact.targetType) ? impact.targetType : [impact.targetType]);
            finalParts = finalParts.filter(p => !targetTypes.has(p.type));
        }
        
        finalParts.push(specialPart);

        if (template.name.toLowerCase().includes('superintendente') && specialPart.assignedTo) {
            const finalCommentsPartIndex = finalParts.findIndex(p => p.type === ParticipationType.COMENTARIOS_FINAIS);
            if (finalCommentsPartIndex !== -1) {
                finalParts[finalCommentsPartIndex] = {
                    ...finalParts[finalCommentsPartIndex],
                    assignedTo: specialPart.assignedTo, 
                };
            }
        }
    }

    return finalParts.filter(p => (p.duration === undefined || p.duration > 0));
};

const responseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            partTitle: { type: Type.STRING },
            studentName: { type: Type.STRING },
            helperName: { type: Type.STRING }
        },
        required: ["partTitle", "studentName", "helperName"]
    }
};

export async function generateAiSchedule(
    workbook: Workbook,
    week: string,
    publishers: Publisher[],
    history: Participation[],
    rules: Rule[],
    specialEvents: SpecialEvent[],
    eventTemplates: EventTemplate[]
): Promise<AiScheduleResult[]> {
    try {
        const ai = getAiInstance();
        const partsToFill = await getPartsFromWorkbook(workbook, specialEvents, eventTemplates, week);
        
        if (partsToFill.length === 0) {
            throw new Error(`Não foram encontradas partes para a semana ${week}.`);
        }

        const meetingDate = calculatePartDate(week).split('T')[0];

        const presidentPartIndex = partsToFill.findIndex(p => p.type === ParticipationType.PRESIDENTE && !p.assignedTo);
        if (presidentPartIndex > -1) {
            const [presidentPart] = partsToFill.splice(presidentPartIndex, 1);
            partsToFill.unshift(presidentPart);
        }

        const availablePublishers = publishers.filter(p => p.isServing).map(p => {
            const lastAssignment = history.filter(h => normalizeName(h.publisherName) === normalizeName(p.name))
                                         .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            return {
                ...p,
                lastAssignmentDate: lastAssignment ? lastAssignment.week : 'nunca',
                privilegesText: Object.entries(p.privileges).filter(([, val]) => val).map(([key]) => key).join(', '),
                privilegesBySectionText: Object.entries(p.privilegesBySection).filter(([, val]) => val).map(([key]) => key).join(', '),
            };
        });

        const prompt = `
            Você é um assistente especialista em criar pautas. Preencha a pauta para a semana de "${week}", dia ${meetingDate}.

            **1. Designações:**
            ${partsToFill.map((p: AiProcessablePart) => `- Título: "${p.partTitle}", Tipo: ${p.type}, Requer Ajudante: ${p.requiresHelper ? 'Sim' : 'Não'} ${p.assignedTo ? `(Pré: ${p.assignedTo})` : ''}`).join('\n')}

            **2. Publicadores:**
            ${availablePublishers.map(p => `- Nome: ${p.name}, Gênero: ${p.gender}, Condição: ${p.condition}, Privilégios: [${p.privilegesText}], [${p.privilegesBySectionText}], Última: ${p.lastAssignmentDate}`).join('\n')}

            **Instruções:**
            - Respeite os privilégios estritamente.
            - Priorize quem fez partes há mais tempo.
            - Retorne JSON com partTitle idêntico.
        `;
        
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema } });
        
        let suggestedAssignments: { partTitle: string; studentName: string; helperName: string; }[];
        try {
            suggestedAssignments = JSON.parse(response.text.trim());
        } catch (parseError) {
            throw new Error("Formato inválido da IA.");
        }

        const validatedAssignments: AiScheduleResult[] = [];
        const publisherLookup = new Map<string, Publisher>();
        publishers.forEach(p => publisherLookup.set(normalizeName(p.name), p));
        
        for (const assignment of suggestedAssignments) {
            let part = partsToFill.find((p: AiProcessablePart) => p.partTitle === assignment.partTitle);
            
            if (!part) {
                 part = partsToFill.find(p => p.partTitle.includes(assignment.partTitle) || assignment.partTitle.includes(p.partTitle));
            }
            
            if (!part) continue;
            
            if (part.type === ParticipationType.CANTICO) {
                 validatedAssignments.push({ ...assignment, studentName: 'Congregação', helperName: null, reason: 'Cântico' });
                 continue;
            }

            const student = publisherLookup.get(normalizeName(assignment.studentName));
            const validation = student ? validateAssignment({ publisher: student, partType: part.type, partTitle: part.partTitle, meetingDate }, rules) : { isValid: false, reason: 'Publicador não encontrado' };
            
            validatedAssignments.push({ 
                ...assignment, 
                partTitle: part.partTitle,
                helperName: assignment.helperName === 'N/A' ? null : assignment.helperName,
                reason: validation.reason 
            });
        }
        return validatedAssignments;
    } catch (error) {
        throw new Error("Erro na geração com IA.");
    }
}

// --- NOVA LÓGICA DE EXTRAÇÃO DE PDF (STRATEGY PATTERN) ---

export interface ExtractedSchedule {
    header: string;
    parts: {
        part: string;
        min: number;
        type: 'CÂNTICO' | 'SECTION_HEADER' | 'DISCOURSE' | 'STUDENT_PART' | 'CLOSING' | 'BIBLE_STUDY';
    }[];
}

const weeksIdentificationSchema = {
    type: Type.OBJECT,
    properties: {
        weeks: {
            type: Type.ARRAY,
            description: "Lista das datas das semanas encontradas no documento (ex: '3-9 DE NOVEMBRO', '10-16 DE NOVEMBRO').",
            items: { type: Type.STRING }
        }
    },
    required: ["weeks"]
};

export async function identifyWeeksInPdf(base64Pdf: string): Promise<string[]> {
    try {
        const ai = getAiInstance();
        const prompt = `Liste todas as datas de semanas (ex: 3-9 de Novembro) encontradas nesta apostila. Retorne apenas a lista de strings.`;
        
        // Remove data prefix if present
        const cleanBase64 = base64Pdf.includes(',') ? base64Pdf.split(',')[1] : base64Pdf;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'application/pdf', data: cleanBase64 } }] }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: weeksIdentificationSchema,
            }
        });

        const result = JSON.parse(response.text.trim()) as { weeks: string[] };
        return result.weeks || [];

    } catch (error) {
        console.error("Erro ao identificar semanas com IA:", error);
        throw new Error("Falha ao ler as semanas do arquivo PDF.");
    }
}

const extractionSchema = {
    type: Type.OBJECT,
    properties: {
        header: {
            type: Type.STRING,
            description: "O cabeçalho da semana (ex: 3-9 DE NOVEMBRO | CÂNTICO DE SALOMÃO 1-2)."
        },
        parts: {
            type: Type.ARRAY,
            description: "Uma lista sequencial de todas as partes da reunião.",
            items: {
                type: Type.OBJECT,
                properties: {
                    part: { type: Type.STRING, description: "O título exato da parte." },
                    min: { type: Type.INTEGER, description: "Duração em minutos." },
                    type: { type: Type.STRING, description: "Classificação: 'CÂNTICO', 'SECTION_HEADER', 'DISCOURSE', 'STUDENT_PART', 'CLOSING', 'BIBLE_STUDY'." }
                },
                required: ["part", "min", "type"]
            }
        }
    },
    required: ["header", "parts"]
};

export async function extractScheduleFromPdf(base64Pdf: string, targetWeek?: string): Promise<ExtractedSchedule> {
    try {
        const ai = getAiInstance();
        const prompt = targetWeek 
            ? `Extraia a pauta DETALHADA APENAS para a semana de "${targetWeek}" deste documento. Ignore as outras semanas.`
            : `Extraia a pauta da primeira semana encontrada neste documento.`;
        
        const systemInstruction = `
            Você é um analista de pautas. Seu trabalho é extrair a programação de uma única semana da apostila.
            Siga estas regras de classificação rigorosamente:
            1. Extraia o Cabeçalho da Semana.
            2. Liste TODAS as partes em ordem cronológica.
            3. **Durações:**
               - CÂNTICOS: 3 min (sempre).
               - Comentários/Orações: 1 min.
               - Estudo Bíblico de Congregação: 30 min.
               - Outras partes: use o tempo indicado no texto (ex: 10 min).
            4. **Tipos (Classificação):**
               - 'SECTION_HEADER': Para 'TESOUROS DA PALAVRA DE DEUS', 'FAÇA SEU MELHOR NO MINISTÉRIO', 'NOSSA VIDA CRISTÃ', 'ENCERRAMENTO'.
               - 'CÂNTICO': Para todos os cânticos.
               - 'DISCOURSE': Para discursos de 10 min (Tesouros), 15 min (Vida Cristã), Necessidades Locais.
               - 'STUDENT_PART': Para 'Leitura da Bíblia' e partes do Ministério (Iniciando conversas, etc).
               - 'BIBLE_STUDY': Exclusivamente para o 'Estudo bíblico de congregação'.
               - 'CLOSING': Para Oração Final e Comentários Finais.
            5. A resposta deve ser um JSON estruturado.
        `;

        // Remove data prefix if present
        const cleanBase64 = base64Pdf.includes(',') ? base64Pdf.split(',')[1] : base64Pdf;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'application/pdf', data: cleanBase64 } }] }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: extractionSchema,
                systemInstruction: systemInstruction,
            }
        });

        const jsonStr = response.text.trim();
        return JSON.parse(jsonStr) as ExtractedSchedule;

    } catch (error) {
        console.error("Erro na extração de PDF via IA:", error);
        throw new Error("Falha ao processar o PDF com IA. Verifique se o arquivo é válido.");
    }
}
