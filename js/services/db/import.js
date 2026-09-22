(function(J) {
    const { db } = J.Services.DB;

    const importNotes=async(notes,mode)=>{
        const processNote = (n, idMap, titleMap) => {
            const newId = idMap.get(n.id) || n.id;
            const newTitle = titleMap.get(n.id) || n.title;
            const newLinksTo = (n.linksTo || []).map(lid => idMap.get(lid)).filter(Boolean);
            let newOutgoing = new Set((n.outgoingLinks || []).map(lid => idMap.get(lid)).filter(Boolean));
            let content = n.content || '';
            if (n.relatedTo && Array.isArray(n.relatedTo)) {
                const relatedLinks = [];
                n.relatedTo.forEach(rid => {
                    const targetId = idMap.get(rid);
                    const targetTitle = titleMap.get(rid);
                    if (targetId && targetTitle) {
                        newOutgoing.add(targetId);
                        relatedLinks.push(`[[${targetTitle}]]`);
                    }
                });
                if (relatedLinks.length > 0) content += `\n\nRelated: ${relatedLinks.join(', ')}`;
            }
            const { relatedTo, ...rest } = n;
            return { ...rest, id: newId, title: newTitle, linksTo: newLinksTo, outgoingLinks: Array.from(newOutgoing), content: content };
        };

        if(mode==='overwrite'){
            await db.notes.clear();
            const idMap = new Map(notes.map(n => [n.id, n.id]));
            const titleMap = new Map(notes.map(n => [n.id, n.title]));
            const processed = notes.map(n => processNote(n, idMap, titleMap));
            for(let i=0;i<processed.length;i+=50)await db.notes.bulkAdd(processed.slice(i,i+50));
            await db.meta.put({key:'favoritesList',value:processed.filter(n=>n.isFavorite).map(n=>n.id)});
            if(processed[0]){await db.meta.put({key:'currentCentralNoteId',value:processed[0].id});await db.meta.put({key:'homeNoteId',value:processed[0].id});}
        }else{
            const ex=new Set((await db.notes.toArray()).map(n=>n.title.toLowerCase()));
            const idMap=new Map(), titleMap=new Map(), ren=[];
            notes.forEach(n => {
                const newId = crypto.randomUUID();
                idMap.set(n.id, newId);
                let t = n.title, c = 1, r = false;
                while(ex.has(t.toLowerCase())){t=`${n.title} (${c++})`;r=true;}
                ex.add(t.toLowerCase());
                titleMap.set(n.id, t);
                if(r) ren.push(newId);
            });
            const add = notes.map(n => processNote(n, idMap, titleMap));
            if(ren.length)add.push({id:crypto.randomUUID(),title:`import_${Date.now()}`,content:'Renamed items',linksTo:ren,isFavorite:false,createdAt:Date.now(),modifiedAt:Date.now()});
            for(let i=0;i<add.length;i+=50)await db.notes.bulkAdd(add.slice(i,i+50));
        }
    };

    Object.assign(J.Services.DB, { importNotes });
})(window.Jaroet);