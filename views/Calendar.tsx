import React from 'react';
import { Task } from '../types';

interface CalendarProps {
  tasks: Task[];
}

export const CalendarView: React.FC<CalendarProps> = ({ tasks }) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Pad start
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    // Days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const days = getDaysInMonth(currentDate);
  const activeTasks = tasks.filter(t => !t.isHistory);

  const getTasksForDate = (date: Date | null) => {
    if (!date) return [];
    return activeTasks.filter(t => {
      const d = t.deadline || t.eventDate || t.eventEndDate;
      if (!d) return false;
      const taskDate = new Date(d);
      return taskDate.getDate() === date.getDate() && 
             taskDate.getMonth() === date.getMonth() && 
             taskDate.getFullYear() === date.getFullYear();
    });
  };

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-full text-slate-600">&lt;</button>
            <h2 className="text-lg font-bold text-slate-800">
                {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
            </h2>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-full text-slate-600">&gt;</button>
        </div>
        
        <div className="grid grid-cols-7 text-center border-b border-slate-100">
            {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                <div key={d} className={`py-2 text-sm font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-500'}`}>
                    {d}
                </div>
            ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr bg-slate-100 gap-px border-b border-l border-slate-100">
            {days.map((date, idx) => {
                const dateTasks = getTasksForDate(date);
                return (
                    <div key={idx} className={`bg-white min-h-[100px] p-1 md:p-2 ${!date ? 'bg-slate-50' : ''}`}>
                        {date && (
                            <>
                                <div className={`text-xs md:text-sm font-bold mb-1 ${
                                    date.getDay() === 0 ? 'text-red-500' : date.getDay() === 6 ? 'text-blue-500' : 'text-slate-700'
                                }`}>
                                    {date.getDate()}
                                </div>
                                <div className="space-y-1 overflow-y-auto max-h-[80px]">
                                    {dateTasks.map(t => (
                                        <div key={t.id} className="text-[10px] md:text-xs p-1 rounded bg-blue-50 border border-blue-100 text-blue-800 truncate" title={`${t.companyName} - ${t.phase}`}>
                                            {t.startTime && <span className="mr-1 text-blue-600">{t.startTime}</span>}
                                            {t.companyName.substring(0, 6)}...
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
  );
};
