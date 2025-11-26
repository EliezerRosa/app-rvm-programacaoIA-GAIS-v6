import { ParticipationType } from '../types';

// FIX: The type SpecialEventType is not exported from types.ts anymore, likely part of a legacy system.
// Defining it locally to fix the compilation error in this apparently unused file.
enum SpecialEventType {
    VISITA_SC = 'VISITA_SC',
    MEMORIAL = 'MEMORIAL',
    BOLETIM_CG = 'BOLETIM_CG',
    ASSEMBLEIA_VISAO_GERAL = 'ASSEMBLEIA_VISAO_GERAL',
    ASSEMBLEIA_RECAPITULACAO = 'ASSEMBLEIA_RECAPITULACAO',
    CONGRESSO_LEMBRETES = 'CONGRESSO_LEMBRETES',
    CONGRESSO_RECAPITULACAO = 'CONGRESSO_RECAPITULACAO',
}

export interface EventRule {
    description: string;
    options?: {
        id: string;
        label: string;
        impact: EventImpact;
    }[];
    impact?: EventImpact; // Impacto direto se não houver opções
    defaults: {
        duration: number;
        theme?: string;
        requiresTheme: boolean;
        requiresAssignee: boolean;
    };
}

export interface EventImpact {
    action: 'REPLACE_PART' | 'ADD_PART' | 'REASSIGN_PART' | 'REPLACE_SECTION';
    targetType?: ParticipationType | ParticipationType[];
    reassignTarget?: ParticipationType;
}

export const eventRules: Record<SpecialEventType, EventRule> = {
    [SpecialEventType.VISITA_SC]: {
        description: "A pauta é ajustada para a visita do SC. A parte principal da 'Nossa Vida Cristã' é substituída por um discurso de serviço de 30 minutos. Os Comentários Finais também serão automaticamente designados ao Superintendente.",
        impact: {
            action: 'REPLACE_PART',
            targetType: ParticipationType.VIDA_CRISTA, // FIX: Target the main Christian Life part, not the Study Conductor
        },
        defaults: {
            duration: 30,
            requiresTheme: true,
            requiresAssignee: true,
        },
    },
    [SpecialEventType.MEMORIAL]: {
        description: "Toda a reunião do meio de semana é cancelada e substituída pela celebração do Memorial. Apenas um discurso será proferido.",
        impact: {
            action: 'REPLACE_SECTION',
            targetType: [ParticipationType.TESOUROS, ParticipationType.MINISTERIO, ParticipationType.VIDA_CRISTA, ParticipationType.DIRIGENTE],
        },
        defaults: {
            duration: 45,
            theme: "Celebração Anual da Morte de Cristo",
            requiresTheme: false,
            requiresAssignee: true,
        },
    },
    [SpecialEventType.BOLETIM_CG]: {
        description: "Um vídeo do Boletim do Corpo Governante será mostrado. Geralmente isso ocorre no lugar de uma parte da seção 'Nossa Vida Cristã'.",
        options: [
            {
                id: 'replace_vida_crista',
                label: "Substituir a primeira parte de 'Nossa Vida Cristã'",
                impact: { action: 'REPLACE_PART', targetType: ParticipationType.VIDA_CRISTA }
            },
            {
                id: 'add_as_new',
                label: "Adicionar como nova parte (requer ajuste manual de tempo)",
                impact: { action: 'ADD_PART' }
            }
        ],
        defaults: {
            duration: 10,
            theme: "Boletim do Corpo Governante",
            requiresTheme: false,
            requiresAssignee: false, // Geralmente é um vídeo
        },
    },
    [SpecialEventType.ASSEMBLEIA_VISAO_GERAL]: {
        description: "Na semana que antecede a assembleia, o presidente destaca o tema e os discursos principais. Isso geralmente substitui uma parte da 'Nossa Vida Cristã'. (sfl 20:17)",
        impact: {
            action: 'REPLACE_PART',
            targetType: ParticipationType.VIDA_CRISTA,
        },
        defaults: {
            duration: 10,
            theme: "Visão Geral do Programa da Assembleia",
            requiresTheme: false,
            requiresAssignee: false, // Feito pelo presidente da reunião
        },
    },
    [SpecialEventType.ASSEMBLEIA_RECAPITULACAO]: {
        description: "Uma recapitulação de 15 minutos do programa da assembleia deve ser feita. Você pode substituir uma parte existente ou usar o tempo de 'Necessidades Locais'. (sfl 20:18)",
        options: [
            {
                id: 'replace_vida_crista',
                label: "Substituir a parte de 'Necessidades Locais'/'Nossa Vida Cristã'",
                impact: { action: 'REPLACE_PART', targetType: ParticipationType.VIDA_CRISTA }
            },
            {
                id: 'add_as_new',
                label: "Adicionar como nova parte (requer ajuste manual de tempo)",
                impact: { action: 'ADD_PART' }
            }
        ],
        defaults: {
            duration: 15,
            theme: "Recapitulação do Programa da Assembleia",
            requiresTheme: false,
            requiresAssignee: true,
        },
    },
    [SpecialEventType.CONGRESSO_LEMBRETES]: {
        description: "Uma parte de 15 minutos com lembretes para o congresso, incluindo a apresentação do vídeo. Você pode substituir uma parte existente ou usar o tempo de 'Necessidades Locais'. (sfl 20:19)",
         options: [
            {
                id: 'replace_vida_crista',
                label: "Substituir a parte de 'Necessidades Locais'/'Nossa Vida Cristã'",
                impact: { action: 'REPLACE_PART', targetType: ParticipationType.VIDA_CRISTA }
            },
        ],
        defaults: {
            duration: 15,
            theme: "Lembretes Para o Congresso",
            requiresTheme: false,
            requiresAssignee: true,
        },
    },
    [SpecialEventType.CONGRESSO_RECAPITULACAO]: {
        description: "Uma recapitulação de 15 minutos do programa do congresso deve ser feita. Você pode substituir uma parte existente ou usar o tempo de 'Necessidades Locais'. (sfl 20:19)",
         options: [
            {
                id: 'replace_vida_crista',
                label: "Substituir a parte de 'Necessidades Locais'/'Nossa Vida Cristã'",
                impact: { action: 'REPLACE_PART', targetType: ParticipationType.VIDA_CRISTA }
            },
        ],
        defaults: {
            duration: 15,
            theme: "Recapitulação do Programa do Congresso",
            requiresTheme: false,
            requiresAssignee: true,
        },
    },
};