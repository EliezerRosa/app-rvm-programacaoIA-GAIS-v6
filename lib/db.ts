import Dexie, { Table } from 'dexie';
import { Publisher, Participation, Workbook, Rule, SpecialEvent, ParticipationType, EventTemplate } from '../types';
import { calculatePartDate, generateUUID } from './utils';
import { initialParticipations } from './initialParticipations';
import { initialEventTemplates } from './initialEventTemplates';


// This is a more robust way to define the Dexie database, avoiding potential
// issues with subclassing in some build environments.
const db = new Dexie('CongregationDB') as Dexie & {
  publishers: Table<Publisher, string>;
  participations: Table<Participation, string>;
  workbooks: Table<Workbook, string>;
  rules: Table<Rule, string>;
  specialEvents: Table<SpecialEvent, string>;
  eventTemplates: Table<EventTemplate, string>;
};

// As versões 1-13 são mantidas para compatibilidade retroativa.
db.version(1).stores({ publishers: 'id, name', participations: 'id, week, publisherName', workbooks: 'id, name' });
db.version(2).stores({ publishers: 'id, name', participations: 'id, week, publisherName', workbooks: 'id, name', rules: 'id, isActive' });
db.version(3).stores({ publishers: 'id, name', participations: 'id, week, publisherName, date', workbooks: 'id, name', rules: 'id, isActive' });
db.version(4).stores({ publishers: 'id, name', participations: 'id, week, publisherName, date', workbooks: 'id, name', rules: 'id, isActive' });
db.version(5).stores({ publishers: 'id, name', participations: 'id, week, publisherName, date', workbooks: 'id, name', rules: 'id, isActive' });
db.version(6).stores({ publishers: 'id, name', participations: 'id, week, publisherName, date', workbooks: 'id, name', rules: 'id, isActive' });
db.version(7).stores({ publishers: 'id, name', participations: 'id, week, publisherName, date', workbooks: 'id, name', rules: 'id, isActive', specialEvents: 'id, week' });
db.version(8).stores({ publishers: 'id, name', participations: 'id, week, publisherName, date', workbooks: 'id, name', rules: 'id, isActive', specialEvents: 'id, week' });
db.version(9).stores({ publishers: 'id, name', participations: 'id, week, publisherName, date', workbooks: 'id, name', rules: 'id, isActive', specialEvents: 'id, week' }).upgrade(async (tx) => {
  const structuralPartsToAdd: Participation[] = [];
  const structuralTypes = [ParticipationType.CANTICO, ParticipationType.COMENTARIOS_FINAIS];
  const initialStructuralParts = initialParticipations.filter(p => structuralTypes.includes(p.type));

  for (const initialPart of initialStructuralParts) {
    const existingPart = await tx.table('participations').where({ week: initialPart.week, partTitle: initialPart.partTitle }).first();
    if (!existingPart) {
      structuralPartsToAdd.push({ ...initialPart, id: generateUUID() });
    }
  }

  if (structuralPartsToAdd.length > 0) {
    try {
        await tx.table('participations').bulkAdd(structuralPartsToAdd);
        console.log(`Patch de migração (v9): ${structuralPartsToAdd.length} partes estruturais restauradas.`);
    } catch (error) {
        console.error("Falha ao aplicar o patch de migração da versão 9:", error);
    }
  }
});
db.version(10).stores({ publishers: 'id, name', participations: 'id, week, publisherName, date', workbooks: 'id, name', rules: 'id, isActive', specialEvents: 'id, week' }).upgrade(async (tx) => {
  await tx.table('publishers').toCollection().modify(publisher => {
    if (publisher.isServing === undefined) publisher.isServing = true;
    if (publisher.ageGroup === undefined) publisher.ageGroup = 'Adulto';
    if (publisher.parentIds === undefined) publisher.parentIds = [];
    if (publisher.isHelperOnly === undefined) publisher.isHelperOnly = false;
    if (publisher.canPairWithNonParent === undefined) publisher.canPairWithNonParent = false;
    if (!publisher.privilegesBySection) {
      const isAppointed = ['Ancião', 'Servo Ministerial'].includes(publisher.condition);
      publisher.privilegesBySection = {
        canParticipateInTreasures: isAppointed || publisher.gender === 'brother',
        canParticipateInMinistry: true,
        canParticipateInLife: isAppointed || publisher.gender === 'brother',
      };
    }
    if (!publisher.availability) publisher.availability = { mode: 'always', exceptionDates: [] };
  });
  await tx.table('participations').toCollection().modify(p => { if (!p.date) p.date = calculatePartDate(p.week); });
});
db.version(11).stores({ publishers: 'id, name', participations: 'id, week, publisherName, date', workbooks: 'id, name', rules: 'id, isActive', specialEvents: 'id, week' }).upgrade(async (tx) => {
    await tx.table('specialEvents').toCollection().modify(event => {
        event.assignedTo = event.assignedTo || '';
        event.duration = event.duration || 30;
        if (event.assignmentRule) delete event.assignmentRule;
    });
});
db.version(12).stores({ publishers: 'id, name', participations: 'id, week, publisherName, date', workbooks: 'id, name', rules: 'id, isActive', specialEvents: 'id, week, type' }).upgrade(async (tx) => {
    await tx.table('specialEvents').toCollection().modify(event => {
        event.theme = event.name || 'Tema do Evento';
        delete event.name;
        event.type = (event.theme.toLowerCase().includes('superintendente') || (event.assignedTo && event.assignedTo.includes('(SC)'))) ? 'Visita do superintendente de circuito' : 'Boletins do corpo governante';
        event.configuration = {};
        delete event.replaces;
        delete event.description;
    });
});


// Versão 13: Introduz o sistema de Modelos de Evento.
db.version(13).stores({
  publishers: 'id, name',
  participations: 'id, week, publisherName, date',
  workbooks: 'id, name',
  rules: 'id, isActive',
  specialEvents: 'id, week, templateId',
  eventTemplates: 'id, name', // NOVA TABELA
}).upgrade(async (tx) => {
  console.log("Executando migração v13: Introduzindo Modelos de Evento...");

  // 1. Criar a nova tabela (já feito pelo 'stores') e populá-la com os modelos padrão.
  const templatesTable = tx.table('eventTemplates');
  await templatesTable.bulkAdd(initialEventTemplates);
  console.log(`${initialEventTemplates.length} modelos de evento iniciais adicionados.`);

  // 2. Mapear os tipos de evento antigos para os IDs dos novos modelos.
  const typeToTemplateIdMap: Record<string, string | undefined> = {};
  for (const template of initialEventTemplates) {
      typeToTemplateIdMap[template.name] = template.id;
  }

  // 3. Modificar a tabela 'specialEvents' para o novo formato.
  await tx.table('specialEvents').toCollection().modify(event => {
      const templateId = typeToTemplateIdMap[event.type];
      
      if (templateId) {
          event.templateId = templateId;
          // 'configuration' já deve existir da v12, mas garantimos que exista.
          event.configuration = event.configuration || {}; 
      } else {
          // Se não encontrar um mapeamento, usa um modelo genérico ou marca para revisão manual.
          // Aqui, vamos apenas usar o primeiro modelo como fallback.
          event.templateId = initialEventTemplates[0].id;
          console.warn(`Evento especial com tipo desconhecido '${event.type}' foi mapeado para um modelo padrão.`);
      }
      
      // Remove o campo 'type' antigo.
      delete event.type;
  });
  console.log("Tabela 'specialEvents' migrada para o novo formato com templateId.");
});

// Versão 14: Adiciona o campo de apelidos (aliases) aos publicadores.
db.version(14).stores({
  publishers: 'id, name',
  participations: 'id, week, publisherName, date',
  workbooks: 'id, name',
  rules: 'id, isActive',
  specialEvents: 'id, week, templateId',
  eventTemplates: 'id, name',
}).upgrade(async (tx) => {
    await tx.table('publishers').toCollection().modify(publisher => {
        if (publisher.aliases === undefined) {
            publisher.aliases = [];
        }
    });
});

// Versão 15: Renomeia apostilas de exemplo para evitar confusão com uploads reais.
db.version(15).stores({
  publishers: 'id, name',
  participations: 'id, week, publisherName, date',
  workbooks: 'id, name',
  rules: 'id, isActive',
  specialEvents: 'id, week, templateId',
  eventTemplates: 'id, name',
}).upgrade(async (tx) => {
    await tx.table('workbooks').toCollection().modify(wb => {
        // Identifica se é o arquivo de exemplo pelo tamanho muito pequeno do base64 (< 1000 caracteres)
        // Os PDFs reais têm MBs de tamanho.
        if (wb.fileData && wb.fileData.length < 2000 && !wb.name.includes('[DEMO]')) {
            wb.name = `[DEMO] ${wb.name}`;
        }
    });
    console.log("Migração v15: Apostilas de exemplo renomeadas.");
});

// Versão 16: Corrige e reforça a regra de Presidente para usar o privilégio 'canPreside'.
db.version(16).stores({
  publishers: 'id, name',
  participations: 'id, week, publisherName, date',
  workbooks: 'id, name',
  rules: 'id, isActive',
  specialEvents: 'id, week, templateId',
  eventTemplates: 'id, name',
}).upgrade(async (tx) => {
    // 1. Remove regras antigas ou duplicadas sobre presidência para limpar o terreno
    await tx.table('rules')
        .filter(rule => rule.description.toLowerCase().includes('presidir') || rule.description.toLowerCase().includes('presidente'))
        .delete();

    // 2. Adiciona a regra correta e estrita
    const newRule: Rule = {
        id: generateUUID(),
        description: 'Apenas irmãos qualificados com o privilégio "Pode Presidir" podem ser Presidentes.',
        isActive: true,
        conditions: [
            { fact: 'partType', operator: 'equal', value: ParticipationType.PRESIDENTE },
            // A regra é violada se for Presidente E o privilégio canPreside for falso
            { fact: 'canPreside', operator: 'equal', value: false } 
        ]
    };
    
    await tx.table('rules').add(newRule);
    console.log("Migração v16: Regra de Presidente corrigida para usar privilégio 'canPreside'.");
});

// Versão 17: Reforço definitivo da regra de Presidente (Limpeza total de regras conflitantes)
db.version(17).stores({
  publishers: 'id, name',
  participations: 'id, week, publisherName, date',
  workbooks: 'id, name',
  rules: 'id, isActive',
  specialEvents: 'id, week, templateId',
  eventTemplates: 'id, name',
}).upgrade(async (tx) => {
    // 1. Limpeza Agressiva: Remove QUALQUER regra que mencione "presidente" ou "presidir" para evitar conflitos de regras antigas
    await tx.table('rules')
        .filter(rule => rule.description.toLowerCase().includes('presidir') || rule.description.toLowerCase().includes('presidente'))
        .delete();

    // 2. Inserção da Regra Canônica
    const strictPresidentRule: Rule = {
        id: generateUUID(),
        description: 'Apenas irmãos com a caixa "Pode Presidir" marcada no cadastro podem ser Presidentes.',
        isActive: true,
        conditions: [
            { fact: 'partType', operator: 'equal', value: ParticipationType.PRESIDENTE },
            { fact: 'canPreside', operator: 'equal', value: false } 
        ]
    };
    
    await tx.table('rules').add(strictPresidentRule);
    console.log("Migração v17: Regras de Presidente limpas e redefinidas para estrita verificação de privilégio.");
});


export { db };