
(function(J) {
    const { useState, useEffect, useRef, useCallback, useMemo } = React;
    const { db, getTopology, createNote, updateNote, deleteNote, getFavorites, toggleFavorite, seedDatabase, getNote, getAllNotes, importNotes, getHomeNoteId, searchNotes, getFontSize, getNoteCount, getVaultList, getCurrentVaultName, switchVault, getSectionVisibility, findNoteByTitle, getNoteTitlesByPrefix, getSortOrder, setSortOrder: persistSortOrder, getActiveThemeId, getTheme, setActiveThemeId, getThemes, getAttachmentAliases } = J.Services.DB;
    const { goToDate, goToToday, getDateSubtitle } = J.Services.Journal; 
    const { createRenderer, wikiLinkExtension, setAttachmentAliases } = J.Services.Markdown;
    const { NoteCard, LinkerModal, Editor, SettingsModal, ImportModal, RenameModal, NoteSection, TopBar, StatusBar, Icons, AllNotesModal, ContentSearchModal, VaultChooser, APP_VERSION, Components: { SectionContainer } } = J;
    const { useHistory } = J.Hooks;

    marked.use({renderer:createRenderer({clickableCheckboxes:false}),extensions:[wikiLinkExtension]});

    J.App = () => {
        // --- State ---
        const {currentId,visit,replace,back,forward,canBack,canForward}=useHistory();
        const [topo,setTopo]=useState({center:null,uppers:[],downers:[]}),[favs,setFavs]=useState([]),[dark,setDark]=useState(true),[fs,setFs]=useState(16),[vis,setVis]=useState({showFavorites:true,showContent:true}),[count,setCount]=useState(0),[themes,setThemes]=useState([]), [mentions, setMentions] = useState([]);
        const [sortOrder, setSortOrder] = useState('title-asc');
        const [contentSource, setContentSource] = useState(null);
        const [editContent, setEditContent] = useState('');
        
        // Navigation State
        const [fSec,setFSec]=useState('center'),[fIdx,setFIdx]=useState(0),[sel,setSel]=useState(new Set());
        const [secInd,setSecInd]=useState({up:0,down:0,favs:0,mentions:0});
        const scrollRef=useRef({});
        
        // Refs for Event Listeners
        const selRef=useRef(new Set());
        const fSecRef=useRef('center');
        const fIdxRef=useRef(0);
        const topoRef=useRef({center:null,uppers:[],downers:[]});
        const favsRef=useRef([]);
        const visRef=useRef({showFavorites:true,showContent:true});
        const secIndRef=useRef({up:0,down:0,favs:0});
        const mentionsRef=useRef([]);

        // UI State & Modals (removed `menu` and `setMenu`)
        const [favDrop,setFavDrop]=useState(false),[cal,setCal]=useState(false),[calD,setCalD]=useState(new Set());
        const [vaultChooser, setVaultChooser] = useState(false);
        const [search,setSearch]=useState(''),[sRes,setSRes]=useState([]),[sIdx,setSIdx]=useState(0),[sAct,setSAct]=useState(false);
        const [contentSearch, setContentSearch] = useState(false), [contentSearchState, setContentSearchState] = useState({ query: '', results: [] });
        const [ed,setEd]=useState(false),[edMode,setEdMode]=useState('view'),[lnk,setLnk]=useState(false),[lnkType,setLnkType]=useState('up'),[ren,setRen]=useState(false),[renN,setRenN]=useState(null),[sett,setSett]=useState(false),[imp,setImp]=useState(false),[impD,setImpD]=useState([]),[allNotes,setAllNotes]=useState(false);
        const searchInputRef=useRef(null);
        const textareaRef = useRef(null);

        // --- Effects & Sync ---
        useEffect(()=>{
            const init = async () => {
                const initialId = await seedDatabase();
                const currentNoteId = (await db.meta.get('currentCentralNoteId'))?.value || initialId;
                replace(currentNoteId);
                getFontSize().then(setFs);
                getSectionVisibility().then(setVis);
                getSortOrder().then(setSortOrder);
                getFavorites().then(setFavs);
                getThemes().then(setThemes);
                getAttachmentAliases().then(a => {
                    setAttachmentAliases(a);
                    // Force re-render of content if needed, though markdown parsing happens in Editor/NoteSection
                });
                
                // Load Theme
                const tId = await getActiveThemeId();
                const theme = await getTheme(tId) || await getTheme('dark');
                if(theme) applyTheme(theme);
            };
            init();},[]);

        const applyTheme = (theme) => {
            setDark(theme.type === 'dark');
            document.documentElement.classList.toggle('dark', theme.type === 'dark');
            const root = document.documentElement;
            Object.entries(theme.values).forEach(([k, v]) => root.style.setProperty(k, v));
        };

        useEffect(()=>{
            if(currentId){
                getTopology(currentId).then(setTopo);
                db.meta.put({key:'currentCentralNoteId',value:currentId});
                setFSec('center');setFIdx(0);setSel(new Set());scrollRef.current={};
                setSecInd({up:0,down:0,favs:0});
                getNoteCount().then(setCount);
            }
        },[currentId]);

        useEffect(() => {
            if (!topo.center) {
                setMentions([]);
                return;
            }
            let isMounted = true;
            db.notes.where('outgoingLinks').equals(topo.center.id).toArray().then(m => {
                if (isMounted) setMentions(m);
            });
            return () => { isMounted = false; };
        }, [topo.center]);

        // Sync Refs
        useEffect(()=>{selRef.current=sel},[sel]);
        useEffect(()=>{fSecRef.current=fSec},[fSec]);
        useEffect(()=>{fIdxRef.current=fIdx},[fIdx]);
        useEffect(()=>{topoRef.current=topo},[topo]);
        useEffect(()=>{favsRef.current=favs},[favs]);
        useEffect(()=>{visRef.current=vis},[vis]);
        useEffect(()=>{secIndRef.current=secInd},[secInd]);
        useEffect(()=>{mentionsRef.current=mentions},[mentions]);

        // Helper: Get Sorted Notes
        const sortNotes = useCallback((notes) => {
            if (!notes) return [];
            const n = [...notes];
            const getVal = (obj, key) => obj[key] || 0;
            switch (sortOrder) {
                case 'title-desc': return n.sort((a, b) => b.title.localeCompare(a.title));
                case 'created-asc': return n.sort((a, b) => getVal(a, 'createdAt') - getVal(b, 'createdAt'));
                case 'created-desc': return n.sort((a, b) => getVal(b, 'createdAt') - getVal(a, 'createdAt'));
                case 'modified-asc': return n.sort((a, b) => getVal(a, 'modifiedAt') - getVal(b, 'modifiedAt'));
                case 'modified-desc': return n.sort((a, b) => getVal(b, 'modifiedAt') - getVal(a, 'modifiedAt'));
                default: return n.sort((a, b) => a.title.localeCompare(b.title));
            }
        }, [sortOrder]);

        const getSortedNotes = (sec, t=topo, f=favs, m=mentions) => {
            if(sec==='center')return t.center?[t.center]:[];
            let n=[]; 
            if(sec==='up')n=t.uppers;
            else if(sec==='down')n=t.downers;
            else if(sec==='favs')n=f;
            else if(sec==='mentions')n=m;
            return sortNotes(n);
        };

        const getFocusedNote = () => {
            const section = fSec === 'content' ? (contentSource || 'center') : fSec;
            if (section === 'center') return topo.center;
            const index = fSec === 'content' ? (secInd[section] || 0) : fIdx;
            return getSortedNotes(section, topo, favs, mentions)[index] || null;
        };

        const activeNote = getFocusedNote();
        const prevH = useMemo(() => activeNote && activeNote.content ? marked.parse(activeNote.content) : '', [activeNote]);

        useEffect(() => {
            if (activeNote) {
                setEditContent(activeNote.content || '');
            }
        }, [activeNote?.id]);

        // Remember indices
        useEffect(()=>{if(fSec!=='center'&&fSec!=='content')setSecInd(p=>({...p,[fSec]:fIdx}));},[fIdx,fSec]);

        // Scroll Into View
        useEffect(()=>{
            if(fSec!=='center'&&fSec!=='content'){
                const el=document.getElementById(`note-${fSec}-${fIdx}`);
                if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});
            }
        },[fSec,fIdx]);

        useEffect(() => {
            if (fSec === 'content') {
                setTimeout(() => textareaRef.current?.focus(), 50);
            }
        }, [fSec]);

        // Auto-save logic
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

        // Actions
        const nav=(id)=>visit(id);
        const togSel=(id)=>id!==currentId&&setSel(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
        
        const goToRandomNote = async () => {
            const c = await getNoteCount();
            if (c > 0) {
                const offset = Math.floor(Math.random() * c);
                const note = await db.notes.offset(offset).first();
                if (note) nav(note.id);
            }
        };

        const handleLink = async (tid, t) => {
            const focusedNote = getFocusedNote();
            const aid = focusedNote ? focusedNote.id : currentId;
            if (!aid) return;

            const doL = async (id) => {
                const center = await getNote(aid);
                const target = await getNote(id);
                if (!center || !target) return;

                // Unlink any previous relationships to prevent duplicates
                if (center.linksTo.includes(id)) await updateNote(aid, { linksTo: center.linksTo.filter(x => x !== id) });
                if(target.linksTo.includes(aid)) await updateNote(id,{linksTo:target.linksTo.filter(x=>x!==aid)});

                // Apply the new link
                if(lnkType==='up'){ const trg=await getNote(id); await updateNote(id,{linksTo:[...trg.linksTo,aid]}); }
                else if(lnkType==='down'){ const anc=await getNote(aid); await updateNote(aid,{linksTo:[...anc.linksTo,id]}); }
            };

            if (tid) { await doL(tid); } 
            else if (t) {
                for (let title of t.split(';').map(x => x.trim()).filter(Boolean)) {
                    if (title.startsWith(', ')) {
                        const sourceNote = await getNote(aid);
                        if (sourceNote) title = `${sourceNote.title} ${title.substring(2)}`.trim();
                    }
                    let noteToLink = await findNoteByTitle(title);
                    if (!noteToLink) noteToLink = await createNote(title);
                    await doL(noteToLink.id);
                }
            }
            if(currentId) getTopology(currentId).then(setTopo); getNoteCount().then(setCount);
        };

        const changeRelationship = async (type) => {
            const targets = sel.size > 0 ? Array.from(sel) : (getFocusedNote() ? [getFocusedNote().id] : []);
            if(!targets.length || !currentId) return;
            const valid = targets.filter(id=>id!==currentId);
            for(const id of valid) {
                const c = await getNote(currentId); const t = await getNote(id);
                if(c.linksTo.includes(id)) await updateNote(currentId,{linksTo:c.linksTo.filter(x=>x!==id)});
                if(t.linksTo.includes(currentId)) await updateNote(id,{linksTo:t.linksTo.filter(x=>x!==currentId)});
                if(type==='up') { const t2=await getNote(id); await updateNote(id,{linksTo:[...t2.linksTo,currentId]}); }
                else if(type==='down') { const c2=await getNote(currentId); await updateNote(currentId,{linksTo:[...c2.linksTo,id]}); }
            }
            getTopology(currentId).then(setTopo); setSel(new Set());
        };

        const handleLinkAction = (type) => { if(sel.size > 0) changeRelationship(type); else { setLnkType(type); setLnk(true); } };
        const handleFavToggle = async () => { const n = getFocusedNote(); if (n) { await toggleFavorite(n.id); setCount(c => c + 1); getTopology(currentId).then(setTopo); getFavorites().then(setFavs); } };
        const getItemsPerColumn = (id) => { const el = document.getElementById(id); if(!el) return 1; const kids = Array.from(el.children).filter(c=>c.id.startsWith('note-')); if(kids.length < 2) return 1; const firstLeft = kids[0].offsetLeft; for(let i=1; i<kids.length; i++) if(kids[i].offsetLeft > firstLeft + 20) return i; return kids.length; };
        const doSearch=async(q)=>{setSearch(q);if(q){setSRes(await searchNotes(q));setSIdx(0);}else setSRes([]);};
        const navSearch = (id) => { // This function now only handles search-specific UI state.
            nav(id);
            setSAct(false);
            setSearch('');
        };

        const exportData = async () => {
            const notes = await getAllNotes();
            const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
            const now = new Date(); const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            a.download = `JaRoetPKM_${getCurrentVaultName()}_${dateStr}.json`; a.click(); URL.revokeObjectURL(url);
        };

        const activeHasContent = activeNote && activeNote.content && activeNote.content.trim().length > 0;
        const subT=topo.center?getDateSubtitle(topo.center.title):null;
        const sp={fontSize:fs,focusedSection:fSec,focusedIndex:fIdx,selectedNoteIds:sel,centralNoteId:currentId,onNoteClick:(id,c)=>c?togSel(id):id!==currentId&&nav(id),scrollPositionsRef:scrollRef};
        const canUnlink = sel.size > 0 || ['up', 'down'].includes(fSec);

        // --- KEYBOARD HANDLER ---
        const handleGlobalKeyDown = useCallback(async (e) => {
            const selState=selRef.current, fSecState=fSecRef.current, fIdxState=fIdxRef.current, topoState=topoRef.current, favsState=favsRef.current, visState=visRef.current, secIndState=secIndRef.current, mentionsState=mentionsRef.current;
            if (ren||ed||lnk||sett||imp||cal||favDrop||allNotes||vaultChooser||contentSearch) { if (e.key === 'Escape') { if(cal) setCal(false); if(favDrop) setFavDrop(false); if(allNotes) setAllNotes(false); if(vaultChooser) setVaultChooser(false); if(contentSearch) setContentSearch(false); } return; }
            if (sAct) {
                if (e.key==='Escape') { setSAct(false); setFSec('center'); e.preventDefault(); return; }
                if (e.key==='ArrowDown') { e.preventDefault(); setSIdx(p=>(p+1)%sRes.length); return; }
                if (e.key==='ArrowUp') { e.preventDefault(); setSIdx(p=>(p-1+sRes.length)%sRes.length); return; }
                if (e.key==='Enter') { e.preventDefault(); if(sRes[sIdx]) { navSearch(sRes[sIdx].id); } return; }
                return;
            }
            if (e.key === 'Escape') { if (selState.size > 0) { setSel(new Set()); e.preventDefault(); return; } }
            if (e.altKey && e.key === 'ArrowLeft' && fSecState !== 'content') { e.preventDefault(); back(); return; }
            if (e.altKey && e.key === 'ArrowRight' && fSecState !== 'content') { e.preventDefault(); forward(); return; }
            if (e.key === '/' && fSecState !== 'content') { e.preventDefault(); setSAct(true); setTimeout(()=>document.querySelector('input[placeholder="Search..."]')?.focus(), 50); return; }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); nav(await goToToday()); return; }
            if ((e.ctrlKey || e.metaKey) && e.altKey && (e.code === 'KeyR' || e.key.toLowerCase() === 'r')) { e.preventDefault(); goToRandomNote(); return; }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); setContentSearch(true); return; }
            if (e.key === 'x' && fSecState !== 'content') {
                e.preventDefault(); const note = (fSecState==='center'||fSecState==='content') ? topoState.center : getSortedNotes(fSecState, topoState, favsState)[fIdxState];
                if (note && note.id !== currentId) { togSel(note.id); const list = getSortedNotes(fSecState, topoState, favsState); if (fIdxState < list.length - 1) setFIdx(p=>p+1); } return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Backspace' && fSecState !== 'content') {
                e.preventDefault(); const targets = selState.size > 0 ? Array.from(selState) : (getFocusedNote() ? [getFocusedNote().id] : []);
                if (targets.length && confirm(`Delete ${targets.length}?`)) { for (const id of targets) await deleteNote(id); if (targets.includes(currentId)) nav(await getHomeNoteId() || (await getAllNotes())[0].id); else { getTopology(currentId).then(setTopo); getNoteCount().then(setCount); } setSel(new Set()); } return;
            }
            if (e.key === 'Backspace' && fSecState !== 'content') { e.preventDefault(); changeRelationship('unlink'); return; }
            if ((e.ctrlKey || e.metaKey) && fSecState !== 'content') {
                if (e.key === 'ArrowUp') { e.preventDefault(); if(selState.size) changeRelationship('up'); else { setLnkType('up'); setLnk(true); } return; }
                if (e.key === 'ArrowDown') { e.preventDefault(); if(selState.size) changeRelationship('down'); else { setLnkType('down'); setLnk(true); } return; }
            }
            if (e.key === 'F2') { e.preventDefault(); const n = getFocusedNote(); if(n) { setRenN(n); setRen(true); } return; }
            if (e.key === 'Enter' && fSecState !== 'content') { e.preventDefault(); setFSec('center'); return; }
            if (e.key === ' ' && fSecState !== 'content') { e.preventDefault(); const n = getFocusedNote(); if(n && n.id !== currentId) nav(n.id); return; }
            
            if (e.key === 'Enter' && fSecState !== 'content') {
                e.preventDefault();
                
                const list = getSortedNotes(fSecState, topoState, favsState, mentionsState);
                const refNote = list[fIdxState];

                if (fSecState !== 'up' && fSecState !== 'down') return;
                if (!refNote) return;

                const newNote = await createNote('New Note');

                if (fSecState === 'down') {
                    const center = topoState.center;
                    const currentLinks = center.linksTo || [];
                    const newLinks = [...currentLinks];
                    const idx = currentLinks.indexOf(refNote.id);
                    if (idx !== -1) newLinks.splice(idx + 1, 0, newNote.id); else newLinks.push(newNote.id);
                    await updateNote(center.id, { linksTo: newLinks });
                } else if (fSecState === 'up') {
                    await updateNote(newNote.id, { linksTo: [currentId] });
                }

                await getTopology(currentId).then(setTopo); getNoteCount().then(setCount);
                setRenN(newNote); setRen(true); return;
            }
            
            if (e.key === 'Tab') {
                e.preventDefault();
                if (fSecState === 'content') { 
                    setFSec(contentSource || 'center'); 
                } else { 
                    setContentSource(fSecState);
                    setFSec('content'); 
                    setTimeout(() => textareaRef.current?.focus(), 50);
                }
                return;
            }

            // --- ARROW NAV ---
            if (e.key === 'ArrowUp' && fSecState !== 'content') {
                e.preventDefault();
                if(fSecState==='center'){ if(topoState.uppers.length){ setFSec('up'); setFIdx(topoState.uppers.length-1); } }
                else if(fSecState==='down'){ if(fIdxState===0) setFSec('center'); else setFIdx(p=>p-1); }
                else if(fSecState==='up'){ setFIdx(p=>Math.max(0,p-1)); }
            }
            if (e.key === 'ArrowDown' && fSecState !== 'content') {
                e.preventDefault();
                const list = getSortedNotes(fSecState, topoState, favsState, mentionsState);
                if(fSecState==='center'){ if(topoState.downers.length){ setFSec('down'); setFIdx(Math.min(secIndState.down, topoState.downers.length-1)); } }
                else if(fSecState==='up'){ if(fIdxState===list.length-1) setFSec('center'); else setFIdx(p=>p+1); }
                else if(fSecState==='down'){ setFIdx(p=>Math.min(list.length-1,p+1)); }
            }
            if (e.key === 'ArrowLeft' && fSecState !== 'content') {
                e.preventDefault();
                if(fSecState==='down'){ setFSec('center'); }
                else if(fSecState==='center'){ if(visState.showFavorites&&favsState.length){ setFSec('favs'); setFIdx(0); } }
                else if(fSecState==='up'){ const note = getSortedNotes('up', topoState, favsState, mentionsState)[fIdxState]; if(note) nav(note.id); }
            }
            if (e.key === 'ArrowRight' && fSecState !== 'content') {
                e.preventDefault();
                if(fSecState==='up'){ setFSec('center'); }
                else if(fSecState==='center'){ if(topoState.downers.length) { setFSec('down'); setFIdx(Math.min(secIndState.down, topoState.downers.length-1)); } }
                else if(fSecState==='down'){ const note = getSortedNotes('down', topoState, favsState, mentionsState)[fIdxState]; if(note) nav(note.id); }
            }
        }, [currentId, back, forward, sRes, sIdx, sAct, ren, ed, lnk, sett, imp, cal, favDrop, goToRandomNote, contentSearch, contentSource, sortOrder]);

        const handleKeyDownRef = useRef(handleGlobalKeyDown);
        useEffect(() => { handleKeyDownRef.current = handleGlobalKeyDown; }, [handleGlobalKeyDown]);
        useEffect(() => { const h=(e)=>handleKeyDownRef.current(e); window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h); }, []);

        return html`
            <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans flex-col">
                <${TopBar}
                    nav=${nav} back=${back} forward=${forward} canBack=${canBack} canForward=${canForward} goHome=${async()=>{nav(await getHomeNoteId())}}
                    cal=${cal} setCal=${setCal} calD=${calD} setCalD=${setCalD} handleCalendarSelect=${async(d)=>{setCal(false);nav(await goToDate(d))}} handleCalendarMonthChange=${async(y,m)=>{const p=`${y}-${String(m).padStart(2,'0')}-`;setCalD(new Set(await getNoteTitlesByPrefix(p)))}}
                    favDrop=${favDrop} setFavDrop=${setFavDrop} favs=${favs}
                    activeNote=${activeNote} handleFavToggle=${handleFavToggle} setEd=${setEd} activeHasContent=${activeHasContent} setRenN=${setRenN} setRen=${setRen}
                    deleteNote=${deleteNote} currentId=${currentId} canUnlink=${canUnlink} changeRelationship=${changeRelationship} handleLinkAction=${handleLinkAction}
                    search=${search} doSearch=${doSearch} sAct=${sAct} setSAct=${setSAct} sRes=${sRes} sIdx=${sIdx} setSIdx=${setSIdx} navSearch=${navSearch}
                    setAllNotes=${setAllNotes}
                    goToRandomNote=${goToRandomNote}
                    setContentSearch=${setContentSearch}
                    onThemeSelect=${async (id) => {
                        const t = await getTheme(id);
                        if(t) { await setActiveThemeId(id); applyTheme(t); }
                    }}
                    themes=${themes}
                    dark=${dark} setSett=${setSett} exportData=${exportData} setImpD=${setImpD} setImp=${setImp} fontSize=${fs}
                    sortOrder=${sortOrder} setSortOrder=${(o)=>{setSortOrder(o);persistSortOrder(o);}}
                />

                <div className="flex-1 flex overflow-hidden bg-background relative transition-colors duration-300">
                    <div 
                        className="w-1/2 h-full flex flex-col border-r border-gray-200 dark:border-gray-800"
                        onClick=${(e) => {
                            if (e.target === e.currentTarget || e.target.classList.contains('canvas-flex-container')) setFSec('center');
                        }}
                    >
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 canvas-flex-container">
                            <div className="flex flex-col">
                                <${NoteSection} 
                                    notes=${sortNotes(topo.uppers)} 
                                    section="up" 
                                    containerClasses="flex flex-col" 
                                    itemClasses="w-full text-gray-500 dark:text-gray-400 hover:text-foreground" 
                                    containerId="container-up" 
                                    ...${sp} 
                                />
                            </div>

                            <div className="flex items-center gap-2 pl-4 relative group">
                                ${topo.center && html`
                                    <${NoteCard} 
                                        note=${topo.center} 
                                        isCenter=${false} 
                                        isFocused=${fSec==='center'} 
                                        fontSize=${fs} 
                                        onClick=${()=>{}} 
                                        className="font-bold w-full"
                                        id="note-center-0"
                                    />
                                    <div className="flex gap-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2">
                                        ${topo.center.isFavorite&&html`<${Icons.Star} width="14" height="14" fill="currentColor" />`}
                                        ${topo.center.content&&html`<${Icons.Edit} width="14" height="14" fill="currentColor" />`}
                                    </div>
                                `}
                            </div>

                            <div className="flex flex-col pl-8 border-l border-gray-100 dark:border-gray-800 ml-2">
                                <${NoteSection} 
                                    notes=${sortNotes(topo.downers)} 
                                    section="down" 
                                    containerClasses="flex flex-col" 
                                    itemClasses="w-full" 
                                    containerId="container-down" 
                                    ...${sp} 
                                />
                            </div>
                            
                            <div className="flex-1 min-h-[200px]" onClick=${() => setFSec('center')}></div>
                        </div>
                    </div>

                    <div 
                        className="w-1/2 h-full overflow-y-auto custom-scrollbar bg-background p-8 border-l border-gray-100 dark:border-gray-800"
                        onClick=${() => setFSec('content')}
                    >
                            ${fSec === 'content' && activeNote ? html`
                                <textarea
                                    ref=${textareaRef}
                                    className="w-full h-full bg-transparent resize-none outline-none font-mono custom-scrollbar p-2"
                                    value=${editContent}
                                    onChange=${(e) => setEditContent(e.target.value)}
                                    placeholder="Start typing..."
                                ></textarea>
                            ` : activeNote && activeNote.content ? html`
                                <div 
                                    className=${`prose dark:prose-invert max-w-none compact-markdown transition-all duration-200 ${fSec==='content' ? 'ring-2 ring-primary/10 rounded-lg p-2' : ''}`} 
                                    dangerouslySetInnerHTML=${{ __html: prevH }}
                                    onClick=${async (e) => {
                                        if (e.target.classList.contains('internal-link') && e.target.dataset.title) {
                                            e.preventDefault();
                                            const noteToNav = await findNoteByTitle(e.target.dataset.title);
                                            if (noteToNav) nav(noteToNav.id);
                                        }
                                    }}
                                ></div>
                            ` : html`
                                <div className="flex items-center justify-center h-full text-gray-400 italic select-none">
                                    No content
                                </div>
                            `}
                        </div>
                    </div>

                <${StatusBar} noteCount=${count} vaultName=${getCurrentVaultName()} version=${APP_VERSION} fontSize=${fs} onVaultClick=${() => setVaultChooser(p => !p)} activeNote=${activeNote} />

                <${Editor} 
                    isOpen=${ed} mode=${edMode} note=${fSec==='center'?topo.center:getSortedNotes(fSec,topo,favs)[fIdx]} 
                    onClose=${()=>setEd(false)} 
                    onSave=${async (id, c) => {
                        const WIKI_LINK_REGEX = /\[\[([^|\]\n]+)(?:\|[^\]\n]*)?\]\]/g;
                        const outgoingLinkIds = new Set();
                        let match;
                        const allNotes = await getAllNotes();
                        const titleToIdMap = new Map(allNotes.map(note => [note.title.toLowerCase(), note.id]));
                        WIKI_LINK_REGEX.lastIndex = 0;
                        while ((match = WIKI_LINK_REGEX.exec(c)) !== null) {
                            const linkTitle = match[1].trim().toLowerCase();
                            if (titleToIdMap.has(linkTitle)) {
                                outgoingLinkIds.add(titleToIdMap.get(linkTitle));
                            }
                        }
                        // Use a transaction to ensure getTopology reads the updated data
                        await db.transaction('rw', db.notes, async () => {
                            await updateNote(id, { content: c, outgoingLinks: Array.from(outgoingLinkIds) });
                            if (id === currentId) {
                                await getTopology(currentId).then(setTopo);
                            }
                        });
                    }}
                    onLink=${async(t)=>{const n=await findNoteByTitle(t);if(n)nav(n.id)}} 
                />
                <${VaultChooser} 
                    isOpen=${vaultChooser} 
                    onClose=${() => setVaultChooser(false)} 
                    onManage=${() => {
                        setVaultChooser(false);
                        setSett({ open: true, initialTab: 'database', focusOn: 'newVaultInput' });
                    }}
                />
                <${LinkerModal} isOpen=${lnk} type=${lnkType} onClose=${()=>setLnk(false)} onSelect=${handleLink} sourceNoteId=${getFocusedNote()?.id || currentId} />
                <${SettingsModal} isOpen=${sett.open || sett === true} onClose=${()=>setSett(false)} currentCentralNoteId=${currentId} fontSize=${fs} onFontSizeChange=${setFs} onThemeChange=${async ()=>{
                    const tId = await getActiveThemeId();
                    const t = await getTheme(tId);
                    if(t) applyTheme(t);
                    getThemes().then(setThemes);
                }} onSettingsChange=${async ()=>{
                    getSectionVisibility().then(setVis);
                    setAttachmentAliases(await getAttachmentAliases());
                }} initialTab=${sett.initialTab} focusOn=${sett.focusOn} />
                <${ImportModal} isOpen=${imp} importData=${impD} onClose=${()=>setImp(false)} onConfirm=${async m=>{await importNotes(impD,m);setImp(false);window.location.reload()}} />
                <${RenameModal} isOpen=${ren} currentTitle=${renN?renN.title:''} onClose=${()=>setRen(false)} onRename=${t=>{updateNote(renN.id,{title:t});setRen(false);getTopology(currentId).then(setTopo);}} />
                <${AllNotesModal} isOpen=${allNotes} onClose=${()=>setAllNotes(false)} onSelect=${id=>{setAllNotes(false);nav(id);}} />
                <${ContentSearchModal} 
                    isOpen=${contentSearch} 
                    onClose=${()=>setContentSearch(false)} 
                    onNavigate=${id=>{setContentSearch(false);nav(id);}} 
                    initialQuery=${contentSearchState.query} 
                    initialResults=${contentSearchState.results} 
                    onStateChange=${(q, r) => setContentSearchState({query: q, results: r})} 
                />
            </div>
        `;
    };
})(window.Jaroet);
