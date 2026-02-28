(function(J) {
    const { useState, useEffect } = React;
    const { getMentions } = J.Services.DB;

    J.MentionsModal = ({ isOpen, onClose, onSelect, currentNoteId, title }) => {
        const [notes, setNotes] = useState([]);

        useEffect(() => {
            if (isOpen && currentNoteId) {
                getMentions(currentNoteId).then(setNotes);
            } else {
                setNotes([]);
            }
        }, [isOpen, currentNoteId]);

        if (!isOpen) return null;

        return html`
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick=${onClose}>
                <div className="w-full max-w-2xl h-[80vh] bg-card rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col text-foreground" onClick=${e => e.stopPropagation()}>
                    <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-lg font-bold">Mentions for "${title}"</h2>
                        <button onClick=${onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><${J.Icons.Close} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        ${notes.length === 0 ? html`<div className="p-4 text-center text-gray-500">No mentions found.</div>` : notes.map(note => html`
                            <div key=${note.id} onClick=${() => onSelect(note.id, title)} className="flex justify-between items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-primary/10 cursor-pointer">
                                <span className="font-medium truncate">${note.title}</span>
                            </div>
                        `)}
                    </div>
                </div>
            </div>
        `;
    };
})(window.Jaroet);