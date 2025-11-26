import { MeetingData, Participation, ParticipationType, Publisher, SpecialEvent, EventTemplate, EventImpact } from '../types';

export type RenderablePart = Participation & { pair?: Participation };

export const ministrySubOrder = ["Iniciando conversas", "Cultivando o interesse", "Fazendo discípulos", "Explicando suas crenças", "Discurso"];

export interface TimedEvent {
    id: string;
    startTime: string;
    partTitle: string;
    publisherName: string;
    durationText: string;
    sectionType: ParticipationType | 'OPENING' | 'TRANSITION' | 'CLOSING' | 'COMMENTS';
    isCounseling?: boolean;
}

function applyEventImpact(
    parts: RenderablePart[], 
    event: SpecialEvent, 
    template: EventTemplate
): RenderablePart[] {
    const { impact } = template;
    const { configuration } = event;

    let modifiedParts = [...parts];
    
    // 1. Aplicar redução de tempo, se houver
    if (configuration.timeReduction && configuration.timeReduction.minutes > 0) {
        const targetIndex = modifiedParts.findIndex(p => p.type === configuration.timeReduction!.targetType);
        if (targetIndex !== -1) {
            modifiedParts[targetIndex] = {
                ...modifiedParts[targetIndex],
                duration: (modifiedParts[targetIndex].duration || 30) - configuration.timeReduction.minutes,
            };
        }
    }

    const specialPart: RenderablePart = {
        id: event.id,
        publisherName: event.assignedTo,
        week: event.week,
        partTitle: event.theme,
        type: ParticipationType.VIDA_CRISTA,
        duration: event.duration,
        date: new Date().toISOString()
    };
    
    // 2. Aplicar impacto principal do template
    switch (impact.action) {
        case 'REPLACE_PART':
            const targetType = Array.isArray(impact.targetType) ? impact.targetType[0] : impact.targetType;
            const partIndexToReplace = modifiedParts.findIndex(p => p.type === targetType);
            if (partIndexToReplace !== -1) {
                modifiedParts.splice(partIndexToReplace, 1, specialPart);
            } else {
                 // Fallback: se a parte alvo não existe, adiciona no final da seção Vida Cristã
                 const lastLifePartIndex = modifiedParts.map(p=>p.type).lastIndexOf(ParticipationType.VIDA_CRISTA);
                 modifiedParts.splice(lastLifePartIndex + 1, 0, specialPart);
            }
            break;
        case 'REPLACE_SECTION':
            const targetTypes = new Set(impact.targetType as ParticipationType[]);
            modifiedParts = modifiedParts.filter(p => !targetTypes.has(p.type));
            modifiedParts.push(specialPart);
            break;
        case 'ADD_PART':
             const studyIndex = modifiedParts.findIndex(p => p.type === ParticipationType.DIRIGENTE);
             if (studyIndex > -1) {
                 modifiedParts.splice(studyIndex, 0, specialPart);
             } else {
                 modifiedParts.push(specialPart);
             }
            break;
    }
    
    // 3. Aplicar regras especiais (como reatribuição)
    if (template.name.toLowerCase().includes('superintendente')) {
        const finalCommentsIndex = modifiedParts.findIndex(p => p.type === ParticipationType.COMENTARIOS_FINAIS);
        if(finalCommentsIndex > -1) {
            modifiedParts[finalCommentsIndex] = { ...modifiedParts[finalCommentsIndex], publisherName: event.assignedTo };
        }
    }

    return modifiedParts;
}


export function getFullScheduleWithTimings(meetingData: MeetingData, publishers: Publisher[], specialEvents: SpecialEvent[], eventTemplates: EventTemplate[]): TimedEvent[] {
    const timedEvents: TimedEvent[] = [];
    let currentTime = new Date();
    currentTime.setHours(19, 30, 0, 0);

    const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60000);
    const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const eventForWeek = specialEvents.find(e => e.week === meetingData.week);
    const templateForEvent = eventForWeek ? eventTemplates.find(t => t.id === eventForWeek.templateId) : undefined;
    
    let parts = [...meetingData.parts];

    const processPart = (
        part: Participation | RenderablePart,
        sectionType: TimedEvent['sectionType'],
        defaultDuration: number,
        partNumber?: number
    ) => {
        let title = part.partTitle;
        let name = part.publisherName;
        let duration = part.duration ?? defaultDuration;

        if (part.type === ParticipationType.CANTICO) duration = 3;
        if (part.type === ParticipationType.COMENTARIOS_FINAIS) duration = 3;
        if (part.type === ParticipationType.ORACAO_INICIAL || part.type === ParticipationType.ORACAO_FINAL) duration = 1;
        
        if ('pair' in part && part.pair) {
            name = `${part.publisherName} / ${part.pair.publisherName}`;
        }

        timedEvents.push({
            id: part.id,
            startTime: formatTime(currentTime),
            partTitle: partNumber ? `${partNumber}. ${title}` : title,
            publisherName: name,
            durationText: duration > 0 ? `(${duration} min)` : '',
            sectionType: sectionType
        });

        currentTime = addMinutes(currentTime, duration);
    };
    
    const president = parts.find(p => p.type === ParticipationType.PRESIDENTE);
    const openingPrayer = parts.find(p => p.type === ParticipationType.ORACAO_INICIAL);
    const closingPrayer = parts.find(p => p.type === ParticipationType.ORACAO_FINAL);
    const allSongs = parts.filter(p => p.type === ParticipationType.CANTICO);
    const openingSong = allSongs[0];
    const middleSong = allSongs[1];
    const finalSong = allSongs[2];

    let mainParts = getOrderedAndPairedParts(parts, publishers);
    
    if (eventForWeek && templateForEvent) {
        mainParts = applyEventImpact(mainParts, eventForWeek, templateForEvent);
    }
    
    const finalCommentsPart = mainParts.find(p => p.type === ParticipationType.COMENTARIOS_FINAIS);
    const treasuresParts = mainParts.filter(p => p.type === ParticipationType.TESOUROS);
    const ministryParts = mainParts.filter(p => p.type === ParticipationType.MINISTERIO);
    const lifeParts = mainParts.filter(p => p.type === ParticipationType.VIDA_CRISTA || p.type === ParticipationType.DIRIGENTE);
    
    let partCounter = 1;

    // Build Chronological Schedule
    if (openingSong) processPart(openingSong, 'OPENING', 3);
    if (openingPrayer) processPart(openingPrayer, 'OPENING', 1);

    if (president) {
        timedEvents.push({ id: `initial-comments-${president.id}`, startTime: formatTime(currentTime), partTitle: 'Comentários Iniciais', publisherName: president.publisherName, durationText: '(1 min)', sectionType: 'COMMENTS' });
        currentTime = addMinutes(currentTime, 1);
    }
    
    treasuresParts.forEach(p => {
        processPart(p, ParticipationType.TESOUROS, 10, partCounter++);
        const isBibleReading = p.partTitle.toLowerCase().includes('leitura da bíblia');
        if (isBibleReading && president) {
             timedEvents.push({ id: `counsel-${p.id}`, startTime: formatTime(currentTime), partTitle: 'Aconselhamento', publisherName: president.publisherName, durationText: '(1 min)', sectionType: ParticipationType.TESOUROS, isCounseling: true });
            currentTime = addMinutes(currentTime, 1);
        }
    });

    if (middleSong) processPart(middleSong, 'TRANSITION', 3);
    
    ministryParts.forEach(p => {
        processPart(p, ParticipationType.MINISTERIO, 5, partCounter++);
         if (president) {
             timedEvents.push({ id: `counsel-${p.id}`, startTime: formatTime(currentTime), partTitle: 'Aconselhamento', publisherName: president.publisherName, durationText: '(1 min)', sectionType: ParticipationType.MINISTERIO, isCounseling: true });
            currentTime = addMinutes(currentTime, 1);
        }
    });

    // Sort life parts to ensure study is last if present
    lifeParts.sort((a,b) => (a.type === ParticipationType.DIRIGENTE ? 1 : -1) - (b.type === ParticipationType.DIRIGENTE ? 1: -1) ).forEach(p => processPart(p, p.type, 15, partCounter++));
    
    // FIX: Removed the block that was mutating the part title, causing cumulative numbering.
    // The processPart function below correctly handles the numbering without mutation.

    if (finalCommentsPart) processPart(finalCommentsPart, 'CLOSING', 3, partCounter++);
    if (finalSong) processPart(finalSong, 'CLOSING', 3);
    if (closingPrayer) processPart(closingPrayer, 'CLOSING', 1);

    return timedEvents;
}


export function getOrderedAndPairedParts(parts: Participation[], publishers: Publisher[]): RenderablePart[] {
    const paired: RenderablePart[] = [];
    const usedPairIds = new Set<string>();

    for (const currentPart of parts) {
        if (usedPairIds.has(currentPart.id) || [ParticipationType.AJUDANTE, ParticipationType.LEITOR].includes(currentPart.type)) {
            continue;
        }
        
        if (currentPart.type === ParticipationType.MINISTERIO && !currentPart.partTitle.toLowerCase().includes('discurso')) {
            const helper = parts.find(p => p.type === ParticipationType.AJUDANTE && !usedPairIds.has(p.id));
            if (helper) {
                paired.push({ ...currentPart, pair: helper });
                usedPairIds.add(helper.id);
            } else {
                paired.push(currentPart);
            }
        } else if (currentPart.type === ParticipationType.DIRIGENTE) {
            const reader = parts.find(p => p.type === ParticipationType.LEITOR && !usedPairIds.has(p.id));
            if (reader) {
                paired.push({ ...currentPart, pair: reader });
                usedPairIds.add(reader.id);
            } else {
                paired.push(currentPart);
            }
        } else {
             paired.push(currentPart);
        }
    }

    return paired.filter(p => [
        ParticipationType.TESOUROS, ParticipationType.MINISTERIO, ParticipationType.VIDA_CRISTA, 
        ParticipationType.DIRIGENTE, ParticipationType.COMENTARIOS_FINAIS
    ].includes(p.type));
}