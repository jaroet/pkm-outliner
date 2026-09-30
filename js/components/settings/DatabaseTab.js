(function(J) {
    const { useState, useEffect, useRef } = React;
    const { getCurrentVaultName, createVault, deleteCurrentVault, resetCurrentVault } = J.Services.DB;

    J.DatabaseTab = ({isOpen, focusOn}) => {
        const [newV, setNewV] = useState('');
        const [confDel, setConfDel] = useState(false);
        const [confReset, setConfReset] = useState(false);
        const [curVault, setCurVault] = useState('');
        const [dbLocation, setDbLocation] = useState('');
        const newVaultInputRef = useRef(null);

        useEffect(() => {
            if (isOpen) {
                const cv = getCurrentVaultName();
                setCurVault(cv);
                try {
                    const origin = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null') ? window.location.origin : 'local-file';
                    setDbLocation(`indexeddb://${origin}/${cv}`);
                } catch (e) {
                    setDbLocation(`indexeddb://<unknown>/${cv}`);
                }
                setConfDel(false); setConfReset(false); setNewV('');

                if (focusOn === 'newVaultInput') {
                    setTimeout(() => newVaultInputRef.current?.focus(), 100);
                }
            }
        }, [isOpen]);

        return html`
            <div className="space-y-6">
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Current Database</h3>
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded mb-4 border border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-500 mb-1">Active Vault</div>
                        <div className="font-mono font-bold text-lg text-primary truncate">${curVault}</div>
                    </div>
                </div>

                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">IndexedDB Location</h3>
                                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded mb-4 border border-gray-200 dark:border-gray-700">
                                    <div className="text-xs text-gray-500 mb-1">Where data is stored (read-only)</div>
                                    <div className="font-mono text-sm break-words text-foreground">${dbLocation}</div>
                                </div>
                            </div>

                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">New Vault</h3>
                    <div className="flex gap-2">
                        <input ref=${newVaultInputRef} type="text" placeholder="Vault Name..." className="flex-1 p-2 rounded border border-gray-300 dark:border-gray-700 bg-background outline-none focus:ring-1 focus:ring-primary"
                            value=${newV} onChange=${e => setNewV(e.target.value)} onKeyDown=${e => e.key === 'Enter' && newV.trim() && createVault(newV.trim())} />
                        <button onClick=${() => newV.trim() && createVault(newV)} disabled=${!newV.trim()} className="px-3 py-2 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50">Create</button>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Danger Zone</h3>
                    <div>
                        <button onClick=${() => confReset ? resetCurrentVault() : setConfReset(true)} className=${`w-full py-2 px-4 rounded text-sm font-medium transition-all ${confReset ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 dark:bg-gray-700 text-foreground hover:opacity-80'}`}>
                            ${confReset ? 'Confirm: Reset (Clear Data)' : 'Reset Current Vault'}
                        </button>
                        ${confReset && html`<p className="text-xs text-red-500 mt-1 text-center">Warning: All notes in this vault will be lost.</p>`}
                    </div>
                    <div>
                        <button onClick=${() => confDel ? deleteCurrentVault() : setConfDel(true)} className=${`w-full py-2 px-4 rounded text-sm font-medium transition-all ${confDel ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}>
                            ${confDel ? 'Confirm: DELETE VAULT PERMANENTLY' : 'Delete Current Vault'}
                        </button>
                        ${confDel && html`<p className="text-xs text-red-500 mt-1 text-center">Warning: This vault and all its data will be destroyed.</p>`}
                    </div>
                </div>
            </div>
        `;
    };
})(window.Jaroet);