(function(J) {
    const { useState, useEffect } = React;

    J.SettingsModal = ({isOpen, onClose, currentCentralNoteId, fontSize, onFontSizeChange, onThemeChange, onSettingsChange, initialTab, focusOn}) => {
        const { GeneralTab, ThemeTab, DatabaseTab, AttachmentsTab } = J;
        const [tab, setTab] = useState(initialTab || 'general');

        // Tab Navigation
        useEffect(() => {
            if (!isOpen) return;
            const handleKeyDown = (e) => {
                if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
                    e.preventDefault();
                    const tabs = ['general', 'theme', 'database', 'attachments'];
                    const curr = tabs.indexOf(tab);
                    const dir = e.key === 'ArrowRight' ? 1 : -1;
                    const next = (curr + dir + tabs.length) % tabs.length;
                    setTab(tabs[next]);
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }, [isOpen, tab]);

        if (!isOpen) return null;

        return html`
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="w-full max-w-[90vw] h-[85vh] bg-card rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col text-foreground">
                    
                    <div className="flex justify-between items-center p-6 pb-2">
                        <h2 className="text-xl font-bold">Settings</h2>
                        <button onClick=${onClose} className="text-gray-500 hover:text-foreground">✕</button>
                    </div>

                    <div className="flex border-b border-gray-200 dark:border-gray-800 px-6">
                        ${['general', 'theme', 'database', 'attachments'].map(t => html`
                            <button 
                                key=${t}
                                onClick=${() => setTab(t)}
                                className=${`py-2 px-4 text-sm font-medium border-b-2 transition-colors capitalize ${
                                    tab === t ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-foreground'
                                }`}
                            >
                                ${t}
                            </button>
                        `)}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className=${tab === 'general' ? '' : 'hidden'}>
                            <${GeneralTab} isOpen=${isOpen} currentCentralNoteId=${currentCentralNoteId} fontSize=${fontSize} onFontSizeChange=${onFontSizeChange} onSettingsChange=${onSettingsChange} />
                        </div>
                        <div className=${tab === 'theme' ? '' : 'hidden'}>
                            <${ThemeTab} isOpen=${isOpen} onThemeChange=${onThemeChange} />
                        </div>
                        <div className=${tab === 'database' ? '' : 'hidden'}>
                            <${DatabaseTab} isOpen=${isOpen} focusOn=${focusOn} />
                        </div>
                        <div className=${tab === 'attachments' ? '' : 'hidden'}>
                            <${AttachmentsTab} isOpen=${isOpen} onSettingsChange=${onSettingsChange} />
                        </div>
                    </div>

                    <div className="flex justify-end p-4 border-t border-gray-100 dark:border-gray-800">
                        <button onClick=${onClose} className="px-4 py-2 rounded bg-primary text-white hover:opacity-90">Done</button>
                    </div>
                </div>
            </div>
        `;
    };
})(window.Jaroet);