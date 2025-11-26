
import { ManualAssignmentState } from '../components/ManualAssignment';
import { Publisher, ParticipationType, Rule } from '../types';
import { initialPublishers } from './initialData';
import { initialRules } from './initialRules';

// PDF Base64 Válido (Pequeno, apenas para teste de fluxo)
const MOCK_PDF_BASE64 = "JVBERi0xLjcKJcPDgw0KMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkcyBbMyAwIFJdPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9SZXNvdXJjZXM8PC9Gb250PDwvRjEgNCAwIFI+Pj4+L01lZGlhQm94WzAgMCA1OTUgODQyXS9Db250ZW50cyA1IDAgUj4+CmVuZG9iago0IDAgb2JqCjw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+CmVuZG9iago1IDAgb2JqCjw8L0xlbmd0aCA3MT4+CnN0cmVhbQpCVCAvRjEgMTIgVGYgNzIgNzcwIFRkIChBcG9zdGlsYSBkZSBFeGVtcGxvIC0gVmlkYSBlIE1pbmlzdGVyaW8pIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE5IDAwMDAwIG4gCjAwMDAwMDAwNzQgMDAwMDAwIG4gCjAwMDAwMDAxMjEgMDAwMDAwIG4gCjAwMDAwMDAyNzAgMDAwMDAwIG4gCjAwMDAwMDAzNDEgMDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA2L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKNDQxCiUlRU9GCg==";

export const HARDCODED_MANUAL_STATE: ManualAssignmentState = {
    file: null, // File object cannot be hardcoded, will be null but base64 handles logic
    fileBase64: MOCK_PDF_BASE64,
    availableWeeks: ['4-10 de NOVEMBRO', '11-17 de NOVEMBRO', '18-24 de NOVEMBRO'],
    weekLabel: '4-10 de NOVEMBRO',
    parts: [
        { id: 'part-0', partTitle: 'Presidente', type: ParticipationType.PRESIDENTE, duration: 0, requiresHelper: false },
        { id: 'part-1', partTitle: 'Oração Inicial', type: ParticipationType.ORACAO_INICIAL, duration: 1, requiresHelper: false, preAssignedTo: 'Presidente' },
        { id: 'part-2', partTitle: 'Tesouros - Discurso', type: ParticipationType.TESOUROS, duration: 10, requiresHelper: false },
        { id: 'part-3', partTitle: 'Joias Espirituais', type: ParticipationType.TESOUROS, duration: 10, requiresHelper: false },
        { id: 'part-4', partTitle: 'Leitura da Bíblia', type: ParticipationType.TESOUROS, duration: 4, requiresHelper: false },
        { id: 'part-5', partTitle: 'Iniciando Conversas', type: ParticipationType.MINISTERIO, duration: 3, requiresHelper: true },
        { id: 'part-6', partTitle: 'Cultivando Interesse', type: ParticipationType.MINISTERIO, duration: 4, requiresHelper: true },
        { id: 'part-7', partTitle: 'Estudo Bíblico', type: ParticipationType.DIRIGENTE, duration: 30, requiresHelper: false },
        { id: 'part-8', partTitle: 'Leitor do EBC', type: ParticipationType.LEITOR, duration: 0, requiresHelper: false },
    ],
    assignments: {
        'part-0': { studentId: 'anc1', helperId: undefined }, // Diego Fontana
        'part-1': { studentId: 'anc1', helperId: undefined }, // Diego Fontana
        'part-2': { studentId: 'anc2', helperId: undefined }, // Domingos
        // Resto vazio para testar Auto-Fill
    }
};

export const HARDCODED_STATE = {
    publishers: initialPublishers,
    rules: initialRules,
    manualAssignmentState: HARDCODED_MANUAL_STATE
};
