import { ParticipationType } from '../types';

// pdfjsLib será injetado globalmente pela tag de script no index.html
declare const pdfjsLib: any;

type ParsedPart = { partTitle: string; type: ParticipationType; duration?: number; requiresHelper?: boolean; assignedTo?: string };

// ... (As funções de PDF base64/Binary mantêm-se iguais, focamos na lógica de texto abaixo)

/**
 * Converte uma string base64 para um Uint8Array de forma robusta.
 */
function b64toUint8Array(b64: string): Uint8Array {
    if (!b64) throw new Error("Conteúdo do arquivo PDF vazio.");
    const cleanBase64 = b64.includes(',') ? b64.split(',')[1] : b64;
    try {
        const binStr = atob(cleanBase64.replace(/\s/g, '')); 
        const len = binStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binStr.charCodeAt(i);
        }
        return bytes;
    } catch (e) {
        console.error("Erro ao decodificar Base64 do PDF:", e);
        throw new Error("O arquivo PDF parece estar corrompido ou inválido.");
    }
}

export function groupTextItemsIntoLines(items: any[]): string[] {
    if (!items || items.length === 0) return [];
    const sortedItems = [...items].sort((a, b) => {
        const y1 = a.transform[5]; const y2 = b.transform[5];
        if (Math.abs(y1 - y2) > 4) return y2 - y1; 
        return a.transform[4] - b.transform[4];
    });
    const lines: { text: string; y: number }[] = [];
    if (sortedItems.length === 0) return [];
    let currentLine: { items: any[] } = { items: [sortedItems[0]] };
    for (let i = 1; i < sortedItems.length; i++) {
        const prevItem = currentLine.items[currentLine.items.length - 1];
        const currentItem = sortedItems[i];
        if (Math.abs(prevItem.transform[5] - currentItem.transform[5]) < 6) {
            currentLine.items.push(currentItem);
        } else {
            lines.push({ text: currentLine.items.map(it => it.str).join(' '), y: prevItem.transform[5] });
            currentLine = { items: [currentItem] };
        }
    }
    lines.push({ text: currentLine.items.map(it => it.str).join(' '), y: currentLine.items[0].transform[5] });
    return lines.map(line => line.text.trim().replace(/\s+/g, ' '));
}

// --- LÓGICA DE TEXTO PURO (Baseada na estratégia aprovada) ---

function needsCounseling(partTitle: string): boolean {
    const ministryKeywords = [
        "Leitura da Bíblia",
        "Iniciando conversas",
        "Cultivando o interesse",
        "Fazendo discípulos",
        "Explicando suas crenças"
    ];
    // Remove numeração (ex: "3. Leitura...") para verificar
    const cleanTitle = partTitle.replace(/^\d+\.\s*/, '');
    return ministryKeywords.some(keyword => cleanTitle.includes(keyword));
}

export function parseScheduleFromPlainText(text: string): { week: string, parts: ParsedPart[] } {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const parts: ParsedPart[] = [];
    
    // 1. Identificar Semana
    // Procura padrões como "3-9 DE NOVEMBRO" ou "29 DE DEZEMBRO - 4 DE JANEIRO"
    const weekRegex = /(\d{1,2})\s*[-–—a]\s*(\d{1,2})\s+de\s+([a-zA-ZçÇ]+)|(\d{1,2})\s+de\s+([a-zA-ZçÇ]+)\s*[-–—a]\s*(\d{1,2})\s+de\s+([a-zA-ZçÇ]+)/i;
    let weekLabel = '';
    
    // Tenta encontrar a semana na primeira linha ou nas primeiras linhas
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
        const match = lines[i].match(weekRegex);
        if (match) {
            weekLabel = match[0].replace(/\s+/g, ' ').trim().toUpperCase();
            break;
        }
    }

    let currentSection: ParticipationType | null = null;
    
    // Partes Fixas Iniciais
    // Adiciona sempre, pois todo meeting tem. O componente de UI vai lidar com a atribuição.
    parts.push({ partTitle: 'Presidente', type: ParticipationType.PRESIDENTE, duration: 0 }); // Duration 0 = não conta no tempo cronometrado da parte em si
    parts.push({ partTitle: 'Oração Inicial', type: ParticipationType.ORACAO_INICIAL, duration: 1 });
    parts.push({ partTitle: 'Comentários Iniciais', type: ParticipationType.PRESIDENTE, duration: 1, assignedTo: 'Presidente' }); // Flag especial

    for (const line of lines) {
        const upperLine = line.toUpperCase();

        // --- Identificação de Seção ---
        if (upperLine.includes("TESOUROS DA PALAVRA DE DEUS")) {
            currentSection = ParticipationType.TESOUROS;
            continue;
        } else if (upperLine.includes("FAÇA SEU MELHOR NO MINISTÉRIO") || upperLine.includes("FAÇA SEU MELHOR NO MINISTERIO")) {
            currentSection = ParticipationType.MINISTERIO;
            continue;
        } else if (upperLine.includes("NOSSA VIDA CRISTÃ") || upperLine.includes("NOSSA VIDA CRISTA")) {
            currentSection = ParticipationType.VIDA_CRISTA;
            continue;
        } else if (upperLine.includes("ENCERRAMENTO")) {
            // Não precisamos mudar section para encerramento, tratamos as partes finais manualmente
            continue;
        }

        // --- Processamento de Linhas ---

        // 1. Cânticos
        if (line.match(/(?:^|•)\s*(?:Cântico|Cantico)\s+(\d+)/i)) {
            const songNum = line.match(/\d+/)?.[0] || '';
            parts.push({ partTitle: `Cântico ${songNum}`, type: ParticipationType.CANTICO, duration: 3 });
            continue;
        }

        // 2. Partes Numeradas com Duração (ex: "1. Título (10 min)")
        const partMatch = line.match(/^(\d\.)\s*(.*?)\s*\((\d+)\s*min\)/);
        if (partMatch && currentSection) {
            const [, num, rawTitle, durationStr] = partMatch;
            const cleanTitle = rawTitle.trim();
            const duration = parseInt(durationStr, 10);
            
            let type = currentSection;
            let requiresHelper = false;

            // Refinamento de Tipo
            if (currentSection === ParticipationType.VIDA_CRISTA && cleanTitle.toLowerCase().includes('estudo bíblico')) {
                type = ParticipationType.DIRIGENTE;
            }

            // Define se precisa de ajudante (Ministério)
            if (currentSection === ParticipationType.MINISTERIO) {
                // Discurso não precisa de ajudante, o resto geralmente sim
                if (!cleanTitle.toLowerCase().includes('discurso') && !cleanTitle.toLowerCase().includes('leitura da bíblia')) {
                    requiresHelper = true;
                }
            }

            parts.push({ 
                partTitle: cleanTitle, // Removemos o número para ficar limpo no banco, ou mantemos `${num} ${cleanTitle}` se preferir
                type, 
                duration,
                requiresHelper
            });

            // Regra de Aconselhamento (1 min após partes de estudante)
            if (needsCounseling(cleanTitle)) {
                parts.push({
                    partTitle: 'Aconselhamento',
                    type: ParticipationType.PRESIDENTE, // Tecnicamente feito pelo presidente
                    duration: 1,
                    assignedTo: 'Presidente' // Marca para o UI saber que é auto-atribuído
                });
            }
            continue;
        }
        
        // 3. Partes de Vida Cristã sem número (ex: Necessidades Locais)
        // O padrão é geralmente "7. Título (15 min)", mas às vezes Necessidades Locais não tem número em alguns textos copiados.
        // Se houver linha com "(XX min)" e não for numerada, pegamos também.
        if (currentSection === ParticipationType.VIDA_CRISTA && line.match(/\(\d+\s*min\)/)) {
             const durationMatch = line.match(/\((\d+)\s*min\)/);
             const duration = durationMatch ? parseInt(durationMatch[1], 10) : 10;
             const cleanTitle = line.replace(/\(\d+\s*min\)/, '').trim().replace(/^[\d\.]+\s*/, ''); // Tenta limpar
             
             // Evita duplicar se já pegou no regex numerado
             if (!parts.some(p => p.partTitle === cleanTitle)) {
                 let type = ParticipationType.VIDA_CRISTA;
                 if (cleanTitle.toLowerCase().includes('estudo bíblico')) type = ParticipationType.DIRIGENTE;
                 
                 parts.push({ partTitle: cleanTitle, type, duration });
             }
        }
    }

    // --- Partes Finais Fixas ---
    // Verifica se já temos Comentários Finais (algumas apostilas listam)
    if (!parts.some(p => p.type === ParticipationType.COMENTARIOS_FINAIS)) {
        parts.push({ partTitle: 'Comentários Finais', type: ParticipationType.COMENTARIOS_FINAIS, duration: 3, assignedTo: 'Presidente' });
    }
    
    // Garante Oração Final
    if (!parts.some(p => p.type === ParticipationType.ORACAO_FINAL)) {
        parts.push({ partTitle: 'Oração Final', type: ParticipationType.ORACAO_FINAL, duration: 1 });
    }
    
    // Adiciona Leitor se houver Dirigente
    const studyIndex = parts.findIndex(p => p.type === ParticipationType.DIRIGENTE);
    if (studyIndex !== -1 && !parts.some(p => p.type === ParticipationType.LEITOR)) {
        // Insere logo após o dirigente
        parts.splice(studyIndex + 1, 0, { partTitle: 'Leitor do EBC', type: ParticipationType.LEITOR, duration: 0 });
    }

    return { week: weekLabel, parts };
}

// Mantemos as funções antigas de PDF para não quebrar outras partes (HistoricalDataModal), 
// mas a Designação Manual agora usará parseScheduleFromPlainText.
export interface ExtractedWeek { id: string; label: string; pageIndex: number; content: any; }
export async function extractWeeksFromPdf(base64Pdf: string): Promise<ExtractedWeek[]> { return []; } // Placeholder/Legacy
export function parsePartsFromContent(pageContent: any): ParsedPart[] { return []; } // Placeholder/Legacy
export async function parseScheduleFromPdf(base64Pdf: string, targetWeekId: string): Promise<ParsedPart[]> { return []; } // Placeholder/Legacy
