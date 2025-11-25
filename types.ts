
// FIX: Created a proper types.ts file to export all shared types.
export interface PublisherPrivileges {
    canGiveTalks: boolean;
    canConductCBS: boolean;
    canReadCBS: boolean;
    canPray: boolean;
    canPreside: boolean;
}

// NOVO: Adiciona privilégios específicos por seção da reunião.
export interface PublisherPrivilegesBySection {
    canParticipateInTreasures: boolean;
    canParticipateInMinistry: boolean;
    canParticipateInLife: boolean;
}

// NOVO: Adiciona um sistema de disponibilidade mais robusto.
export interface PublisherAvailability {
    // 'always': Disponível sempre, EXCETO nas datas listadas.
    // 'never': Indisponível sempre, EXCETO nas datas listadas.
    mode: 'always' | 'never'; 
    exceptionDates: string[]; // Array de datas no formato 'AAAA-MM-DD'
}

// NOVO: Define os grupos de idade.
export type AgeGroup = 'Adulto' | 'Jovem' | 'Criança';

export interface Publisher {
    id: string;
    name: string;
    gender: 'brother' | 'sister';
    condition: 'Ancião' | 'Servo Ministerial' | 'Publicador';
    phone: string;
    isBaptized: boolean;
    isServing: boolean;
    // NOVO: Adiciona campos de faixa etária e parentesco.
    ageGroup: AgeGroup;
    parentIds: string[]; // Armazena os IDs de até dois pais
    isHelperOnly: boolean;
    canPairWithNonParent: boolean;
    privileges: PublisherPrivileges;
    privilegesBySection: PublisherPrivilegesBySection;
    availability: PublisherAvailability;
    aliases: string[];
}

export enum ParticipationType {
    PRESIDENTE = 'Presidente',
    ORACAO_INICIAL = 'Oração Inicial',
    ORACAO_FINAL = 'Oração Final',
    TESOUROS = 'Tesouros da Palavra de Deus',
    MINISTERIO = 'Faça Seu Melhor no Ministério',
    VIDA_CRISTA = 'Nossa Vida Cristã',
    DIRIGENTE = 'Dirigente do EBC',
    LEITOR = 'Leitor do EBC',
    AJUDANTE = 'Ajudante',
    CANTICO = 'Cântico',
    COMENTARIOS_FINAIS = 'Comentários Finais',
}

export interface Participation {
    id: string;
    publisherName: string;
    week: string;
    date: string; // ISO string for the specific meeting day
    partTitle: string;
    type: ParticipationType;
    duration?: number;
}

export interface Workbook {
    id: string;
    name: string;
    fileData: string; // base64 encoded PDF
    uploadDate: string; // ISO string
}

export interface RuleCondition {
    fact: string;
    operator: 'equal' | 'notEqual' | 'in' | 'notIn' | 'contains';
    value: string | boolean | number | string[];
}

export interface Rule {
    id: string;
    description: string;
    isActive: boolean;
    conditions: RuleCondition[];
}

export type EventImpactAction = 'REPLACE_PART' | 'ADD_PART' | 'REPLACE_SECTION' | 'REASSIGN_PART';

export interface EventImpact {
    action: EventImpactAction;
    targetType?: ParticipationType | ParticipationType[];
    reassignTarget?: ParticipationType;
}

export interface EventTemplate {
    id: string;
    name: string;
    description: string;
    impact: EventImpact;
    defaults: {
        duration: number;
        theme?: string;
        requiresTheme: boolean;
        requiresAssignee: boolean;
    };
}

export interface SpecialEventConfiguration {
    timeReduction?: {
        targetType: ParticipationType;
        minutes: number;
    }
}

export interface SpecialEvent {
    id: string;
    week: string;
    templateId: string;
    theme: string;
    assignedTo: string;
    duration: number;
    configuration: SpecialEventConfiguration;
}


export interface ValidationRequest {
    publisher: Publisher;
    partType: string;
    partTitle: string;
    meetingDate: string; // YYYY-MM-DD format for availability check
}

export interface ValidationResponse {
    isValid: boolean;
    reason: string;
}

export interface MeetingData {
    week: string;
    parts: Participation[];
}

export interface FactDefinition {
  naturalName: string;
  singleWordName: string;
  description: string;
}

// NOVO: Define o tipo para os resultados da IA
export interface AiScheduleResult {
  partTitle: string;
  studentName: string;
  helperName: string | null;
  reason: string;
}


// NOVO: Define as props para o formulário de participação
export interface ParticipationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (participations: Participation[]) => void; // Aceita um array
  participationToEdit: Participation | null;
  publishers: Publisher[];
  rules: Rule[];
  specialEvents: SpecialEvent[];
  eventTemplates: EventTemplate[];
}

// NOVO: Define as props para o modal de eventos especiais
export interface SpecialEventsModalProps {
    isOpen: boolean;
    onClose: () => void;
    specialEvents: SpecialEvent[];
    eventTemplates: EventTemplate[];
    onSave: (event: SpecialEvent) => Promise<void>;
    onDelete: (id: string) => void;
    onManageTemplates: () => void;
}

// NOVO: Define o tipo para os dados de estatísticas de um publicador.
export interface PublisherStats {
  publisherId: string;
  publisherName: string;
  totalAssignments: number;
  lastAssignmentDate: string | null; // ISO string
  lastAssignmentWeek: string | null;
  // NOVOS CAMPOS DE DETALHE
  lastAssignmentTitle: string | null;
  lastAssignmentType: ParticipationType | null;
  avgDaysBetweenAssignments: number | null;
}