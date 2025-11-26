import { EventTemplate, ParticipationType } from '../types';
import { generateUUID } from './utils';

export const initialEventTemplates: EventTemplate[] = [
    {
        id: 'tpl_visita_sc',
        name: 'Visita do superintendente de circuito',
        description: "A pauta é ajustada para a visita. A parte principal da 'Nossa Vida Cristã' é substituída por um discurso de serviço. Os Comentários Finais também serão automaticamente designados ao Superintendente.",
        impact: {
            action: 'REPLACE_PART',
            targetType: ParticipationType.DIRIGENTE,
        },
        defaults: {
            duration: 30,
            requiresTheme: true,
            requiresAssignee: true,
        },
    },
    {
        id: 'tpl_memorial',
        name: 'Memorial da morte de Cristo (Março/Abril)',
        description: "Toda a reunião do meio de semana é cancelada e substituída pela celebração do Memorial. Apenas um discurso será proferido.",
        impact: {
            action: 'REPLACE_SECTION',
            targetType: [ParticipationType.TESOUROS, ParticipationType.MINISTERIO, ParticipationType.VIDA_CRISTA, ParticipationType.DIRIGENTE, ParticipationType.LEITOR],
        },
        defaults: {
            duration: 45,
            theme: "Celebração Anual da Morte de Cristo",
            requiresTheme: false,
            requiresAssignee: true,
        },
    },
    {
        id: 'tpl_boletim_cg',
        name: 'Boletins do corpo governante',
        description: "Um vídeo do Boletim do Corpo Governante será mostrado. Você pode substituir uma parte ou adicionar como uma nova parte (requer ajuste manual de tempo).",
        impact: { action: 'ADD_PART' }, // Ação padrão é adicionar
        defaults: {
            duration: 10,
            theme: "Boletim do Corpo Governante",
            requiresTheme: false,
            requiresAssignee: false,
        },
    },
    {
        id: 'tpl_assembleia_visao_geral',
        name: 'Assembleia de circuito VISÃO GERAL DO PROGRAMA',
        description: "Na semana que antecede a assembleia, o presidente destaca o tema e os discursos principais. (sfl 20:17)",
        impact: {
            action: 'REPLACE_PART',
            targetType: ParticipationType.VIDA_CRISTA,
        },
        defaults: {
            duration: 10,
            theme: "Visão Geral do Programa da Assembleia",
            requiresTheme: false,
            requiresAssignee: false,
        },
    },
    {
        id: 'tpl_assembleia_recap',
        name: 'Assembleia de circuito RECAPITULAÇÃO DO PROGRAMA',
        description: "Uma recapitulação de 15 minutos do programa da assembleia. Requer ajuste de tempo em outra parte da pauta. (sfl 20:18)",
        impact: { action: 'ADD_PART' },
        defaults: {
            duration: 15,
            theme: "Recapitulação do Programa da Assembleia",
            requiresTheme: false,
            requiresAssignee: true,
        },
    },
    {
        id: 'tpl_congresso_lembretes',
        name: 'LEMBRETES DO CONGRESSO',
        description: "Uma parte de 15 minutos com lembretes para o congresso, incluindo a apresentação do vídeo. Requer ajuste de tempo em outra parte. (sfl 20:19)",
        impact: { action: 'ADD_PART' },
        defaults: {
            duration: 15,
            theme: "Lembretes Para o Congresso",
            requiresTheme: false,
            requiresAssignee: true,
        },
    },
    {
        id: 'tpl_congresso_recap',
        name: 'RECAPITULAÇÃO DO PROGRAMA DO CONGRESSO',
        description: "Uma recapitulação de 15 minutos do programa do congresso. Requer ajuste de tempo em outra parte da pauta. (sfl 20:19)",
        impact: { action: 'ADD_PART' },
        defaults: {
            duration: 15,
            theme: "Recapitulação do Programa do Congresso",
            requiresTheme: false,
            requiresAssignee: true,
        },
    },
];
