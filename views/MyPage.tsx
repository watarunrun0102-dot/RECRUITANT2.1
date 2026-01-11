import React, { useState } from 'react';
import { Company, CommonText } from '../types';
import { Button, CopyButton, Modal, Input } from '../components/UI';
import { addCommonText, updateCommonText, deleteCommonText } from '../services/dbService';
import { Plus, Trash2 } from 'lucide-react';

interface MyPageProps {
  userId: string;
  companies: Company[];
  commonTexts: CommonText[];
}

export const MyPage: React.FC<MyPageProps> = ({ userId, companies, commonTexts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingText, setEditingText] = useState<CommonText | null>(null);
  const [formData, setFormData] = useState<Partial<CommonText>>({
    title: '', text300: '', text400: '', text500: ''
  });

  const handleOpen = (text?: CommonText) => {
    if (text) {
      setEditingText(text);
      setFormData(text);
    } else {
      setEditingText(null);
      setFormData({ title: '', text300: '', text400: '', text500: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingText) {
      await updateCommonText(editingText.id, formData);
    } else {
      await addCommonText({ ...formData as any, userId });
    }
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    // Note: window.confirm might be blocked in some environments, but kept here for now as requested to maintain existing style unless specified otherwise.
    // Ideally should be replaced with custom modal for robustness.
    if (editingText && window.confirm("削除しますか？")) {
      await deleteCommonText(editingText.id);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Aspiration Table */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">志望企業一覧</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-4 py-3">企業名</th>
                <th className="px-4 py-3">業界</th>
                <th className="px-4 py-3">志望度</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">リンク</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(c => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3">{c.industry}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                         c.priority === '第一志望群' ? 'bg-red-50 text-red-600' :
                         c.priority === '第二志望群' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                    }`}>{c.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                    {c.mypageId || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Link</a>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Common Texts */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800">共通項目（ガクチカ・自己PR）</h2>
          <Button onClick={() => handleOpen()}>
             <Plus className="w-4 h-4 mr-2 inline" />
             追加
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {commonTexts.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-slate-800">{item.title}</h3>
                <button onClick={() => handleOpen(item)} className="text-xs text-blue-600 hover:underline">編集</button>
              </div>
              
              <div className="space-y-4">
                {[300, 400, 500].map(len => {
                  const key = `text${len}` as keyof CommonText;
                  const content = item[key] as string;
                  return (
                    <div key={len} className="bg-slate-50 p-3 rounded-lg relative group">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-500">{len}文字版</span>
                        <div className="flex items-center space-x-2">
                           <span className="text-xs text-slate-400">{content?.length || 0}文字</span>
                           <CopyButton text={content || ''} />
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-3 group-hover:line-clamp-none transition-all">
                        {content || <span className="text-slate-400 italic">未登録</span>}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Text Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="共通項目登録">
        <form onSubmit={handleSubmit} className="space-y-4">
           <Input label="タイトル" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="例: 学生時代に力を入れたこと" required />
           
           {[300, 400, 500].map(len => (
             <div key={len}>
               <div className="flex justify-between mb-1">
                 <label className="text-sm font-medium text-slate-700">{len}文字パターン</label>
                 <span className="text-xs text-slate-400">{(formData[`text${len}` as keyof CommonText] as string)?.length || 0}文字</span>
               </div>
               <textarea 
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={4}
                  value={formData[`text${len}` as keyof CommonText] as string || ''}
                  onChange={e => setFormData({...formData, [`text${len}`]: e.target.value})}
               />
             </div>
           ))}

           <div className="flex justify-between pt-4">
             {editingText ? (
               <Button type="button" variant="danger" onClick={handleDelete}><Trash2 className="w-4 h-4" /></Button>
             ) : <div></div>}
             <div className="flex space-x-2">
               <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>キャンセル</Button>
               <Button type="submit">保存</Button>
             </div>
           </div>
        </form>
      </Modal>
    </div>
  );
};