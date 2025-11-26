// lib/ruleFacts.ts
import { FactDefinition } from '../types';

export const factDictionary: Record<string, FactDefinition> = {
  // Atributos principais
  'partType': { 
    naturalName: 'Tipo da Parte', 
    singleWordName: 'TipoParte',
    description: 'A seção geral da designação (ex: Presidente, Tesouros, Ministério).' 
  },
  'partTitle': {
    naturalName: 'Título da Parte',
    singleWordName: 'TituloParte',
    description: 'O título específico da parte (ex: "Leitura da Bíblia", "Discurso").'
  },
  'gender': { 
    naturalName: 'Gênero', 
    singleWordName: 'Gênero',
    description: 'Se o publicador é "brother" (irmão) ou "sister" (irmã).' 
  },
  'condition': { 
    naturalName: 'Condição', 
    singleWordName: 'Condição',
    description: 'A designação do publicador (ex: Ancião, Servo Ministerial, Publicador).' 
  },
  'isBaptized': { 
    naturalName: 'Batizado', 
    singleWordName: 'Batizado',
    description: 'Indica se o publicador é batizado (true ou false).' 
  },
  'isServing': {
    naturalName: 'Atuante',
    singleWordName: 'Atuante',
    description: 'Indica se o publicador está atualmente servindo (true ou false).'
  },
  'isAvailable': {
    naturalName: 'Disponível na Data',
    singleWordName: 'Disponivel',
    description: 'Verifica se o publicador está disponível na data da reunião (calculado dinamicamente).'
  },
  'ageGroup': {
    naturalName: 'Faixa Etária',
    singleWordName: 'FaixaEtaria',
    description: 'A faixa etária do publicador (Adulto, Jovem, Criança).'
  },
  'isHelperOnly': {
    naturalName: 'Só Ajudante',
    singleWordName: 'SoAjudante',
    description: 'Indica se o publicador participa apenas como ajudante (true ou false).'
  },

  // Privilégios (apenas para irmãos)
  'canGiveTalks': { 
    naturalName: 'Pode Fazer Discursos', 
    singleWordName: 'FazDiscursos',
    description: 'Se o irmão está habilitado a proferir discursos.' 
  },
  'canConductCBS': { 
    naturalName: 'Pode Dirigir EBC', 
    singleWordName: 'DirigeEBC',
    description: 'Se o irmão pode dirigir o Estudo Bíblico de Congregação.' 
  },
  'canReadCBS': { 
    naturalName: 'Pode Ler EBC', 
    singleWordName: 'LeitorEBC',
    description: 'Se o irmão pode ser o leitor no Estudo Bíblico de Congregação.' 
  },
  'canPray': { 
    naturalName: 'Pode Fazer Oração', 
    singleWordName: 'FazOração',
    description: 'Se o irmão pode fazer orações públicas na reunião.' 
  },
  'canPreside': { 
    naturalName: 'Pode Presidir', 
    singleWordName: 'Preside',
    description: 'Se o irmão pode presidir a Reunião Vida e Ministério.' 
  },

  // Novos Privilégios por Seção
  'canParticipateInTreasures': {
    naturalName: 'Pode Participar nos Tesouros',
    singleWordName: 'ParticipaTesouros',
    description: 'Se o publicador pode receber partes na seção "Tesouros da Palavra de Deus".'
  },
  'canParticipateInMinistry': {
    naturalName: 'Pode Participar no Ministério',
    singleWordName: 'ParticipaMinisterio',
    description: 'Se o publicador pode receber partes na seção "Faça Seu Melhor no Ministério".'
  },
  'canParticipateInLife': {
    naturalName: 'Pode Participar na Vida Cristã',
    singleWordName: 'ParticipaVidaCrista',
    description: 'Se o publicador pode receber partes na seção "Nossa Vida Cristã".'
  },
};