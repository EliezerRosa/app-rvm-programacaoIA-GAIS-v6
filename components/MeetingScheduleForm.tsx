import React, { useState, useEffect } from 'react';
import { MeetingData, Participation, ParticipationType, Publisher, SpecialEvent, EventTemplate } from '../types';
import { TimedEvent, getFullScheduleWithTimings } from '../lib/scheduleUtils';

interface MeetingScheduleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meetingData: { parts: Participation[], eventToUpdate?: SpecialEvent }) => void;
  scheduleToEdit: MeetingData | null;
  publishers: Publisher[];
  specialEvents: SpecialEvent[];
  eventTemplates: EventTemplate[];
}

const MeetingScheduleForm: React.FC<MeetingScheduleFormProps> = ({ isOpen, onClose, onSave, scheduleToEdit, publishers, specialEvents, eventTemplates }) => {
  const [partsToDisplay, setPartsToDisplay] = useState<TimedEvent[]>([]);
  const [modifiedData, setModifiedData] = useState<Record<string, { publisherName: string, partTitle: string }>>({});

  useEffect(() => {
    if (scheduleToEdit) {
      const timedSchedule = getFullScheduleWithTimings(scheduleToEdit, publishers, specialEvents, eventTemplates);
      setPartsToDisplay(timedSchedule);
      
      // Initialize modifiedData with current values
      const initialModifications: Record<string, { publisherName: string, partTitle: string }> = {};
      timedSchedule.forEach(event => {
        initialModifications[event.id] = { publisherName: event.publisherName, partTitle: event.partTitle };
      });
      setModifiedData(initialModifications);

    } else {
      setPartsToDisplay([]);
      setModifiedData({});
    }
  }, [scheduleToEdit, publishers, specialEvents, eventTemplates]);

  const handleParticipantChange = (partId: string, newPublisherName: string) => {
    setModifiedData(prev => ({
      ...prev,
      [partId]: { ...prev[partId], publisherName: newPublisherName },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleToEdit) return;

    const originalParts = scheduleToEdit.parts;
    let eventToUpdate: SpecialEvent | undefined = undefined;

    const updatedParts = originalParts.map(part => {
      if (modifiedData[part.id] && modifiedData[part.id].publisherName !== part.publisherName) {
        return { ...part, publisherName: modifiedData[part.id].publisherName };
      }
      return part;
    });

    const eventForWeek = specialEvents.find(e => e.week === scheduleToEdit.week);
    if (eventForWeek && modifiedData[eventForWeek.id]) {
        const modifiedEventData = modifiedData[eventForWeek.id];
        if (modifiedEventData.publisherName !== eventForWeek.assignedTo) {
             eventToUpdate = { ...eventForWeek, assignedTo: modifiedEventData.publisherName };
        }
    }

    onSave({ parts: updatedParts, eventToUpdate });
    onClose();
  };
  
  if (!isOpen || !scheduleToEdit) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl m-4 flex flex-col" style={{maxHeight: '90vh'}} onClick={e => e.stopPropagation()}>
        <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Editar Pauta - {scheduleToEdit.week}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden">
            <div className="p-6 flex-grow overflow-y-auto">
              <div className="space-y-4">
                  {partsToDisplay.filter(p => p.sectionType !== 'TRANSITION' && !p.partTitle.toLowerCase().includes('cântico') && !p.isCounseling).map(part => {
                      const currentData = modifiedData[part.id] || { publisherName: '', partTitle: '' };
                      const isEventPart = specialEvents.some(e => e.id === part.id);

                      return (
                          <div key={part.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                              <label htmlFor={`part-${part.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                                  { part.partTitle }
                              </label>
                              <input
                                  list="publisher-list"
                                  id={`part-${part.id}`}
                                  type="text"
                                  value={currentData.publisherName}
                                  onChange={(e) => handleParticipantChange(part.id, e.target.value)}
                                  disabled={part.publisherName === 'N/A' && !isEventPart}
                                  className="block w-full px-3 py-2 bg-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm text-black disabled:bg-gray-200 dark:disabled:bg-gray-700"
                              />
                          </div>
                      );
                  })}
                  <datalist id="publisher-list">
                      {publishers.map(p => <option key={p.id} value={p.name} />)}
                  </datalist>
              </div>
            </div>
            <div className="p-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-end space-x-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                Cancelar
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                Salvar Alterações
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default MeetingScheduleForm;