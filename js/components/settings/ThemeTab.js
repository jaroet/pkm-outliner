(function(J) {
    const { useState, useEffect } = React;
    const { getThemes, saveTheme, deleteTheme, getActiveThemeId, setActiveThemeId } = J.Services.DB;

    J.ThemeTab = ({isOpen, onThemeChange}) => {
        const [themes, setThemes] = useState([]);
        const [curThemeId, setCurThemeId] = useState('');
        const [editingTheme, setEditingTheme] = useState(null);
        const [highlightedVar, setHighlightedVar] = useState(null);

        useEffect(() => {
            if (isOpen) {
                const init = async () => {
                    const ts = await getThemes();
                    setThemes(ts);
                    const active = await getActiveThemeId();
                    setCurThemeId(active);
                    const t = ts.find(x => x.id === active);
                    if(t) setEditingTheme(JSON.parse(JSON.stringify(t)));
                };
                init();
            }
        }, [isOpen]);

        const handleThemeSelect = async (id) => {
            setCurThemeId(id);
            await setActiveThemeId(id);
            const t = themes.find(x => x.id === id);
            if(t) setEditingTheme(JSON.parse(JSON.stringify(t)));
            onThemeChange();
        };

        const handleThemeValueChange = (key, val) => {
            if(!editingTheme) return;
            const updated = { ...editingTheme, values: { ...editingTheme.values, [key]: val } };
            setEditingTheme(updated);
        };

        const saveCurrentTheme = async () => {
            if(!editingTheme) return;
            await saveTheme(editingTheme);
            const ts = await getThemes();
            setThemes(ts);
            onThemeChange();
        };

        const createNewTheme = async () => {
            const name = prompt("Name for new theme:", editingTheme.name + " Copy");
            if(!name) return;
            const newId = crypto.randomUUID();
            const newTheme = { ...editingTheme, id: newId, name: name };
            await saveTheme(newTheme);
            const ts = await getThemes();
            setThemes(ts);
            handleThemeSelect(newId);
        };

        // Helper for preview highlighting
        const hl = (vars) => vars.includes(highlightedVar) ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-transparent z-10' : '';
        const hlText = (vars) => vars.includes(highlightedVar) ? 'text-yellow-600 dark:text-yellow-400 font-bold' : '';

        if (!editingTheme) return null;

        return html`
            <div className="flex flex-col lg:flex-row gap-6 h-full">
                <div className="flex-1 space-y-6">
                    <div className="flex gap-2 mb-4">
                        <select 
                            value=${curThemeId} 
                            onChange=${e => handleThemeSelect(e.target.value)}
                            className="flex-1 p-2 rounded border border-gray-300 dark:border-gray-700 bg-background"
                        >
                            ${themes.map(t => html`<option key=${t.id} value=${t.id}>${t.name}</option>`)}
                        </select>
                        <button onClick=${createNewTheme} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:opacity-80" title="Duplicate Current Theme">+</button>
                        ${!['light','dark'].includes(curThemeId) && html`
                            <button onClick=${async ()=>{
                                if(confirm('Delete theme?')){
                                    await deleteTheme(curThemeId);
                                    const ts = await getThemes();
                                    setThemes(ts);
                                    handleThemeSelect('dark');
                                }
                            }} className="px-3 py-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20" title="Delete Theme">🗑️</button>
                        `}
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                        <label className="text-sm font-medium">Theme Name:</label>
                        <input type="text" value=${editingTheme.name} onChange=${e => setEditingTheme({...editingTheme, name: e.target.value})} className="flex-1 p-1 rounded border bg-transparent" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                        ${Object.entries(editingTheme.values).map(([k, v]) => html`
                            <div 
                                key=${k} 
                                className=${`flex items-center justify-between p-2 rounded border transition-all ${highlightedVar === k ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 shadow-sm' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                onMouseEnter=${() => setHighlightedVar(k)}
                                onMouseLeave=${() => setHighlightedVar(null)}
                            >
                                <span className=${`font-mono text-sm text-gray-600 dark:text-gray-400 ${hlText([k])}`}>${k.replace('--', '')}</span>
                                <div className="flex items-center gap-2">
                                    <input type="text" value=${v} onChange=${e => handleThemeValueChange(k, e.target.value)} className="w-20 p-1 text-sm rounded border bg-transparent text-right font-mono" />
                                    <input type="color" value=${v} onChange=${e => handleThemeValueChange(k, e.target.value)} className="h-8 w-8 p-0 border-0 rounded cursor-pointer shadow-sm" />
                                </div>
                            </div>
                        `)}
                    </div>
                    
                    <div className="pt-6 border-t border-gray-100 dark:border-gray-800 text-right">
                        <button onClick=${saveCurrentTheme} className="px-4 py-2 bg-primary text-white rounded hover:opacity-90">
                            Save Theme Changes
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex-shrink-0 min-w-0">
                    <div className="sticky top-0">
                        <h3 className="text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">Live Preview</h3>
                        <div 
                            className=${`border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col h-80 text-xs select-none transition-colors duration-200 ${hl(['--background', '--foreground'])}`}
                            style=${{ ...editingTheme.values, fontFamily: 'sans-serif' }}
                        >
                            <div className=${`h-8 border-b flex items-center px-3 gap-2 flex-shrink-0 ${hl(['--theme-bars'])}`} style=${{backgroundColor: 'var(--theme-bars)', borderColor: 'rgba(128,128,128,0.1)'}}>
                                <div className="flex gap-1">
                                    <div className=${`w-2 h-2 rounded-full ${hl(['--foreground'])}`} style=${{backgroundColor: 'var(--foreground)', opacity: 0.3}}></div>
                                    <div className=${`w-2 h-2 rounded-full ${hl(['--foreground'])}`} style=${{backgroundColor: 'var(--foreground)', opacity: 0.3}}></div>
                                </div>
                                <div className="flex-1"></div>
                                <div className=${`w-4 h-4 rounded ${hl(['--primary'])}`} style=${{backgroundColor: 'var(--primary)'}}></div>
                            </div>

                            <div className=${`flex-1 p-3 flex gap-2 overflow-hidden ${hl(['--background', '--foreground'])}`} style=${{backgroundColor: 'var(--background)', color: 'var(--foreground)'}}>
                                <div className=${`flex-1 rounded-lg p-2 border border-black/5 dark:border-white/5 flex flex-col gap-2 ${hl(['--theme-section'])}`} style=${{backgroundColor: 'var(--theme-section)'}}>
                                    <div className="text-[10px] opacity-50 font-bold uppercase tracking-wider">Parents</div>
                                    <div className=${`p-2 rounded border border-black/5 dark:border-white/5 ${hl(['--card', '--card-foreground'])}`} style=${{backgroundColor: 'var(--card)', color: 'var(--card-foreground)'}}>
                                        <div className="font-medium">Project Alpha</div>
                                    </div>
                                    <div className=${`p-3 rounded-lg border border-black/5 dark:border-white/5 text-center my-1 shadow-sm ${hl(['--card', '--card-foreground', '--primary'])}`} style=${{backgroundColor: 'var(--card)', color: 'var(--card-foreground)', boxShadow: '0 0 0 1px var(--primary)'}}>
                                        <div className="font-bold text-sm">Current Note</div>
                                        <div className="text-[9px] opacity-60 mt-1 uppercase">Subtitle</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 text-center">Changes are applied to the app upon Save.</p>
                    </div>
                </div>
            </div>
        `;
    };
})(window.Jaroet);