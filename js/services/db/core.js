(function(J) {
    const VL='pkm_outliner_vaults',CV='pkm_outliner_current_vault',DV='PKM-Outliner';
    if(!localStorage.getItem(VL))localStorage.setItem(VL,JSON.stringify([DV]));
    if(!localStorage.getItem(CV))localStorage.setItem(CV,DV);
    
    const getVaultList=()=>JSON.parse(localStorage.getItem(VL)||'[]');
    const getCurrentVaultName=()=>localStorage.getItem(CV)||DV;
    
    class DB extends Dexie{constructor(){super(getCurrentVaultName());
        this.version(1).stores({notes:'id,title,*linksTo,*relatedTo',meta:'key'});
        this.version(2).stores({notes:'id,title,*linksTo,*relatedTo,createdAt,modifiedAt'});
        this.version(3).stores({notes:'id,title,*linksTo,*relatedTo,createdAt,modifiedAt', themes: 'id'});
        this.version(4).stores({notes:'id,title,*linksTo,*relatedTo,*outgoingLinks,createdAt,modifiedAt', themes: 'id'}).upgrade(async tx => {
            const notes = await tx.table('notes').toArray();
            const titleMap = new Map(notes.map(n => [n.title.toLowerCase(), n.id]));
            const regex = /\[\[([^|\]\n]+)(?:\|[^\]\n]*)?\]\]/g;
            const updates = [];
            for (const note of notes) {
                const outgoingLinks = new Set();
                if (note.content) {
                    let match;
                    while ((match = regex.exec(note.content)) !== null) {
                        const t = match[1].trim().toLowerCase();
                        if (titleMap.has(t)) outgoingLinks.add(titleMap.get(t));
                    }
                }
                note.outgoingLinks = Array.from(outgoingLinks);
                updates.push(note);
            }
            if (updates.length > 0) await tx.table('notes').bulkPut(updates);
        });
        this.version(5).stores({notes:'id,title,*linksTo,*outgoingLinks,createdAt,modifiedAt', themes: 'id'}).upgrade(async tx => {
            const notes = await tx.table('notes').toArray();
            const idToTitle = new Map(notes.map(n => [n.id, n.title]));
            const updates = [];
            for (const note of notes) {
                if (note.relatedTo && note.relatedTo.length > 0) {
                    let links = [];
                    for (const relId of note.relatedTo) {
                        const t = idToTitle.get(relId);
                        if (t) links.push(`[[${t}]]`);
                    }
                    if (links.length > 0) {
                        const append = `\n\nRelated: ${links.join(', ')}`;
                        note.content = (note.content || '') + append;
                        const outgoing = new Set(note.outgoingLinks || []);
                        note.relatedTo.forEach(id => outgoing.add(id));
                        note.outgoingLinks = Array.from(outgoing);
                    }
                }
                delete note.relatedTo;
                updates.push(note);
            }
            if (updates.length > 0) await tx.table('notes').bulkPut(updates);
        });
        this.version(6).stores({notes:'id,title,*linksTo,*outgoingLinks,createdAt,modifiedAt,childSort', themes: 'id'});
    }}
    const db=new DB(); 

    // Request persistent storage to prevent eviction
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persisted().then(persisted => {
            if (!persisted) {
                navigator.storage.persist().then(granted => {
                    console.log(`Storage persistence: ${granted ? 'granted' : 'denied'}`);
                });
            }
        });
    }

    const switchVault=(n)=>{if(getVaultList().includes(n)){localStorage.setItem(CV,n);window.location.reload();}};
    const createVault=(n)=>{const l=getVaultList(),s=n.trim();if(s&&!l.includes(s)){l.push(s);localStorage.setItem(VL,JSON.stringify(l));localStorage.setItem(CV,s);window.location.reload();}};
    const deleteCurrentVault=async()=>{const c=getCurrentVaultName();db.close();await Dexie.delete(c);let l=getVaultList().filter(v=>v!==c);if(!l.length)l.push(DV);localStorage.setItem(VL,JSON.stringify(l));localStorage.setItem(CV,l[0]);window.location.reload();};
    const resetCurrentVault=async()=>{await db.transaction('rw',db.notes,db.meta,async()=>{await db.notes.clear();await db.meta.clear();});window.location.reload();};
    
    const seedDatabase=async()=>{
        if(await db.notes.count()===0){
            const id=crypto.randomUUID(),now=Date.now();
            await db.notes.add({id,title:'Start',content:'# Start\n\n',linksTo:[],isFavorite:false,createdAt:now,modifiedAt:now});
            await db.meta.put({key:'currentCentralNoteId',value:id});await db.meta.put({key:'favoritesList',value:[]});await db.meta.put({key:'homeNoteId',value:id});
        }
        
        // Seed Themes (Version 3 feature)
        const defaultThemes = [
                {
                    id: 'light', name: 'JaRoet Light', type: 'light',
                    values: {
                        '--background': '#f8fafc', '--foreground': '#0f172a', '--card': '#ffffff', '--card-foreground': '#0f172a',
                        '--primary': '#3b82f6', '--primary-foreground': '#ffffff', '--scrollbar-thumb': '#94a3b8',
                        '--theme-bg': '#f1f5f9', '--theme-section': '#ffffff', '--theme-bars': '#e2e8f0', '--theme-accent': '#3b82f6'
                    }
                },
                {
                    id: 'solarized-light', name: 'Solarized Light', type: 'light',
                    values: {
                        '--background': '#fdf6e3', '--foreground': '#657b83', '--card': '#eee8d5', '--card-foreground': '#586e75',
                        '--primary': '#268bd2', '--primary-foreground': '#ffffff', '--scrollbar-thumb': '#93a1a1',
                        '--theme-bg': '#fdf6e3', '--theme-section': '#eee8d5', '--theme-bars': '#eee8d5', '--theme-accent': '#268bd2'
                    }
                },
                {
                    id: 'nord-light', name: 'Nord Light', type: 'light',
                    values: {
                        '--background': '#eceff4', '--foreground': '#2e3440', '--card': '#e5e9f0', '--card-foreground': '#2e3440',
                        '--primary': '#5e81ac', '--primary-foreground': '#eceff4', '--scrollbar-thumb': '#d8dee9',
                        '--theme-bg': '#eceff4', '--theme-section': '#e5e9f0', '--theme-bars': '#d8dee9', '--theme-accent': '#5e81ac'
                    }
                },
                {
                    id: 'github-light', name: 'GitHub Light', type: 'light',
                    values: {
                        '--background': '#ffffff', '--foreground': '#24292f', '--card': '#f6f8fa', '--card-foreground': '#24292f',
                        '--primary': '#0969da', '--primary-foreground': '#ffffff', '--scrollbar-thumb': '#d0d7de',
                        '--theme-bg': '#ffffff', '--theme-section': '#f6f8fa', '--theme-bars': '#f6f8fa', '--theme-accent': '#0969da'
                    }
                },
                {
                    id: 'sepia', name: 'Sepia (Warm)', type: 'light',
                    values: {
                        '--background': '#f4ecd8', '--foreground': '#5b4636', '--card': '#e4d8b4', '--card-foreground': '#5b4636',
                        '--primary': '#d2691e', '--primary-foreground': '#ffffff', '--scrollbar-thumb': '#c0b090',
                        '--theme-bg': '#f4ecd8', '--theme-section': '#e4d8b4', '--theme-bars': '#e4d8b4', '--theme-accent': '#d2691e'
                    }
                },
                {
                    id: 'dark', name: 'JaRoet Dark', type: 'dark',
                    values: {
                        '--background': '#0f172a', '--foreground': '#f8fafc', '--card': '#1e293b', '--card-foreground': '#f8fafc',
                        '--primary': '#60a5fa', '--primary-foreground': '#0f172a', '--scrollbar-thumb': '#475569',
                        '--theme-bg': '#0f172a', '--theme-section': '#1e293b', '--theme-bars': '#0f172a', '--theme-accent': '#60a5fa'
                    }
                },
                {
                    id: 'dracula', name: 'Dracula', type: 'dark',
                    values: {
                        '--background': '#282a36', '--foreground': '#f8f8f2', '--card': '#44475a', '--card-foreground': '#f8f8f2',
                        '--primary': '#bd93f9', '--primary-foreground': '#282a36', '--scrollbar-thumb': '#6272a4',
                        '--theme-bg': '#282a36', '--theme-section': '#44475a', '--theme-bars': '#282a36', '--theme-accent': '#bd93f9'
                    }
                },
                {
                    id: 'monokai', name: 'Monokai', type: 'dark',
                    values: {
                        '--background': '#272822', '--foreground': '#f8f8f2', '--card': '#3e3d32', '--card-foreground': '#f8f8f2',
                        '--primary': '#a6e22e', '--primary-foreground': '#272822', '--scrollbar-thumb': '#75715e',
                        '--theme-bg': '#272822', '--theme-section': '#3e3d32', '--theme-bars': '#272822', '--theme-accent': '#a6e22e'
                    }
                },
                {
                    id: 'nord-dark', name: 'Nord Dark', type: 'dark',
                    values: {
                        '--background': '#2e3440', '--foreground': '#d8dee9', '--card': '#3b4252', '--card-foreground': '#d8dee9',
                        '--primary': '#88c0d0', '--primary-foreground': '#2e3440', '--scrollbar-thumb': '#4c566a',
                        '--theme-bg': '#2e3440', '--theme-section': '#3b4252', '--theme-bars': '#2e3440', '--theme-accent': '#88c0d0'
                    }
                },
                {
                    id: 'github-dark', name: 'GitHub Dark', type: 'dark',
                    values: {
                        '--background': '#0d1117', '--foreground': '#c9d1d9', '--card': '#161b22', '--card-foreground': '#c9d1d9',
                        '--primary': '#58a6ff', '--primary-foreground': '#0d1117', '--scrollbar-thumb': '#30363d',
                        '--theme-bg': '#0d1117', '--theme-section': '#161b22', '--theme-bars': '#0d1117', '--theme-accent': '#58a6ff'
                    }
                }
        ];

        const existingIds = new Set(await db.themes.toCollection().primaryKeys());
        const missing = defaultThemes.filter(t => !existingIds.has(t.id));
        if(missing.length > 0) await db.themes.bulkAdd(missing);
        
        if(!(await db.meta.get('activeThemeId'))) await db.meta.put({key:'activeThemeId', value:'dark'});
        
        return (await db.meta.get('currentCentralNoteId'))?.value;
    };

    J.Services.DB = {
        db, getVaultList, getCurrentVaultName, switchVault, createVault, deleteCurrentVault, resetCurrentVault, seedDatabase
    };
})(window.Jaroet);