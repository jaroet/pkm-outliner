(function(J) {
    const { db } = J.Services.DB;

    const searchNotes = async (q) => {
        const query = q.trim().toLowerCase();
        if (!query) return [];
    
        const results = new Map();
    
        await db.notes.each(note => {
            const titleLower = note.title.toLowerCase();
            const index = titleLower.indexOf(query);
    
            if (index !== -1) {
                // Score higher for matches at the beginning of the title
                const score = index === 0 ? 1000 : 500;
                results.set(note.id, { id: note.id, title: note.title, score: score - note.title.length });
            }
        });
    
        return Array.from(results.values()).sort((a, b) => b.score - a.score).slice(0, 200);
    };
    const getAllNotes=()=>db.notes.toArray();
    const getAllNotesSortedBy=async(field)=>db.notes.orderBy(field).reverse().toArray();
    
    const searchContent = async (query) => {
        const q = query.toLowerCase();
        if (!q) return [];
        const results = [];
        
        // Linear scan of all notes
        await db.notes.each(note => {
            if (note.content) {
                const contentLower = note.content.toLowerCase();
                const idx = contentLower.indexOf(q);
                if (idx !== -1) {
                    // Count occurrences
                    let count = 0;
                    let pos = idx;
                    while (pos !== -1) {
                        count++;
                        pos = contentLower.indexOf(q, pos + 1);
                    }
                    
                    // Generate Snippet (approx 40 chars before, 60 after)
                    const start = Math.max(0, idx - 40);
                    const end = Math.min(note.content.length, idx + query.length + 60);
                    let snippet = note.content.substring(start, end);
                    if (start > 0) snippet = '...' + snippet;
                    if (end < note.content.length) snippet = snippet + '...';

                    results.push({ id: note.id, title: note.title, snippet, count, modifiedAt: note.modifiedAt, createdAt: note.createdAt });
                }
            }
        });
        return results.sort((a, b) => b.count - a.count);
    };

    const getMentions = async (id) => {
        return await db.notes.where('outgoingLinks').equals(id).toArray();
    };

    Object.assign(J.Services.DB, { searchNotes, getAllNotes, getAllNotesSortedBy, searchContent, getMentions });
})(window.Jaroet);