import { Rule, ParticipationType } from '../types';
import { generateUUID } from './utils';

export const initialRules: Rule[] = [
  {
    id: generateUUID(),
    description: 'Não designar publicadores que não estão atuantes.',
    isActive: true,
    conditions: [
      { fact: 'isServing', operator: 'equal', value: false }
    ]
  },
  {
    id: generateUUID(),
    description: 'Não designar publicadores em datas em que não estão disponíveis.',
    isActive: true,
    conditions: [
      { fact: 'isAvailable', operator: 'equal', value: false }
    ]
  },
  {
    id: generateUUID(),
    description: "Publicadores marcados como 'Só Ajudante' não podem receber partes principais.",
    isActive: true,
    conditions: [
      { fact: 'isHelperOnly', operator: 'equal', value: true },
      { fact: 'partType', operator: 'notEqual', value: ParticipationType.AJUDANTE }
    ]
  },
  {
    id: generateUUID(),
    description: 'Apenas irmãos com a caixa "Pode Presidir" marcada no cadastro podem ser Presidentes.',
    isActive: true,
    conditions: [
      { fact: 'partType', operator: 'equal', value: ParticipationType.PRESIDENTE },
      { fact: 'canPreside', operator: 'equal', value: false }
    ]
  },
  {
    id: generateUUID(),
    description: 'Apenas anciãos podem dirigir o Estudo Bíblico de Congregação.',
    isActive: true,
    conditions: [
      { fact: 'partType', operator: 'equal', value: ParticipationType.DIRIGENTE },
      { fact: 'condition', operator: 'notEqual', value: 'Ancião' }
    ]
  },
  {
    id: generateUUID(),
    description: 'Apenas irmãos batizados podem fazer a oração.',
    isActive: true,
    conditions: [
      { fact: 'partType', operator: 'in', value: [ParticipationType.ORACAO_INICIAL, ParticipationType.ORACAO_FINAL] },
      { fact: 'isBaptized', operator: 'equal', value: false }
    ]
  },
   {
    id: generateUUID(),
    description: 'Apenas irmãos que podem presidir podem fazer a oração inicial.',
    isActive: true,
    conditions: [
        { fact: 'partType', operator: 'equal', value: ParticipationType.ORACAO_INICIAL },
        { fact: 'canPreside', operator: 'equal', value: false }
    ]
  },
   {
    id: generateUUID(),
    description: 'Apenas irmãos podem ser Leitores do Estudo Bíblico.',
    isActive: true,
    conditions: [
        { fact: 'partType', operator: 'equal', value: ParticipationType.LEITOR },
        { fact: 'gender', operator: 'equal', value: 'sister' }
    ]
  },
  {
    id: generateUUID(),
    description: "Irmãs não podem ser designadas para partes do tipo 'Discurso'.",
    isActive: true,
    conditions: [
      { fact: 'gender', operator: 'equal', value: 'sister' },
      { fact: 'partTitle', operator: 'contains', value: 'Discurso' }
    ]
  },
  {
    id: generateUUID(),
    description: "Irmãs só podem ser designadas para partes na seção 'Faça Seu Melhor no Ministério' ou como Ajudante.",
    isActive: true,
    conditions: [
      { fact: 'gender', operator: 'equal', value: 'sister' },
      { fact: 'partType', operator: 'notIn', value: [ParticipationType.MINISTERIO, ParticipationType.AJUDANTE] }
    ]
  },
   {
    id: generateUUID(),
    description: "Irmãos (não A/SM) podem participar em 'Tesouros' apenas na 'Leitura da Bíblia'.",
    isActive: true,
    conditions: [
      { fact: 'condition', operator: 'notIn', value: ['Ancião', 'Servo Ministerial'] },
      { fact: 'partType', operator: 'equal', value: ParticipationType.TESOUROS },
      { fact: 'partTitle', operator: 'notEqual', value: 'Leitura da Bíblia' }
    ]
  }
];