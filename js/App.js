
(function(J) {
    // Helper to get caret coordinates for autocomplete popup
    const getCaretCoordinates = (element, position) => {
        const div = document.createElement('div');
        const style = window.getComputedStyle(element);
        Array.from(style).forEach(prop => div.style.setProperty(prop, style.getPropertyValue(prop)));
        div.style.position = 'absolute'; div.style.visibility = 'hidden'; div.style.whiteSpace = 'pre-wrap';
        div.style.top = '0'; div.style.left = '0';
        div.textContent = element.value.substring(0, position);
        const span = document.createElement('span'); span.textContent = element.value.substring(position) || '.';
        div.appendChild(span);
        document.body.appendChild(div);
        const coordinates = { top: span.offsetTop + parseInt(style.borderTopWidth), left: span.offsetLeft + parseInt(style.borderLeftWidth), height: parseInt(style.lineHeight) };
        document.body.removeChild(div);
        return coordinates;
    };

    const { useState, useEffect, useRef, useCallback, useMemo } = React;
    const { db, getTopology, createNote, updateNote, deleteNote, getFavorites, toggleFavorite, seedDatabase, getNote, getAllNotes, importNotes, getHomeNoteId, searchNotes, getFontSize, getNoteCount, getVaultList, getCurrentVaultName, switchVault, getSectionVisibility, findNoteByTitle, getNoteTitlesByPrefix, getActiveThemeId, getTheme, setActiveThemeId, getThemes, getAttachmentAliases, getSplitRatio, setSplitRatio: dbSetSplitRatio } = J.Services.DB;
    const { goToDate, goToToday, getDateSubtitle } = J.Services.Journal; 
    const { createRenderer, wikiLinkExtension, setAttachmentAliases } = J.Services.Markdown;
    const { NoteCard, LinkerModal, Editor, SettingsModal, ImportModal, RenameModal, NoteSection, TopBar, StatusBar, Icons, AllNotesModal, ContentSearchModal, VaultChooser, APP_VERSION } = J;
    const { useHistory, useListNavigation, useClickOutside } = J.Hooks;

    marked.use({renderer:createRenderer({clickableCheckboxes:false}),extensions:[wikiLinkExtension]});

    J.App = () => {
        // --- State ---
        const {currentId,visit,replace,back,forward,canBack,canForward}=useHistory();
        const [topo,setTopo]=useState({center:null,uppers:[],downers:[]}),[favs,setFavs]=useState([]),[dark,setDark]=useState(true),[fs,setFs]=useState(16),[vis,setVis]=useState({showFavorites:true,showContent:true}),[count,setCount]=useState(0),[themes,setThemes]=useState([]);
        const [contentSource, setContentSource] = useState(null);
        const [isEditing, setIsEditing] = useState(false);
        const [editContent, setEditContent] = useState('');

        // Autocomplete State
        const [sug,setSug]=useState(false);const [sq,setSq]=useState('');const [sres,setSres]=useState([]);
        const [cPos,setCPos]=useState({top:0,left:0});const [trigIdx,setTrigIdx]=useState(-1);

        // Resizable Pane State
        const [splitRatio, setSplitRatio] = useState(0.5);
        const isDragging = useRef(false);
        const containerRef = useRef(null);

        const handleMouseDown = (e) => {
            isDragging.current = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        };

        const handleMouseMove = useCallback((e) => {
            if (!isDragging.current || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const newRatio = (e.clientX - containerRect.left) / containerRect.width;
            setSplitRatio(Math.min(Math.max(newRatio, 0.2), 0.8));
        }, []);

        const handleMouseUp = useCallback(() => {
            isDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }, []);

        useEffect(() => {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }, [handleMouseMove, handleMouseUp]);
        
        // Navigation State
        const [fSec,setFSec]=useState('center'),[fIdx,setFIdx]=useState(0),[sel,setSel]=useState(new Set());
        const [secInd,setSecInd]=useState({up:0,down:0,favs:0});
        const scrollRef=useRef({});
        
        // Refs for Event Listeners
        const selRef=useRef(new Set());
        const fSecRef=useRef('center');
        const fIdxRef=useRef(0);
        const topoRef=useRef({center:null,uppers:[],downers:[]});
        const favsRef=useRef([]);
        const visRef=useRef({showFavorites:true,showContent:true});
        const secIndRef=useRef({up:0,down:0,favs:0});
        const isEditingRef=useRef(false);

        // UI State & Modals (removed `menu` and `setMenu`)
        const [cal,setCal]=useState(false),[calD,setCalD]=useState(new Set());
        const [vaultChooser, setVaultChooser] = useState(false);
        const [search,setSearch]=useState(''),[sRes,setSRes]=useState([]),[sIdx,setSIdx]=useState(0),[sAct,setSAct]=useState(false);
        const [contentSearch, setContentSearch] = useState(false), [contentSearchState, setContentSearchState] = useState({ query: '', results: [] });
        const [ed,setEd]=useState(false),[edMode,setEdMode]=useState('view'),[lnk,setLnk]=useState(false),[lnkType,setLnkType]=useState('up'),[ren,setRen]=useState(false),[renN,setRenN]=useState(null),[sett,setSett]=useState(false),[imp,setImp]=useState(false),[impD,setImpD]=useState([]),[allNotes,setAllNotes]=useState(false);
        const searchInputRef=useRef(null);
        const textareaRef = useRef(null);
        const previewRef = useRef(null);

        // --- Effects & Sync ---
        useEffect(()=>{
            const init = async () => {
                const initialId = await seedDatabase();
                const currentNoteId = (await db.meta.get('currentCentralNoteId'))?.value || initialId;
                replace(currentNoteId);
                getFontSize().then(setFs);
                getSectionVisibility().then(setVis);
                getFavorites().then(setFavs);
                getSplitRatio().then(setSplitRatio);
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

        // Sync Refs
        useEffect(()=>{selRef.current=sel},[sel]);
        useEffect(()=>{fSecRef.current=fSec},[fSec]);
        useEffect(()=>{fIdxRef.current=fIdx},[fIdx]);
        useEffect(()=>{topoRef.current=topo},[topo]);
        useEffect(()=>{favsRef.current=favs},[favs]);
        useEffect(()=>{visRef.current=vis},[vis]);
        useEffect(()=>{secIndRef.current=secInd},[secInd]);
        useEffect(()=>{isEditingRef.current=isEditing},[isEditing]);

        const getSortedNotes = (sec, t=topo, f=favs) => {
            if(sec==='center')return t.center?[t.center]:[];
            let n=[]; 
            if(sec==='up')n=t.uppers;
            else if(sec==='down')n=t.downers;
            else if(sec==='favs')n=f;
            return n || [];
        };

        const getFocusedNote = () => {
            const section = fSec === 'content' ? (contentSource || 'center') : fSec;
            if (section === 'center') return topo.center;
            const index = fSec === 'content' ? (secInd[section] || 0) : fIdx;
            return getSortedNotes(section, topo, favs)[index] || null;
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
                if (isEditing) {
                    setTimeout(() => {
                        if (textareaRef.current) {
                            textareaRef.current.focus();
                            textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
                        }
                    }, 50);
                } else {
                    setTimeout(() => previewRef.current?.focus(), 50);
                }
            }
        }, [fSec, isEditing]);

        // Persist split ratio
        useEffect(() => {
            const t = setTimeout(() => dbSetSplitRatio(splitRatio), 200);
            return () => clearTimeout(t);
        }, [splitRatio]);

        // Autocomplete Logic
        useEffect(()=>{
            if(sug){
                const t=setTimeout(async()=>{
                    setSres(await searchNotes(sq)); 
                },150);
                return ()=>clearTimeout(t);
            }
        },[sq,sug]);

        const handleContentChange = (e) => {
            const v = e.target.value;
            setEditContent(v);
            const c = e.target.selectionEnd;
            const lo = v.lastIndexOf('[[', c);
            if (lo !== -1) {
                const tb = v.slice(lo + 2, c);
                if (tb.includes(']]') || tb.includes('\n')) {
                    setSug(false);
                } else {
                    setTrigIdx(lo);
                    setSq(tb);
                    setSug(true);
                    const coords = getCaretCoordinates(e.target, lo);
                    setCPos({ top: coords.top - e.target.scrollTop, left: coords.left - e.target.scrollLeft });
                }
            } else {
                setSug(false);
            }
        };

        const insertLink = (title) => {
            const b = editContent.slice(0, trigIdx);
            const a = editContent.slice(textareaRef.current.selectionEnd);
            const n = `${b}[[${title}]]${a}`;
            setEditContent(n);
            setSug(false);
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    const p = trigIdx + 2 + title.length + 2;
                    textareaRef.current.setSelectionRange(p, p);
                }
            }, 50);
        };

        const { activeIndex: sugIdx, setActiveIndex: setSugIdx, listRef: sugListRef, handleKeyDown: handleAutocompleteKeyDown } = useListNavigation({
            isOpen: sug, itemCount: sres.length, onEnter: (index) => { if (sres[index]) insertLink(sres[index].title); }, onEscape: () => setSug(false)
        });
        const autocompleteDropdownRef = useClickOutside(sug, useCallback(() => setSug(false), []));

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
                    if (title.endsWith(' ,')) {
                        const sourceNote = await getNote(aid);
                        if (sourceNote) title = `${title.substring(0, title.length - 2).trim()} - ${sourceNote.title}`.trim();
                    }
                    let noteToLink = await findNoteByTitle(title);
                    if (!noteToLink) noteToLink = await createNote(title);
                    await doL(noteToLink.id);
                }
            }
            if(currentId) getTopology(currentId).then(setTopo); getNoteCount().then(setCount);
        };
        
        const handleSortChange = async (mode) => {
            if (activeNote) {
                await updateNote(activeNote.id, { childSort: mode });
                getTopology(currentId).then(setTopo);
            }
        };

        const handleAddNoteAfter = async (refNoteId) => {
            if (!topo.center) return;
            const center = topo.center;
            const newNote = await createNote('New Note');
            const currentLinks = center.linksTo || [];
            const newLinks = [...currentLinks];
            const idx = currentLinks.indexOf(refNoteId);
            if (idx !== -1) newLinks.splice(idx + 1, 0, newNote.id); else newLinks.push(newNote.id);
            await updateNote(center.id, { linksTo: newLinks });
            await getTopology(currentId).then(setTopo); getNoteCount().then(setCount);
            setRenN(newNote); setRen(true);
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
            const selState=selRef.current, fSecState=fSecRef.current, fIdxState=fIdxRef.current, topoState=topoRef.current, favsState=favsRef.current, secIndState=secIndRef.current, isEditingState=isEditingRef.current;
            if (ren||ed||lnk||sett||imp||cal||allNotes||vaultChooser||contentSearch) { if (e.key === 'Escape') { if(cal) setCal(false); if(allNotes) setAllNotes(false); if(vaultChooser) setVaultChooser(false); if(contentSearch) setContentSearch(false); } return; }
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
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') { e.preventDefault(); const h = await getHomeNoteId(); if(h) nav(h); return; }
            if (e.key === 'x' && fSecState !== 'content') {
                e.preventDefault(); const note = (fSecState==='center'||fSecState==='content') ? topoState.center : getSortedNotes(fSecState, topoState, favsState)[fIdxState];
                if (note && note.id !== currentId) { togSel(note.id); const list = getSortedNotes(fSecState, topoState, favsState); if (fIdxState < list.length - 1) setFIdx(p=>p+1); } return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'Backspace' && fSecState !== 'content') {
                e.preventDefault(); const targets = selState.size > 0 ? Array.from(selState) : (getFocusedNote() ? [getFocusedNote().id] : []);
                if (targets.length && confirm(`Delete ${targets.length}?`)) { for (const id of targets) await deleteNote(id); if (targets.includes(currentId)) nav(await getHomeNoteId() || (await getAllNotes())[0].id); else { getTopology(currentId).then(setTopo); getNoteCount().then(setCount); } setSel(new Set()); } return;
            }
            
            // Reorder Child Notes (Ctrl+Shift+Up/Down)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && fSecState === 'down') {
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (fIdxState > 0 && topoState.center) {
                        const currentVisualIds = topoState.downers.map(n => n.id);
                        [currentVisualIds[fIdxState], currentVisualIds[fIdxState - 1]] = [currentVisualIds[fIdxState - 1], currentVisualIds[fIdxState]];
                        await updateNote(topoState.center.id, { linksTo: currentVisualIds, childSort: 'manual' });
                        await getTopology(currentId).then(setTopo);
                        setFIdx(fIdxState - 1);
                    }
                    return;
                }
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (fIdxState < topoState.downers.length - 1 && topoState.center) {
                        const currentVisualIds = topoState.downers.map(n => n.id);
                        [currentVisualIds[fIdxState], currentVisualIds[fIdxState + 1]] = [currentVisualIds[fIdxState + 1], currentVisualIds[fIdxState]];
                        await updateNote(topoState.center.id, { linksTo: currentVisualIds, childSort: 'manual' });
                        await getTopology(currentId).then(setTopo);
                        setFIdx(fIdxState + 1);
                    }
                    return;
                }
            }

            if (e.key === 'Backspace' && fSecState !== 'content') { e.preventDefault(); changeRelationship('unlink'); return; }
            if ((e.ctrlKey || e.metaKey) && fSecState !== 'content') {
                if (e.key === 'ArrowUp') { e.preventDefault(); if(selState.size) changeRelationship('up'); else { setLnkType('up'); setLnk(true); } return; }
                if (e.key === 'ArrowDown') { e.preventDefault(); if(selState.size) changeRelationship('down'); else { setLnkType('down'); setLnk(true); } return; }
            }
            if (e.key === 'F2') { e.preventDefault(); const n = getFocusedNote(); if(n) { setRenN(n); setRen(true); } return; }
            if (e.key === ' ' && fSecState !== 'content') { e.preventDefault(); const n = getFocusedNote(); if(n && n.id !== currentId) nav(n.id); return; }
            
            if (e.shiftKey && e.key === 'Enter') {
                e.preventDefault();
                if (fSecState !== 'content') {
                    setContentSource(fSecState);
                    setFSec('content');
                    setIsEditing(true);
                } else {
                    setIsEditing(p => !p);
                }
                return;
            }

            if (e.key === 'Tab') {
                e.preventDefault();
                if (fSecState === 'content') { 
                    setFSec(contentSource || 'center'); 
                    setIsEditing(false);
                } else { 
                    setContentSource(fSecState);
                    setFSec('content'); 
                    setIsEditing(false);
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
                const list = getSortedNotes(fSecState, topoState, favsState);
                if(fSecState==='center'){ if(topoState.downers.length){ setFSec('down'); setFIdx(Math.min(secIndState.down, topoState.downers.length-1)); } }
                else if(fSecState==='up'){ if(fIdxState===list.length-1) setFSec('center'); else setFIdx(p=>p+1); }
                else if(fSecState==='down'){ setFIdx(p=>Math.min(list.length-1,p+1)); }
            }
            if (e.key === 'ArrowLeft' && fSecState !== 'content') {
                e.preventDefault();
                const sortedUppers = getSortedNotes('up', topoState, favsState);
                if (['down', 'favs'].includes(fSecState)) {
                    setFSec('center');
                } else if (fSecState === 'center') {
                    if (sortedUppers.length > 0) {
                        nav(sortedUppers[0].id);
                    }
                } else if (fSecState === 'up') {
                    const note = sortedUppers[fIdxState];
                    if (note) nav(note.id);
                }
            }
            if (e.key === 'ArrowRight' && fSecState !== 'content') {
                e.preventDefault();
                if (['up', 'favs'].includes(fSecState)) {
                    setFSec('center');
                } else if (fSecState === 'center') {
                    const sortedDowners = getSortedNotes('down', topoState, favsState);
                    if (sortedDowners.length > 0) {
                        nav(sortedDowners[0].id);
                    }
                } else if (fSecState === 'down') {
                    const note = getSortedNotes(fSecState, topoState, favsState)[fIdxState];
                    if (note) nav(note.id);
                }
            }
        }, [currentId, back, forward, sRes, sIdx, sAct, ren, ed, lnk, sett, imp, cal, goToRandomNote, contentSearch, contentSource]);

        const handleKeyDownRef = useRef(handleGlobalKeyDown);
        useEffect(() => { handleKeyDownRef.current = handleGlobalKeyDown; }, [handleGlobalKeyDown]);
        useEffect(() => { const h=(e)=>handleKeyDownRef.current(e); window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h); }, []);

        return html`
            <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans flex-col">
                <${TopBar}
                    nav=${nav} back=${back} forward=${forward} canBack=${canBack} canForward=${canForward} goHome=${async()=>{nav(await getHomeNoteId())}}
                    cal=${cal} setCal=${setCal} calD=${calD} setCalD=${setCalD} handleCalendarSelect=${async(d)=>{setCal(false);nav(await goToDate(d))}} handleCalendarMonthChange=${async(y,m)=>{const p=`${y}-${String(m).padStart(2,'0')}-`;setCalD(new Set(await getNoteTitlesByPrefix(p)))}}
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
                    onSortChange=${handleSortChange}
                />

                <div ref=${containerRef} className="flex-1 flex overflow-hidden bg-background relative transition-colors duration-300">
                    <div 
                        style=${{ width: `${splitRatio * 100}%`, borderColor: 'color-mix(in srgb, var(--primary) 20%, transparent)' }}
                        className="h-full flex flex-col border-r flex-shrink-0"
                        onClick=${(e) => {
                            if (e.target === e.currentTarget || e.target.classList.contains('canvas-flex-container')) setFSec('center');
                        }}
                    >
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 canvas-flex-container">
                            <div className="flex flex-col">
                                <${NoteSection} 
                                    notes=${topo.uppers} 
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
                                        className="font-bold w-full text-primary"
                                        id="note-center-0"
                                        subtitle=${subT}
                                    />
                                    <div className="flex gap-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2">
                                        ${topo.center.isFavorite&&html`<${Icons.Star} width="14" height="14" fill="currentColor" />`}
                                        ${topo.center.content&&html`<${Icons.Edit} width="14" height="14" fill="currentColor" />`}
                                    </div>
                                `}
                            </div>

                            <div className="flex flex-col pl-8 border-l border-gray-100 dark:border-gray-800 ml-2">
                                <${NoteSection} 
                                    notes=${topo.downers} 
                                    section="down" 
                                    containerClasses="flex flex-col" 
                                    itemClasses="w-full" 
                                    containerId="container-down" 
                                    onAddAfter=${handleAddNoteAfter}
                                    ...${sp} 
                                />
                            </div>
                            
                            <div className="flex-1 min-h-[200px]" onClick=${() => setFSec('center')}></div>
                        </div>

                        ${vis.showFavorites && favs.length > 0 && html`
                            <div style=${{ borderColor: 'color-mix(in srgb, var(--primary) 20%, transparent)' }} className="flex-shrink-0 p-3 border-t bg-gray-50/50 dark:bg-gray-900/30 backdrop-blur-sm">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Favorites</div>
                                <div className="flex flex-wrap gap-2">
                                    ${favs.map(f => html`
                                        <button 
                                            key=${f.id}
                                            onClick=${(e) => { e.stopPropagation(); nav(f.id); }}
                                            style=${{ 
                                                borderColor: 'color-mix(in srgb, var(--primary) 20%, transparent)',
                                                backgroundColor: 'color-mix(in srgb, var(--primary) 5%, transparent)',
                                                color: 'var(--primary)'
                                            }}
                                            className="px-2.5 py-1 text-xs font-medium rounded-full border hover:opacity-80 transition-all truncate max-w-[150px] select-none"
                                            title=${f.title}
                                        >
                                            ${f.title}
                                        </button>
                                    `)}
                                </div>
                            </div>
                        `}
                    </div>

                    <div
                        style=${{ backgroundColor: 'color-mix(in srgb, var(--primary) 5%, transparent)' }}
                        className="w-2 h-full cursor-col-resize hover:bg-primary/20 transition-colors flex-shrink-0 flex items-center justify-center z-50 select-none"
                        onMouseDown=${handleMouseDown}
                    >
                        <div className="w-0.5 h-8 bg-primary rounded-full pointer-events-none"></div>
                    </div>

                    <div 
                        style=${{ borderColor: 'color-mix(in srgb, var(--primary) 20%, transparent)' }}
                        className="flex-1 h-full bg-background border-l min-w-0 relative"
                        onClick=${() => setFSec('content')}
                    >
                            ${fSec === 'content' && isEditing && activeNote ? html`
                                <textarea
                                    ref=${textareaRef}
                                    className="w-full h-full bg-transparent resize-none outline-none font-mono custom-scrollbar p-8"
                                    value=${editContent}
                                    onChange=${handleContentChange}
                                    onKeyDown=${(e) => {
                                        if (sug) {
                                            if (['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
                                                e.stopPropagation();
                                                handleAutocompleteKeyDown(e);
                                            }
                                        }
                                    }}
                                    placeholder="Start typing..."
                                ></textarea>
                                ${sug && html`
                                    <div ref=${(el) => { autocompleteDropdownRef.current = el; sugListRef.current = el; }} className="absolute z-50 w-64 bg-card border border-gray-200 dark:border-gray-700 shadow-xl rounded-md max-h-60 overflow-y-auto custom-scrollbar" style=${{top:cPos.top+30,left:cPos.left+24}}>
                                        ${sres.length===0?html`<div className="p-2 text-xs text-gray-500 italic">No matching notes</div>`
                                        :sres.map((s,i)=>html`
                                            <div key=${s.id} onClick=${()=>insertLink(s.title)} onMouseEnter=${() => setSugIdx(i)} className=${`px-3 py-2 text-sm cursor-pointer ${i===sugIdx?'bg-primary text-primary-foreground':'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                                ${s.title}
                                            </div>
                                        `)}
                                    </div>
                                `}
                            ` : activeNote ? html`
                                <div 
                                    ref=${previewRef}
                                    tabIndex=${0}
                                    className=${`w-full h-full overflow-y-auto custom-scrollbar p-8 prose dark:prose-invert max-w-none compact-markdown transition-all duration-200 outline-none ${fSec==='content' ? 'ring-2 ring-primary/10 rounded-lg' : ''}`} 
                                    dangerouslySetInnerHTML=${{ __html: prevH || '<span class="text-gray-400 italic">No content</span>' }}
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
