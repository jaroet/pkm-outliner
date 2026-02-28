
(function(J) {
    const { useState, useEffect, useRef, useCallback } = React;
    const { searchNotes } = J.Services.DB;
    const { getNote } = J.Services.DB;
    J.LinkerModal = ({isOpen, type, onClose, onSelect, sourceNoteId}) => {
        const [query, setQuery] = useState('');
        const [results, setResults] = useState([]);
        const [selectedIndex, setSelectedIndex] = useState(0);
        const inputRef = useRef(null);
        const [sourceTitle, setSourceTitle] = useState('');

        useEffect(()=>{if(isOpen){setQuery('');setResults([]);setSelectedIndex(0);setTimeout(()=>inputRef.current?.focus(),50);}},[isOpen, sourceNoteId]);
        useEffect(()=>{const t=setTimeout(async()=>{if(query.trim()&&!query.includes(';'))setResults(await searchNotes(query));else setResults([]);},200);return()=>clearTimeout(t);},[query]);
        
        useEffect(() => {
            if (isOpen && sourceNoteId) {
                getNote(sourceNoteId).then(note => note && setSourceTitle(note.title));
            } else if (!isOpen) {
                setSourceTitle(''); // Reset when closed
            }
        }, [isOpen, sourceNoteId]);

        const { useClickOutside } = J.Hooks;
        const modalRef = useClickOutside(isOpen, useCallback(() => onClose(), []));

        const handleKeyDown=(e)=>{
            if(e.key==='ArrowDown')setSelectedIndex(p=>(p+1)%(results.length+1));
            else if(e.key==='ArrowUp')setSelectedIndex(p=>(p-1+results.length+1)%(results.length+1));
            else if(e.key==='Enter'){if(query.includes(';')){if(query.trim())onSelect(null,query);}else{if(selectedIndex<results.length)onSelect(results[selectedIndex].id);else if(query.trim())onSelect(null,query);}onClose();}
            else if(e.key==='Escape')onClose();
        };

        let createTitle = query;
        if (query.endsWith(' ,') && sourceTitle) {
            createTitle = `${query.substring(0, query.length - 2).trim()} - ${sourceTitle}`;
        }

        return html`
            ${!isOpen ? null : html`
            <div ref=${modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="w-96 bg-card p-4 rounded shadow-xl">
                    <h3 className="font-bold mb-2">Link ${type}</h3>
                    <input ref=${inputRef} className="w-full p-2 border rounded bg-background" value=${query} onChange=${e=>setQuery(e.target.value)} onKeyDown=${handleKeyDown} placeholder="Search or create..." />
                    <div className="mt-2 max-h-60 overflow-y-auto">
                        ${results.map((r,i)=>html`<div key=${r.id} onClick=${()=>{onSelect(r.id);onClose()}} className=${`p-2 cursor-pointer ${i===selectedIndex?'bg-primary text-primary-foreground':''}`}>${r.title}</div>`)}
                        ${query.trim()&&!query.includes(';')&&html`<div onClick=${()=>{onSelect(null,query);onClose()}} className=${`p-2 cursor-pointer ${selectedIndex===results.length?'bg-primary text-primary-foreground':''}`}>+ Create "${createTitle}"</div>`}
                    </div>
                </div>
            </div>
            `}
        `;
    };
})(window.Jaroet);
