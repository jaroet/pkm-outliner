(function(J) {
    const { useCallback, useEffect } = React;
    const { getAllNotes, updateNote, getTopology, getFavorites } = J.Services.DB;

    J.Hooks.useAutoSave = ({ activeNote, editContent, currentId, setTopo, setFavs }) => {
        const saveContent = useCallback(async (content) => {
            if (!activeNote) return;
            const id = activeNote.id;
            
            const WIKI_LINK_REGEX = /\[\[([^|\]\n]+)(?:\|[^\]\n]*)?\]\]/g;
            const outgoingLinkIds = new Set();
            let match;
            const allNotes = await getAllNotes();
            const titleToIdMap = new Map(allNotes.map(note => [note.title.toLowerCase(), note.id]));
            
            while ((match = WIKI_LINK_REGEX.exec(content)) !== null) {
                const linkTitle = match[1].trim().toLowerCase();
                if (titleToIdMap.has(linkTitle)) {
                    outgoingLinkIds.add(titleToIdMap.get(linkTitle));
                }
            }
            await updateNote(id, { content, outgoingLinks: Array.from(outgoingLinkIds) });
            getTopology(currentId).then(setTopo);
            getFavorites().then(setFavs);
        }, [activeNote, currentId]);

        useEffect(() => {
            const t = setTimeout(() => {
                if (activeNote && editContent !== activeNote.content) saveContent(editContent);
            }, 500);
            return () => clearTimeout(t);
        }, [editContent, activeNote, saveContent]);
    };
})(window.Jaroet);