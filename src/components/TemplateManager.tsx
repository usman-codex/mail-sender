import { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  Check,
  Star,
  Copy,
  Sparkles,
  Info,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { EmailTemplate, EmailAttachment, UserProfile } from '../types';
import { AttachmentUploader } from './AttachmentUploader';
import { storageService } from '../services/storage';

interface TemplateManagerProps {
  templates: EmailTemplate[];
  onUpdateTemplates: (templates: EmailTemplate[]) => void;
  user: UserProfile | null;
}

export function TemplateManager({
  templates,
  onUpdateTemplates,
  user,
}: TemplateManagerProps) {
  const [selectedId, setSelectedId] = useState<string>(
    templates.find((t) => t.isDefault)?.id || templates[0]?.id || ''
  );
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const activeTemplate = templates.find((t) => t.id === selectedId) || templates[0];
  const [title, setTitle] = useState(activeTemplate?.title || '');
  const [category, setCategory] = useState<EmailTemplate['category']>(
    activeTemplate?.category || 'Job Application'
  );
  const [subject, setSubject] = useState(activeTemplate?.subject || '');
  const [body, setBody] = useState(activeTemplate?.body || '');
  const [attachments, setAttachments] = useState<EmailAttachment[]>(
    activeTemplate?.attachments || []
  );

  const handleSelectTemplate = (tmpl: EmailTemplate) => {
    setSelectedId(tmpl.id);
    setTitle(tmpl.title);
    setCategory(tmpl.category || 'Job Application');
    setSubject(tmpl.subject);
    setBody(tmpl.body);
    setAttachments(tmpl.attachments || []);
    setIsEditing(false);
  };

  const handleCreateNew = () => {
    const newTmpl: EmailTemplate = {
      id: `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: 'New Custom Template',
      category: 'Custom',
      subject: 'Application - {{name}} [CV Attached]',
      body: `Hi {{name}},\n\nI am writing regarding the open position at {{company}}...\n\nBest,\n{{sender_name}}`,
      attachments: storageService.getDefaultAttachments(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...templates, newTmpl];
    onUpdateTemplates(updated);
    storageService.saveTemplates(updated);
    handleSelectTemplate(newTmpl);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!title.trim() || !subject.trim() || !body.trim()) return;

    const updated = templates.map((t) => {
      if (t.id === selectedId) {
        return {
          ...t,
          title,
          category,
          subject,
          body,
          attachments,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });

    onUpdateTemplates(updated);
    storageService.saveTemplates(updated);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSetDefault = (id: string) => {
    const updated = templates.map((t) => ({
      ...t,
      isDefault: t.id === id,
    }));
    onUpdateTemplates(updated);
    storageService.saveTemplates(updated);
  };

  const handleDelete = (id: string) => {
    if (templates.length <= 1) {
      alert('You must keep at least one template.');
      return;
    }
    const filtered = templates.filter((t) => t.id !== id);
    onUpdateTemplates(filtered);
    storageService.saveTemplates(filtered);
    if (selectedId === id) {
      handleSelectTemplate(filtered[0]);
    }
  };

  const insertVariable = (tag: string) => {
    setBody((prev) => prev + ` {{${tag}}}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <span>CV & Email Templates Studio</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pre-configure your resume, cover text, and subject lines so you can dispatch instantly without repetitive typing.
          </p>
        </div>

        <button
          id="create-new-template-btn"
          onClick={handleCreateNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">
            Saved Templates ({templates.length})
          </div>

          <div className="space-y-2.5">
            {templates.map((tmpl) => {
              const isSelected = tmpl.id === selectedId;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-500 ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {tmpl.title}
                        </span>
                        {tmpl.isDefault && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-1">
                        {tmpl.subject}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!tmpl.isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(tmpl.id);
                          }}
                          title="Set as Default Template"
                          className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {templates.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(tmpl.id);
                          }}
                          title="Delete Template"
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-800 text-[10px] text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium border border-slate-700">
                      {tmpl.category || 'Custom'}
                    </span>
                    {tmpl.attachments && tmpl.attachments.length > 0 && (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        📎 {tmpl.attachments.length} attachment{tmpl.attachments.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Template Editor
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
                {title || 'Untitled Template'}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 animate-fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
                </span>
              )}
              <button
                id="save-template-btn"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/25 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Template</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Template Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer CV"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs text-white cursor-pointer"
              >
                <option value="Job Application">Job Application</option>
                <option value="Freelance">Freelance & Contract</option>
                <option value="Follow Up">Follow Up</option>
                <option value="Custom">Custom Inquiry</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Email Subject Line
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Tags: {`{{role}}, {{name}}, {{company}}`}</span>
            </div>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Application for {{role}} - {{name}} [CV Attached]"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs text-white font-mono"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Email Message Body
              </label>
              
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400">Insert tag:</span>
                {['role', 'company', 'name', 'sender_name', 'sender_email'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertVariable(tag)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-indigo-300 border border-slate-700 transition-colors"
                  >
                    +{`{{${tag}}}`}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email body template..."
              className="w-full p-4 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs text-slate-200 leading-relaxed font-sans"
            />
          </div>

          <div className="pt-2">
            <AttachmentUploader
              attachments={attachments}
              onUpdateAttachments={(newAtts) => {
                setAttachments(newAtts);
                storageService.saveDefaultAttachments(newAtts);
              }}
              isCVMode={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
