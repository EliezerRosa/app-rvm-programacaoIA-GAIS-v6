import React, { useState, useEffect, useMemo } from 'react';
import { Participation, ParticipationType, Publisher, Rule, ParticipationFormProps } from '../types';
import { generateUUID, calculatePartDate, PAIRABLE_PART_TYPES, validatePairing } from '../lib/utils';
import { validateAssignment } from '../lib/inferenceEngine';
import { SparklesIcon } from './icons';

const ParticipationForm: React.FC<ParticipationFormProps> = ({ isOpen, onClose, onSave, participationToEdit, publishers, rules, specialEvents, eventTemplates }) => {
  const [week, setWeek] = useState('');
  const [partTitle, setPartTitle] = useState('');
  const [partType, setPartType] = useState<ParticipationType | string>(ParticipationType.MINISTERIO);
  
  const [studentName, setStudentName] = useState('');
  const [helperName, setHelperName] = useState('');
  
  const isPairedPart = useMemo(() => PAIRABLE_PART_TYPES.includes(partType as ParticipationType), [partType]);
  
  const availablePartTypes = useMemo(() => {
    const eventForWeek = specialEvents.find(e => e.week === week);
    const template = eventForWeek ? eventTemplates.find(t => t.id === eventForWeek.templateId) : null;
    let types = Object.values(ParticipationType).filter(t => t !== ParticipationType.AJUDANTE);
    
    if (eventForWeek && template) {
        if (template.impact.action === 'REPLACE_PART' || template.impact.action === 'REPLACE_SECTION') {
            const targetTypes = new Set(Array.isArray(template.impact.targetType) ? template.impact.targetType : [template.impact.targetType]);
            types = types.filter(t => !targetTypes.has(t));
        }
        // Adiciona o nome do evento como um tipo de parte selecionável
        return [...types, eventForWeek.theme];
    }
    return types;
  }, [week, specialEvents, eventTemplates]);


  useEffect(() => {
    if (isOpen) {
      if (participationToEdit) {
        setWeek(participationToEdit.week);
        setPartTitle(participationToEdit.partTitle);
        setPartType(participationToEdit.type);
        setStudentName(participationToEdit.publisherName);
        setHelperName('');
      } else {
        setWeek('');
        setPartTitle('');
        setPartType(ParticipationType.MINISTERIO);
        setStudentName('');
        setHelperName('');
      }
    }
  }, [participationToEdit, isOpen]);
  
  const eligibleStudents = useMemo(() => {
    if (!partType || !week) return [];
    const meetingDate = calculatePartDate(week).split('T')[0];
    return publishers.filter(p => {
      const validation = validateAssignment({ publisher: p, partType: partType as string, partTitle: partTitle || (partType as string), meetingDate }, rules);
      return validation.isValid;
    });
  }, [partType, partTitle, week, publishers, rules]);

  const eligibleHelpers = useMemo(() => {
    if (!isPairedPart || !studentName) return [];
    const student = publishers.find(p => p.name === studentName);
    if (!student) return [];
    const meetingDate = calculatePartDate(week).split('T')[0];

    return publishers.filter(p => {
      if (p.id === student.id) return false;
      const pairingValidation = validatePairing(student, p);
      if (!pairingValidation.isValid) return false;
      const helperAssignmentValidation = validateAssignment({ publisher: p, partType: ParticipationType.AJUDANTE, partTitle: 'Ajudante', meetingDate }, rules);
      return helperAssignmentValidation.isValid;
    });
  }, [isPairedPart, studentName, week, publishers, rules]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !week || !partTitle) {
      alert("Os campos de Estudante/Participante, Semana e Título da Parte são obrigatórios.");
      return;
    }
    const studentPublisher = publishers.find(p => p.name === studentName);
    if (!studentPublisher) {
      alert("Estudante/Participante não encontrado.");
      return;
    }
    const meetingDate = calculatePartDate(week).split('T')[0];
    let finalPartType = Object.values(ParticipationType).includes(partType as ParticipationType) ? partType as ParticipationType : ParticipationType.VIDA_CRISTA;
    let studentValidation = validateAssignment({ publisher: studentPublisher, partType: finalPartType, partTitle, meetingDate }, rules);
    if (!studentValidation.isValid) {
        alert(`Designação inválida para ${studentName}: ${studentValidation.reason}`);
        return;
    }
    const participationsToSave: Participation[] = [];
    if (isPairedPart) {
        if (!helperName) { alert("Ajudante é obrigatório para este tipo de parte."); return; }
        const helperPublisher = publishers.find(p => p.name === helperName);
        if (!helperPublisher) { alert("Ajudante não encontrado."); return; }
        const pairingValidation = validatePairing(studentPublisher, helperPublisher);
        if (!pairingValidation.isValid) { alert(`Erro de pareamento: ${pairingValidation.reason}`); return; }
        let helperValidation = validateAssignment({ publisher: helperPublisher, partType: ParticipationType.AJUDANTE, partTitle: 'Ajudante', meetingDate }, rules);
        if (!helperValidation.isValid) { alert(`Designação inválida para o ajudante ${helperName}: ${helperValidation.reason}`); return; }
        participationsToSave.push({ id: generateUUID(), publisherName: helperName, week, partTitle: 'Ajudante', type: ParticipationType.AJUDANTE, date: calculatePartDate(week) });
    }
    participationsToSave.push({ id: participationToEdit ? participationToEdit.id : generateUUID(), publisherName: studentName, week, partTitle, type: finalPartType, date: calculatePartDate(week) });
    onSave(participationsToSave);
    onClose();
  };

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4 flex flex-col" style={{maxHeight: '90vh'}} onClick={e => e.stopPropagation()}>
        <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold">{participationToEdit ? 'Editar Participação' : 'Adicionar Designação'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-4">
            <div>
              <label htmlFor="week" className="block text-sm font-medium">Semana (ex: 1-7 de JAN, 2025)</label>
              <input type="text" id="week" value={week} onChange={(e) => setWeek(e.target.value)} required className="mt-1 block w-full input-class"/>
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-medium">Tipo</label>
              <select id="type" value={partType} onChange={(e) => setPartType(e.target.value)} className="mt-1 block w-full input-class">
                {availablePartTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="partTitle" className="block text-sm font-medium">Título da Parte</label>
              <input type="text" id="partTitle" value={partTitle} onChange={(e) => setPartTitle(e.target.value)} required className="mt-1 block w-full input-class"/>
            </div>
            <div className={`grid grid-cols-1 ${isPairedPart ? 'md:grid-cols-2 gap-4' : ''}`}>
              <div>
                <label htmlFor="studentName" className="block text-sm font-medium">{isPairedPart ? 'Estudante' : 'Participante'}</label>
                <select id="studentName" value={studentName} onChange={(e) => setStudentName(e.target.value)} required className="mt-1 block w-full input-class">
                  <option value="" disabled>Selecione...</option>
                  {eligibleStudents.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              {isPairedPart && (
                <div>
                  <label htmlFor="helperName" className="block text-sm font-medium">Ajudante</label>
                  <select id="helperName" value={helperName} onChange={(e) => setHelperName(e.target.value)} required disabled={!studentName} className="mt-1 block w-full input-class disabled:opacity-50">
                    <option value="" disabled>Selecione...</option>
                    {eligibleHelpers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
              )}
            </div>
        </form>
        <div className="p-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" form="participation-form" className="btn-primary">Salvar</button>
        </div>
        <style>{`
            .input-class { background-color: white; color: black; border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.5rem 0.75rem; }
            .dark .input-class { background-color: #374151; color: white; border-color: #4b5563; }
            .btn-primary { background-color: #4f46e5; color: white; padding: 0.5rem 1rem; border-radius: 0.375rem; }
            .btn-secondary { background-color: #6b7280; color: white; padding: 0.5rem 1rem; border-radius: 0.375rem; }
        `}</style>
      </div>
    </div>
  );
};

export default ParticipationForm;