import { ParticipationType, Publisher, ValidationResponse } from '../types';

// A simple UUID v4 generator.
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const monthMap: { [key: string]: number } = {
    'JAN': 0, 'JANEIRO': 0,
    'FEV': 1, 'FEVEREIRO': 1,
    'MAR': 2, 'MARÇO': 2,
    'ABR': 3, 'ABRIL': 3,
    'MAI': 4, 'MAIO': 4,
    'JUN': 5, 'JUNHO': 5,
    'JUL': 6, 'JULHO': 6,
    'AGO': 7, 'AGOSTO': 7,
    'SET': 8, 'SETEMBRO': 8,
    'OUT': 9, 'OUTUBRO': 9,
    'NOV': 10, 'NOVEMBRO': 10,
    'DEZ': 11, 'DEZEMBRO': 11
};
const monthAbbrUpper: string[] = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

/**
 * Remove caracteres invisíveis, normaliza espaços e traços.
 * Fundamental para limpar strings vindas de PDFs.
 */
export const cleanString = (str: string): string => {
    if (!str) return "";
    return str
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ') // Remove zero-width e non-breaking spaces
        .replace(/[–—]/g, '-') // Normaliza travessões para hífen comum
        .replace(/\s+/g, ' ') // Normaliza múltiplos espaços para um único
        .trim();
};

// Function to correctly parse Portuguese week strings into Date objects for sorting
// fallbackYear is optional: used when the string itself doesn't contain the year (common in PDFs)
export const parseWeekDate = (weekString: string, fallbackYear?: number): Date => {
    if (!weekString) return new Date(0);

    const cleaned = cleanString(weekString).toUpperCase().replace(/[,.]/g, '');

    // Check if it's already an ISO date (YYYY-MM-DD)
    if (cleaned.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(cleaned + 'T00:00:00Z');
    }

    // 1. Try to find an explicit year (4 digits starting with 20) anywhere in the string
    const yearMatch = cleaned.match(/\b(20\d{2})\b/);
    let year = yearMatch ? parseInt(yearMatch[1], 10) : fallbackYear;

    // 2. Extract Day and Month
    // Regex looks for "DD-DD" or "DD a DD" followed by Month
    const parts = cleaned.split(' ');
    
    const dayPart = parts.find(p => p.match(/^\d{1,2}-\d{1,2}$/)) || parts[0];
    const startDay = parseInt(dayPart.split('-')[0], 10);

    if (isNaN(startDay)) return new Date(0);

    // Find month
    let month: number | undefined;
    for (const part of parts) {
        if (monthMap[part] !== undefined) {
            month = monthMap[part];
            break;
        }
    }

    if (month === undefined) return new Date(0);

    // 3. Year Inference (if not found explicitly or via fallback)
    if (!year) {
        const today = new Date();
        const currentYear = today.getUTCFullYear();
        
        // Heurística: Se estamos em DEZ e a data é JAN, provavelmente é o próximo ano.
        // Se estamos em JAN e a data é DEZ, provavelmente é o ano anterior.
        // Caso contrário, assume o ano atual.
        if (today.getUTCMonth() >= 10 && month <= 1) {
            year = currentYear + 1;
        } else if (today.getUTCMonth() <= 1 && month >= 10) {
            year = currentYear - 1;
        } else {
            year = currentYear;
        }
    }

    // Return UTC Date for the Monday of that week
    return new Date(Date.UTC(year, month, startDay));
};

/**
 * Calculates the specific meeting date (Wednesday or Thursday) based on the week string.
 * @param weekId The string representing the meeting week (ISO Date or Legacy String).
 * @returns An ISO date string for the calculated meeting day.
 */
export const calculatePartDate = (weekId: string): string => {
    const startDate = parseWeekDate(weekId);

    // parseWeekDate returns a date at UTC epoch (time 0) on failure
    if (startDate.getTime() === 0) { 
        return new Date(0).toISOString();
    }
    
    const year = startDate.getUTCFullYear();
    
    // The meeting is during the week that starts on Monday.
    // Wednesday is 3, Thursday is 4 (Sunday=0, Monday=1, ...)
    const targetDayOfWeek = year % 2 !== 0 ? 3 : 4; // Odd year -> Wednesday, Even year -> Thursday

    // Assuming the week always starts on Monday (day 1), we find the difference.
    const dayDifference = targetDayOfWeek - 1; // e.g., for Wednesday (3), diff is 2 from Monday (1)

    const meetingDate = new Date(startDate.getTime()); // Create a copy to avoid mutation
    meetingDate.setUTCDate(startDate.getUTCDate() + dayDifference);

    return meetingDate.toISOString();
};


/**
 * Opens a new browser tab and writes the provided HTML content to it.
 * @param htmlContent The full HTML string to be displayed.
 */
export const openHtmlInNewTab = (htmlContent: string): void => {
    const newWindow = window.open("", "_blank");
    if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
    } else {
        alert("Não foi possível abrir a nova aba. Por favor, verifique se o seu navegador está bloqueando pop-ups.");
    }
};

// NOVO: Define os tipos de parte que exigem um par (estudante/ajudante).
export const PAIRABLE_PART_TYPES = [
    ParticipationType.MINISTERIO,
];

// NOVO: Valida as regras de segurança para pareamento, especialmente para crianças.
export const validatePairing = (student: Publisher, helper: Publisher): ValidationResponse => {
    if (student.ageGroup === 'Criança') {
        const isParent = student.parentIds.includes(helper.id);
        const isAdult = helper.ageGroup === 'Adulto';

        if (isParent) {
            return { isValid: true, reason: '' }; // Pareamento com pai/mãe é sempre válido.
        }

        if (student.canPairWithNonParent && isAdult) {
            return { isValid: true, reason: '' }; // Pareamento com adulto autorizado é válido.
        }

        if (!student.canPairWithNonParent) {
            return { isValid: false, reason: `Crianças só podem ter um dos pais como ajudante. Autorização para terceiros não concedida.` };
        }

        if (!isAdult) {
            return { isValid: false, reason: `O ajudante de uma criança deve ser um adulto.` };
        }
    }
    return { isValid: true, reason: '' }; // Para adultos e jovens, qualquer pareamento é válido.
};


function getFirstMonday(date: Date) {
    const day = date.getUTCDay();
    const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(date.setUTCDate(diff));
}

function formatDateRange(startDate: Date): string {
    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 6);

    const startDay = startDate.getUTCDate();
    const endDay = endDate.getUTCDate();
    const startMonth = monthAbbrUpper[startDate.getUTCMonth()];
    const endMonth = monthAbbrUpper[endDate.getUTCMonth()];
    const startYear = startDate.getUTCFullYear();
    const endYear = endDate.getUTCFullYear();

    if (startMonth === endMonth) {
        return `${startDay}-${endDay} de ${startMonth}, ${startYear}`;
    } else if (startYear === endYear) {
        return `${startDay} de ${startMonth} - ${endDay} de ${endMonth}, ${startYear}`;
    } else {
        return `${startDay} de ${startMonth}, ${startYear} - ${endDay} de ${endMonth}, ${endYear}`;
    }
}

/**
 * Converte um ID de semana (que pode ser ISO ou legado) para o formato visual amigável.
 * Ex: '2025-11-03' -> '3-9 de NOV, 2025'
 */
export function formatWeekIdToLabel(weekId: string): string {
    // Se for formato legado (contém espaços ou vírgulas), retorna como está
    if (weekId.includes(' ') || weekId.includes(',')) return weekId;

    // Se for formato ISO, formata
    const date = parseWeekDate(weekId);
    if (date.getTime() === 0) return weekId; // Falha no parse

    return formatDateRange(date);
}

/**
 * Gera as semanas disponíveis para uma apostila.
 * Retorna um objeto contendo o ID (data ISO da segunda-feira) e o Label (texto formatado).
 */
export function generateWeeksForWorkbook(workbookName: string): { id: string, label: string }[] {
    const nameMatch = workbookName.match(/(\w+)\/(\w+)\s+(\d{4})/i);
    if (!nameMatch) return [];

    const [, startMonthStr, endMonthStr, yearStr] = nameMatch;
    const year = parseInt(yearStr, 10);
    const startMonthIndex = monthMap[startMonthStr.toUpperCase()];
    const endMonthIndex = monthMap[endMonthStr.toUpperCase()];

    if (startMonthIndex === undefined || endMonthIndex === undefined) return [];

    const startDate = new Date(Date.UTC(year, startMonthIndex, 1));
    const endDate = new Date(Date.UTC(year, endMonthIndex + 1, 0)); // Last day of end month

    const weeks: { id: string, label: string }[] = [];
    let currentMonday = getFirstMonday(startDate);

    while (currentMonday <= endDate) {
        const id = currentMonday.toISOString().split('T')[0]; // YYYY-MM-DD
        weeks.push({
            id: id,
            label: formatDateRange(currentMonday)
        });
        currentMonday.setUTCDate(currentMonday.getUTCDate() + 7);
    }

    return weeks;
}

export function inferParticipationType(partTitle: string): ParticipationType {
    const title = partTitle.toLowerCase();

    if (title.includes('presidente')) return ParticipationType.PRESIDENTE;
    if (title.includes('oração inicial')) return ParticipationType.ORACAO_INICIAL;
    if (title.includes('oração final')) return ParticipationType.ORACAO_FINAL;
    if (title.includes('cântico')) return ParticipationType.CANTICO;
    if (title.includes('comentários finais')) return ParticipationType.COMENTARIOS_FINAIS;
    if (title.includes('ajudante')) return ParticipationType.AJUDANTE;

    // Tesouros
    if (title.includes('leitura da bíblia') || title.includes('joias espirituais')) {
        return ParticipationType.TESOUROS;
    }
    
    // Ministério
    if (title.includes('iniciando conversas') || title.includes('cultivando o interesse') || title.includes('fazendo discípulos') || title.includes('explicando suas crenças') || title.includes('discurso')) {
        return ParticipationType.MINISTERIO;
    }

    // Vida Cristã
    if (title.includes('estudo bíblico de congregação')) {
        return ParticipationType.DIRIGENTE;
    }
    
    // Fallback based on keywords
    const treasuresKeywords = ['tesouros', 'pacto', 'salvador', 'agradeçam', 'rei jesus', 'retribuir', 'caminho', 'perseverar', 'sofrimento'];
    if (treasuresKeywords.some(kw => title.includes(kw))) {
        return ParticipationType.TESOUROS;
    }

    const lifeKeywords = ['amor', 'dinheiro', 'promessas', 'necessidades locais', 'organização', 'sofrer'];
    if (lifeKeywords.some(kw => title.includes(kw))) {
        return ParticipationType.VIDA_CRISTA;
    }
    
    // Default fallback
    return ParticipationType.VIDA_CRISTA;
}

export function normalizeName(name: string): string {
    if (!name) return '';
    return name
        .toLowerCase()
        .normalize("NFD") // Decompose accented characters into base characters and diacritics
        .replace(/[\u0300-\u036f]/g, ""); // Remove the diacritical marks
}