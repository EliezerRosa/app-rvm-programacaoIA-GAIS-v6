
import { db } from './db';
import { Publisher, Participation, Workbook, Rule, SpecialEvent, EventTemplate } from '../types';
import { initialPublishers } from './initialData';
import { initialParticipations } from './initialParticipations';
import { initialWorkbooks } from './initialWorkbooks';
import { initialRules } from './initialRules';
import { initialSpecialEvents } from './initialSpecialEvents';
import { initialEventTemplates } from './initialEventTemplates';

// --- Seeding Function ---
export const initStorage = async () => {
    try {
        await db.open();

        const publisherCount = await db.publishers.count();
        if (publisherCount > 0) {
            console.log("Banco de dados já populado. Ignorando carregamento de dados iniciais.");
             // Garante que a tabela de templates seja populada mesmo em bancos de dados existentes
            const templateCount = await db.eventTemplates.count();
            if (templateCount === 0) {
                console.log("Populando tabela de modelos de evento...");
                await db.eventTemplates.bulkAdd(initialEventTemplates);
            }
            return;
        }

        console.log("Banco de dados vazio. Realizando o carregamento inicial de dados.");
        
        await db.publishers.bulkAdd(initialPublishers);
        await db.participations.bulkAdd(initialParticipations);
        await db.workbooks.bulkAdd(initialWorkbooks);
        await db.rules.bulkAdd(initialRules);
        await db.eventTemplates.bulkAdd(initialEventTemplates);
        await db.specialEvents.bulkAdd(initialSpecialEvents);
        
    } catch (e) {
        console.error("Falha ao inicializar o armazenamento:", e);
    }
};


// --- Getter Functions ---
export const getAllPublishers = () => db.publishers.toArray();
export const getAllParticipations = () => db.participations.toArray();
export const getAllWorkbooks = () => db.workbooks.toArray();
export const getAllRules = () => db.rules.toArray();
export const getAllSpecialEvents = () => db.specialEvents.toArray();
export const getAllEventTemplates = () => db.eventTemplates.toArray();

export const getAllData = async () => {
    const [publishers, participations, workbooks, rules, specialEvents, eventTemplates] = await Promise.all([
        getAllPublishers(),
        getAllParticipations(),
        getAllWorkbooks(),
        getAllRules(),
        getAllSpecialEvents(),
        getAllEventTemplates(),
    ]);
    return { publishers, participations, workbooks, rules, specialEvents, eventTemplates };
}

// --- Publisher Functions ---
export const savePublisher = (publisher: Publisher) => db.publishers.put(publisher);
export const deletePublisher = (id: string) => db.publishers.delete(id);

// --- Participation Functions ---
export const saveParticipation = (participation: Participation) => db.participations.put(participation);
export const saveParticipationsBulk = (participations: Participation[]) => db.participations.bulkPut(participations);
export const deleteParticipation = (id: string) => db.participations.delete(id);
export const deleteParticipationsByWeek = (week: string) => db.participations.where('week').equals(week).delete();


// --- Workbook Functions ---
export const saveWorkbook = (workbook: Workbook) => db.workbooks.put(workbook);
export const deleteWorkbook = (id: string) => db.workbooks.delete(id);

// --- Rule Functions ---
export const saveRule = (rule: Rule) => db.rules.put(rule);
export const deleteRule = (id: string) => db.rules.delete(id);

// --- Special Event Functions ---
export const saveSpecialEvent = (event: SpecialEvent) => db.specialEvents.put(event);
export const deleteSpecialEvent = (id: string) => db.specialEvents.delete(id);

// --- Event Template Functions ---
export const saveEventTemplate = (template: EventTemplate) => db.eventTemplates.put(template);
export const deleteEventTemplate = (id: string) => db.eventTemplates.delete(id);

// --- Data Management Functions ---
export const clearAllData = async () => {
    await Promise.all([
        db.publishers.clear(),
        db.participations.clear(),
        db.workbooks.clear(),
        db.rules.clear(),
        db.specialEvents.clear(),
        db.eventTemplates.clear(),
    ]);
};