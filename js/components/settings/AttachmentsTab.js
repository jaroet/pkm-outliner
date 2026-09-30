(function(J) {
    const { useState, useEffect } = React;
    const { getAttachmentAliases, saveAttachmentAliases } = J.Services.DB;

    J.AttachmentsTab = ({isOpen, onSettingsChange}) => {
        const [aliases, setAliases] = useState([]);
        const [aliasName, setAliasName] = useState('');
        const [aliasPath, setAliasPath] = useState('');
        const [editingIndex, setEditingIndex] = useState(-1);

        useEffect(() => {
            if (isOpen) {
                getAttachmentAliases().then(setAliases);
            }
        }, [isOpen]);

        const handleSaveAlias = async () => {
            if (!aliasName.trim() || !aliasPath.trim()) return;
            let newAliases = [...aliases];
            if (editingIndex >= 0) {
                newAliases[editingIndex] = { alias: aliasName.trim(), path: aliasPath.trim() };
                setEditingIndex(-1);
            } else {
                newAliases.push({ alias: aliasName.trim(), path: aliasPath.trim() });
            }
            setAliases(newAliases);
            await saveAttachmentAliases(newAliases);
            setAliasName('');
            setAliasPath('');
            onSettingsChange();
        };

        const handleEditAlias = (index) => {
            const a = aliases[index];
            setAliasName(a.alias);
            setAliasPath(a.path);
            setEditingIndex(index);
        };

        const handleDeleteAlias = async (index) => {
            const newAliases = aliases.filter((_, i) => i !== index);
            setAliases(newAliases);
            await saveAttachmentAliases(newAliases);
            if (editingIndex === index) handleCancelEdit();
            onSettingsChange();
        };

        const handleCancelEdit = () => { setEditingIndex(-1); setAliasName(''); setAliasPath(''); };

        return html`
            <div className="space-y-6">
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Attachment Aliases</h3>
                    <div className="space-y-4">
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Alias (e.g. "ds")</label>
                                <input type="text" value=${aliasName} onChange=${e => setAliasName(e.target.value)} className="w-full p-2 rounded border border-gray-300 dark:border-gray-700 bg-background outline-none focus:ring-1 focus:ring-primary" placeholder="Alias" />
                            </div>
                            <div className="flex-[2]">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Path (e.g. "/Users/docs")</label>
                                <input type="text" value=${aliasPath} onChange=${e => setAliasPath(e.target.value)} className="w-full p-2 rounded border border-gray-300 dark:border-gray-700 bg-background outline-none focus:ring-1 focus:ring-primary" placeholder="Full Folder Path" />
                            </div>
                            <button onClick=${handleSaveAlias} disabled=${!aliasName.trim() || !aliasPath.trim()} className="px-4 py-2 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50 mb-[1px]">
                                ${editingIndex >= 0 ? 'Update' : 'Add'}
                            </button>
                            ${editingIndex >= 0 && html`
                                <button onClick=${handleCancelEdit} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-foreground rounded hover:opacity-80 mb-[1px]">Cancel</button>
                            `}
                        </div>

                        <div className="border rounded-lg border-gray-200 dark:border-gray-700 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-medium">
                                    <tr>
                                        <th className="px-4 py-2 w-1/4">Alias</th>
                                        <th className="px-4 py-2">Path</th>
                                        <th className="px-4 py-2 w-24 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    ${aliases.length === 0 ? html`<tr><td colSpan="3" className="px-4 py-4 text-center text-gray-400 italic">No aliases defined.</td></tr>` : aliases.map((a, i) => html`
                                        <tr key=${i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="px-4 py-2 font-mono text-primary">${a.alias}</td>
                                            <td className="px-4 py-2 font-mono text-xs opacity-80 break-all">${a.path}</td>
                                            <td className="px-4 py-2 text-right">
                                                <button onClick=${() => handleEditAlias(i)} className="text-blue-500 hover:underline mr-3">Edit</button>
                                                <button onClick=${() => handleDeleteAlias(i)} className="text-red-500 hover:underline">Delete</button>
                                            </td>
                                        </tr>
                                    `)}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-gray-400">Use <code>[[alias:filename.ext]]</code> in your notes. It will link to <code>file:///path/filename.ext</code>.</p>
                    </div>
                </div>
            </div>
        `;
    };
})(window.Jaroet);