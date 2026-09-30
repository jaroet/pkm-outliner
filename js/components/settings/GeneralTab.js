(function(J) {
    const { useState, useEffect } = React;
    const { getHomeNoteId, getNote, getSectionVisibility, setSectionVisibility, setHomeNoteId, searchNotes, setFontSize: dbSetFontSize } = J.Services.DB;

    J.GeneralTab = ({isOpen, currentCentralNoteId, fontSize, onFontSizeChange, onSettingsChange}) => {
        const [homeTitle, setHomeTitle] = useState('Loading...');
        const [q, setQ] = useState('');
        const [res, setRes] = useState([]);
        const [localFs, setLocalFs] = useState(fontSize);
        const [vis, setVis] = useState({showFavorites: true});

        useEffect(() => {
            if (isOpen) {
                const init = async () => {
                    const hid = await getHomeNoteId();
                    if (hid) {
                        const n = await getNote(hid);
                        setHomeTitle(n ? n.title : 'Unknown Note');
                    } else {
                        setHomeTitle('Not Set');
                    }
                    const v = await getSectionVisibility();
                    setVis(v);
                    setLocalFs(fontSize);
                    setQ(''); setRes([]);
                };
                init();
            }
        }, [isOpen, fontSize]);

        const handleSearch = async (val) => {
            setQ(val);
            if (val.trim()) setRes(await searchNotes(val));
            else setRes([]);
        };

        const setHome = async (id, title) => {
            await setHomeNoteId(id);
            setHomeTitle(title);
            setQ(''); setRes([]);
        };

        const handleVisChange = async (key, val) => {
            const newVis = { ...vis, [key]: val };
            setVis(newVis);
            await setSectionVisibility(key, val);
            onSettingsChange();
        };

        return html`
            <div className="space-y-6">
                <div className="border-b border-gray-100 dark:border-gray-800 pb-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Interface Font Size</h3>
                    <div className="flex items-center gap-4">
                        <span className="text-sm w-8">${localFs}px</span>
                        <input 
                            type="range" min="12" max="32" step="1" 
                            value=${localFs} 
                            onChange=${async e => {
                                const s = parseInt(e.target.value);
                                setLocalFs(s); onFontSizeChange(s); await dbSetFontSize(s);
                            }}
                            className="flex-1 accent-primary"
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Affects note lists. Central note is 150% of this size.</p>
                </div>

                <div className="border-b border-gray-100 dark:border-gray-800 pb-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Section Visibility</h3>
                    <div className="flex flex-col gap-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                checked=${vis.showFavorites} onChange=${e => handleVisChange('showFavorites', e.target.checked)} />
                            <span className="text-sm font-medium">Show Favorites Section</span>
                        </label>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Home Note</h3>
                    <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-3 rounded border border-gray-200 dark:border-gray-700 mb-2">
                        <span className="font-medium truncate">${homeTitle}</span>
                    </div>
                    
                    <button 
                        onClick=${async () => {
                            if (currentCentralNoteId) {
                                const n = await getNote(currentCentralNoteId);
                                if(n) setHome(n.id, n.title);
                            }
                        }}
                        className="w-full py-2 px-4 bg-primary/10 text-primary rounded hover:bg-primary/20 text-sm font-medium mb-4"
                    >
                        Set Current View as Home
                    </button>

                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search note to set as Home..." 
                            className="w-full p-2 rounded border border-gray-300 dark:border-gray-700 bg-background focus:ring-2 focus:ring-primary outline-none"
                            value=${q} onChange=${e => handleSearch(e.target.value)}
                        />
                        ${res.length > 0 && html`
                            <div className="absolute top-full left-0 right-0 bg-card border border-gray-200 dark:border-gray-700 shadow-lg rounded-b mt-1 z-50 max-h-48 overflow-y-auto">
                                ${res.map(r => html`
                                    <div key=${r.id} onClick=${() => setHome(r.id, r.title)} className="p-2 hover:bg-primary/10 cursor-pointer text-sm">
                                        ${r.title}
                                    </div>
                                `)}
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    };
})(window.Jaroet);