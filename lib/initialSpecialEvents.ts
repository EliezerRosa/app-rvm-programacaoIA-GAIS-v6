import { SpecialEvent } from '../types';
import { generateUUID } from './utils';

export const initialSpecialEvents: SpecialEvent[] = [
    {
        id: generateUUID(),
        templateId: 'tpl_visita_sc',
        week: '11-17 de NOV, 2024',
        theme: 'Discurso de Serviço do Superintendente',
        assignedTo: 'Israel Vieira',
        duration: 30,
        configuration: {}
    },
    {
        id: generateUUID(),
        templateId: 'tpl_visita_sc',
        week: '8-14 de DEZ, 2025',
        theme: 'Amor - O perfeito vínculo de união',
        assignedTo: 'João Marcos P. Costa (SC)',
        duration: 30,
        configuration: {}
    }
];