(function(J) {
    const { db } = J.Services.DB;

    const getNote=(id)=>db.notes.get(id);
    const findNoteByTitle=(t)=>db.notes.where('title').equalsIgnoreCase(t).first();
    const getNoteTitlesByPrefix=async(p)=>(await db.notes.where('title').startsWith(p).toArray()).map(n=>n.title);
    const createNote=async(t)=>{const n={id:crypto.randomUUID(),title:t,content:'',linksTo:[],outgoingLinks:[],isFavorite:false,createdAt:Date.now(),modifiedAt:Date.now()};await db.notes.add(n);return n;};
    
    const updateNote = async (id, u) => {
        await db.notes.update(id, { ...u, modifiedAt: Date.now() });
        
        // Sync favorites if the Favorites note's children (linksTo) are updated
        const favId = await getFavoritesNoteId();
        if (id === favId && u.linksTo) {
            const metaFavs = await db.meta.get('favoritesList');
            const oldFavs = new Set(metaFavs ? metaFavs.value : []);
            const newFavs = new Set(u.linksTo);
            
            const toAdd = u.linksTo.filter(x => !oldFavs.has(x));
            const toRemove = (metaFavs ? metaFavs.value : []).filter(x => !newFavs.has(x));
            
            if (toAdd.length) await db.notes.where('id').anyOf(toAdd).modify({ isFavorite: true });
            if (toRemove.length) await db.notes.where('id').anyOf(toRemove).modify({ isFavorite: false });
            
            await db.meta.put({ key: 'favoritesList', value: u.linksTo });
        }
    };

    const deleteNote=async(id)=>db.transaction('rw',db.notes,db.meta,async()=>{await db.notes.delete(id);await db.notes.where('linksTo').equals(id).modify(n=>{n.linksTo=n.linksTo.filter(x=>x!==id);n.modifiedAt=Date.now();});const f=await db.meta.get('favoritesList');if(f&&f.value.includes(id))await db.meta.put({key:'favoritesList',value:f.value.filter(x=>x!==id)});});
    const getNoteCount=()=>db.notes.count();
    
    const getTopology=async(cid)=>{
        const c=await db.notes.get(cid);if(!c)return{center:null,uppers:[],downers:[]};
        let u=await db.notes.where('linksTo').equals(cid).toArray();
        let d=(await db.notes.bulkGet(c.linksTo)).filter(Boolean);

        u.sort((a, b) => a.title.localeCompare(b.title));
        
        let sortMode = c.childSort;
        if (!sortMode) {
            const isJournal = /^(Journal Hub|\d{4}(-\d{2})?(-\d{2})?)$/.test(c.title);
            sortMode = isJournal ? 'title_desc' : 'title_asc';
        }

        if (sortMode !== 'manual') {
            d.sort((a, b) => {
                switch (sortMode) {
                    case 'title_asc': return a.title.localeCompare(b.title);
                    case 'title_desc': return b.title.localeCompare(a.title);
                    case 'created_asc': return a.createdAt - b.createdAt;
                    case 'created_desc': return b.createdAt - a.createdAt;
                    case 'modified_asc': return a.modifiedAt - b.modifiedAt;
                    case 'modified_desc': return b.modifiedAt - a.modifiedAt;
                    default: return 0;
                }
            });
        }

        return{center:c,uppers:u.filter(Boolean),downers:d};
    };
    
    const getFavoritesNoteId = async () => {
        let meta = await db.meta.get('favoritesNoteId');
        if (meta) {
            const exists = await db.notes.get(meta.value);
            if (exists) return meta.value;
        }
        let note = await findNoteByTitle('Favorites');
        if (!note) {
            note = await createNote('Favorites');
            await db.notes.update(note.id, { childSort: 'manual' }); // Default to manual for favorites
            const favsList = await db.meta.get('favoritesList');
            if (favsList && favsList.value.length) {
                await db.notes.update(note.id, { linksTo: favsList.value });
            }
        }
        await db.meta.put({ key: 'favoritesNoteId', value: note.id });
        return note.id;
    };

    const getFavorites = async () => {
        const favId = await getFavoritesNoteId();
        const favNote = await db.notes.get(favId);
        if (!favNote) return [];
        
        let notes = await db.notes.bulkGet(favNote.linksTo);
        notes = notes.filter(Boolean);
        
        let sortMode = favNote.childSort || 'manual';
        if (sortMode !== 'manual') {
            notes.sort((a, b) => {
                switch (sortMode) {
                    case 'title_asc': return a.title.localeCompare(b.title);
                    case 'title_desc': return b.title.localeCompare(a.title);
                    case 'created_asc': return a.createdAt - b.createdAt;
                    case 'created_desc': return b.createdAt - a.createdAt;
                    case 'modified_asc': return a.modifiedAt - b.modifiedAt;
                    case 'modified_desc': return b.modifiedAt - a.modifiedAt;
                    default: return 0;
                }
            });
        }
        return notes;
    };

    const toggleFavorite = async (id) => {
        const n = await db.notes.get(id);
        if (n) {
            const newStatus = !n.isFavorite;
            await updateNote(id, { isFavorite: newStatus });
            
            const favId = await getFavoritesNoteId();
            const favNote = await db.notes.get(favId);
            if (favNote) {
                let links = favNote.linksTo || [];
                if (newStatus && !links.includes(id)) {
                    links.push(id);
                    await updateNote(favId, { linksTo: links });
                } else if (!newStatus && links.includes(id)) {
                    links = links.filter(x => x !== id);
                    await updateNote(favId, { linksTo: links });
                }
            }
        }
    };

    const getHomeNoteId=async()=>(await db.meta.get('homeNoteId'))?.value;
    const setHomeNoteId=(id)=>db.meta.put({key:'homeNoteId',value:id});

    Object.assign(J.Services.DB, {
        getNote, findNoteByTitle, getNoteTitlesByPrefix, createNote, updateNote, deleteNote, getNoteCount,
        getTopology, getFavorites, toggleFavorite, getHomeNoteId, setHomeNoteId
    });
})(window.Jaroet);