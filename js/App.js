
(function(J) {
    const { useState, useEffect, useRef, useCallback, useMemo } = React;
    const { db, getTopology, createNote, updateNote, deleteNote, getFavorites, toggleFavorite, seedDatabase, getNote, getAllNotes, importNotes, getHomeNoteId, searchNotes, searchContent, getFontSize, getNoteCount, getVaultList, getCurrentVaultName, switchVault, getSectionVisibility, findNoteByTitle, getNoteTitlesByPrefix, getActiveThemeId, getTheme, setActiveThemeId, getThemes, getAttachmentAliases, getSplitRatio } = J.Services.DB;
    const { goToDate, goToToday, getDateSubtitle, formatDateForJournal } = J.Services.Journal; 
    const { createRenderer, wikiLinkExtension, setAttachmentAliases } = J.Services.Markdown;
    const { NoteCard, LinkerModal, SettingsModal, ImportModal, RenameModal, NoteSection, TopBar, StatusBar, Icons, AllNotesModal, ContentSearchModal, VaultChooser, MentionsModal, CreateNoteFromLinkModal, EditorPane, ResizeHandle, FavoritesPanel, APP_VERSION } = J;
    const { useHistory, useListNavigation, useClickOutside, useSplitPane, useAutoSave } = J.Hooks;

    marked.use({renderer:createRenderer({clickableCheckboxes:false}),extensions:[wikiLinkExtension]});

    J.App = () => {
        // --- State ---
        const {currentId,visit,replace,back,forward,canBack,canForward}=useHistory();
        const [topo,setTopo]=useState({center:null,uppers:[],downers:[]}),[favs,setFavs]=useState([]),[dark,setDark]=useState(true),[fs,setFs]=useState(16),[vis,setVis]=useState({showFavorites:true}),[count,setCount]=useState(0),[themes,setThemes]=useState([]);
        const [contentSource, setContentSource] = useState(null);
        const [isEditing, setIsEditing] = useState(false);
        const [editContent, setEditContent] = useState('');
        const [highlightTerm, setHighlightTerm] = useState(null);

        // Autocomplete State
        const [showAutocomplete, setShowAutocomplete] = useState(false);
        const [autocompleteQuery, setAutocompleteQuery] = useState('');
        const [autocompleteResults, setAutocompleteResults] = useState([]);
        const [caretPos, setCaretPos] = useState({ top: 0, left: 0 });
        const [triggerIndex, setTriggerIndex] = useState(-1);

        // Resizable Pane State
        const { splitRatio, setSplitRatio, splitRatioLoaded, containerRef, onMouseDown: handleMouseDown } = useSplitPane();
        
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
        const visRef=useRef({showFavorites:true});
        const secIndRef=useRef({up:0,down:0,favs:0});
        const contentSourceRef = useRef(null);
        const isEditingRef=useRef(false);

        // UI State & Modals (removed `menu` and `setMenu`)
        const [isCalendarOpen, setIsCalendarOpen] = useState(false);
        const [calendarDates, setCalendarDates] = useState(new Set());
        const [vaultChooser, setVaultChooser] = useState(false);
        const [search, setSearch] = useState('');
        const [globalSearchResults, setGlobalSearchResults] = useState([]);
        const [globalSearchIndex, setGlobalSearchIndex] = useState(0);
        const [isGlobalSearchActive, setIsGlobalSearchActive] = useState(false);
        const [contentSearch, setContentSearch] = useState(false), [contentSearchState, setContentSearchState] = useState({ query: '', results: [] });
        const [isLinkerModalOpen, setIsLinkerModalOpen] = useState(false);
        const [linkerType, setLinkerType] = useState('up');
        const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
        const [noteToRename, setNoteToRename] = useState(null);
        const [isSettingsOpen, setIsSettingsOpen] = useState(false);
        const [isImportModalOpen, setIsImportModalOpen] = useState(false);
        const [importData, setImportData] = useState([]);
        const [isAllNotesModalOpen, setIsAllNotesModalOpen] = useState(false);
        const [isMentionsModalOpen, setIsMentionsModalOpen] = useState(false);
        const searchInputRef=useRef(null);
        const [createLinkState, setCreateLinkState] = useState({ isOpen: false, title: '', position: { top: 0, left: 0 } });


        const textareaRef = useRef(null);
        const previewRef = useRef(null);

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

        // --- Effects & Sync ---
        useEffect(()=>{
            const init = async () => {
                const initialId = await seedDatabase();
                const currentNoteId = (await db.meta.get('currentCentralNoteId'))?.value || initialId;
                replace(currentNoteId);
                getFontSize().then(setFs);
                getSectionVisibility().then(setVis);
                getFavorites().then(setFavs);
                getSplitRatio().then(v => { 
                    setSplitRatio(v); 
                    splitRatioLoaded.current = true; 
                });
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

        // Highlight term logic (for Mentions navigation)
        useEffect(() => {
            if (highlightTerm && activeNote && activeNote.id && !isEditing) {
                const t = setTimeout(() => {
                    if (previewRef.current) {
                        const safeTitle = highlightTerm.replace(/"/g, '\\"');
                        const links = previewRef.current.querySelectorAll(`a[data-title="${safeTitle}"]`);
                        if (links.length > 0) {
                            const selection = window.getSelection();
                            selection.removeAllRanges();
                            links.forEach(link => {
                                const range = document.createRange();
                                range.selectNodeContents(link);
                                selection.addRange(range);
                            });
                            links[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                        setHighlightTerm(null);
                    }
                }, 150);
                return () => clearTimeout(t);
            }
        }, [activeNote?.id, highlightTerm, isEditing]);

        // Sync Refs
        useEffect(()=>{selRef.current=sel},[sel]);
        useEffect(()=>{fSecRef.current=fSec},[fSec]);
        useEffect(()=>{fIdxRef.current=fIdx},[fIdx]);
        useEffect(()=>{topoRef.current=topo},[topo]);
        useEffect(()=>{favsRef.current=favs},[favs]);
        useEffect(()=>{visRef.current=vis},[vis]);
        useEffect(()=>{secIndRef.current=secInd},[secInd]);
        useEffect(()=>{isEditingRef.current=isEditing},[isEditing]);
        useEffect(()=>{contentSourceRef.current=contentSource},[contentSource]);

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

        // Autocomplete Logic
        useEffect(()=>{
            if(showAutocomplete){
                const t=setTimeout(async()=>{
                    const res=await searchNotes(autocompleteQuery);
                    setAutocompleteResults(activeNote ? res.filter(r=>r.id!==activeNote.id) : res);
                },150);
                return ()=>clearTimeout(t);
            }
        },[autocompleteQuery, showAutocomplete, activeNote]);

        const handleContentChange = (e) => {
            const v = e.target.value;
            setEditContent(v);
            const c = e.target.selectionEnd;
            const lo = v.lastIndexOf('[[', c);
            if (lo !== -1) {
                const tb = v.slice(lo + 2, c);
                if (tb.includes(']]') || tb.includes('\n')) {
                    setShowAutocomplete(false);
                } else {
                    setTriggerIndex(lo);
                    setAutocompleteQuery(tb);
                    setShowAutocomplete(true);
                    const coords = J.Utils.getCaretCoordinates(e.target, lo);
                    setCaretPos({ top: coords.top - e.target.scrollTop, left: coords.left - e.target.scrollLeft });
                }
            } else {
                setShowAutocomplete(false);
            }
        };

        const handleSelectAutocomplete = useCallback(async (index) => {
             if (!activeNote) return;
 
             const query = autocompleteQuery.trim();
             let targetTitle = '';
 
             if (index < autocompleteResults.length) {
                 // An existing note was selected
                 targetTitle = autocompleteResults[index].title;
             } else if (query) {
                 // A new note needs to be created
                 const isChild = index === autocompleteResults.length;
                 const newNote = await createNote(query);
                 targetTitle = newNote.title;
 
                 if (isChild) {
                     // Add the new note as a child of the currently edited note
                     const currentLinks = activeNote.linksTo || [];
                     await updateNote(activeNote.id, { linksTo: [...currentLinks, newNote.id] });
                 } else {
                     // Add the currently edited note as a child of the new note
                     await updateNote(newNote.id, { linksTo: [activeNote.id] });
                 }
                 // Refresh topology to reflect the new link
                 getTopology(currentId).then(setTopo);
             } else {
                 return; // Nothing to do
             }
 
             // Insert the wiki link into the editor content
             const before = editContent.slice(0, triggerIndex);
             const after = textareaRef.current.value.slice(textareaRef.current.selectionEnd);
             const updatedContent = `${before}[[${targetTitle}]]${after}`;
             setEditContent(updatedContent);
             setShowAutocomplete(false);
 
             // Return focus to the editor at the correct position
             setTimeout(() => {
                 if (textareaRef.current) {
                     textareaRef.current.focus();
                     const newCaretPosition = triggerIndex + 2 + targetTitle.length + 2;
                     textareaRef.current.setSelectionRange(newCaretPosition, newCaretPosition);
                 }
             }, 50);
        }, [activeNote, autocompleteQuery, autocompleteResults, editContent, triggerIndex, currentId]);

        const { activeIndex: selectedSuggestionIndex, setActiveIndex: setSelectedSuggestionIndex, listRef: sugListRef, handleKeyDown: handleAutocompleteKeyDown } = useListNavigation({
            isOpen: showAutocomplete, 
            itemCount: autocompleteResults.length + (autocompleteQuery.trim() ? 2 : 0), 
            onEnter: handleSelectAutocomplete, 
            onEscape: () => setShowAutocomplete(false)
        });
        const autocompleteDropdownRef = useClickOutside(showAutocomplete, useCallback(() => setShowAutocomplete(false), []));

        // Auto-save logic
        useAutoSave({ activeNote, editContent, currentId, setTopo, setFavs });

        // Actions
        const nav=(id)=>visit(id);
        const togSel=(id)=>id!==currentId&&setSel(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
        
        const toggleEditing = () => {
            if (fSec !== 'content') {
                setContentSource(fSec);
                setFSec('content');
                setIsEditing(true);
            } else {
                if (isEditing) {
                    setIsEditing(false);
                    if (contentSource) setFSec(contentSource);
                } else {
                    setIsEditing(true);
                }
            }
        };

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
                if (id === aid) return;
                const center = await getNote(aid);
                const target = await getNote(id);
                if (!center || !target) return;

                // Unlink any previous relationships to prevent duplicates
                if (center.linksTo.includes(id)) await updateNote(aid, { linksTo: center.linksTo.filter(x => x !== id) });
                if(target.linksTo.includes(aid)) await updateNote(id,{linksTo:target.linksTo.filter(x=>x!==aid)});

                // Apply the new link
                if(linkerType==='up'){ const trg=await getNote(id); await updateNote(id,{linksTo:[...trg.linksTo,aid]}); }
                else if(linkerType==='down'){ const anc=await getNote(aid); await updateNote(aid,{linksTo:[...anc.linksTo,id]}); }
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
            setNoteToRename(newNote); setIsRenameModalOpen(true);
        };

        const changeRelationship = async (type) => {
            const targets = sel.size > 0 ? Array.from(sel) : (getFocusedNote() ? [getFocusedNote().id] : []);
            if(!targets.length || !currentId) return;
            const valid = targets.filter(id => type === 'unlink' || id !== currentId);
            for(const id of valid) {
                const c = await getNote(currentId); const t = await getNote(id);
                if(c.linksTo.includes(id)) await updateNote(currentId,{linksTo:c.linksTo.filter(x=>x!==id)});
                if(t.linksTo.includes(currentId)) await updateNote(id,{linksTo:t.linksTo.filter(x=>x!==currentId)});
                if(type==='up') { const t2=await getNote(id); await updateNote(id,{linksTo:[...t2.linksTo,currentId]}); }
                else if(type==='down') { const c2=await getNote(currentId); await updateNote(currentId,{linksTo:[...c2.linksTo,id]}); }
            }
            getTopology(currentId).then(setTopo); setSel(new Set());
        };

        const handleLinkAction = (type) => { if(sel.size > 0) changeRelationship(type); else { setLinkerType(type); setIsLinkerModalOpen(true); } };
        const handleFavToggle = async () => { const n = getFocusedNote(); if (n) { await toggleFavorite(n.id); setCount(c => c + 1); getTopology(currentId).then(setTopo); getFavorites().then(setFavs); } };
        const getItemsPerColumn = (id) => { const el = document.getElementById(id); if(!el) return 1; const kids = Array.from(el.children).filter(c=>c.id.startsWith('note-')); if(kids.length < 2) return 1; const firstLeft = kids[0].offsetLeft; for(let i=1; i<kids.length; i++) if(kids[i].offsetLeft > firstLeft + 20) return i; return kids.length; };
        const doSearch=async(q)=>{setSearch(q);if(q){setGlobalSearchResults(await searchNotes(q));setGlobalSearchIndex(0);}else setGlobalSearchResults([]);};
        const navSearch = (id) => { // This function now only handles search-specific UI state.
            nav(id);
            setIsGlobalSearchActive(false);
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
        const canUnlink = sel.size > 0 || ['up', 'down'].includes(fSec) || (topo.center && topo.center.id === currentId && (topo.center.linksTo || []).includes(currentId)) || (activeNote && (activeNote.linksTo || []).includes(activeNote.id));

        // --- KEYBOARD HANDLER ---
        const handleGlobalKeyDown = useCallback(async (e) => { // This is still re-created on each render due to dependencies
            const selState=selRef.current, fSecState=fSecRef.current, fIdxState=fIdxRef.current, topoState=topoRef.current, favsState=favsRef.current, secIndState=secIndRef.current, isEditingState=isEditingRef.current, contentSourceState=contentSourceRef.current;
            if (isRenameModalOpen||isLinkerModalOpen||isSettingsOpen||isImportModalOpen||isCalendarOpen||isAllNotesModalOpen||isMentionsModalOpen||vaultChooser||contentSearch) { if (e.key === 'Escape') { if(isCalendarOpen) setIsCalendarOpen(false); if(isAllNotesModalOpen) setIsAllNotesModalOpen(false); if(isMentionsModalOpen) setIsMentionsModalOpen(false); if(vaultChooser) setVaultChooser(false); if(contentSearch) setContentSearch(false); } return; }
            if (isGlobalSearchActive) {
                if (e.key==='Escape') { setIsGlobalSearchActive(false); setFSec('center'); e.preventDefault(); return; }
                if (e.key==='ArrowDown') { e.preventDefault(); setGlobalSearchIndex(p=>(p+1)%globalSearchResults.length); return; }
                if (e.key==='ArrowUp') { e.preventDefault(); setGlobalSearchIndex(p=>(p-1+globalSearchResults.length)%globalSearchResults.length); return; }
                if (e.key==='Enter') { e.preventDefault(); if(globalSearchResults[globalSearchIndex]) { navSearch(globalSearchResults[globalSearchIndex].id); } return; }
                return;
            }
            if (e.key === 'Escape') { if (selState.size > 0) { setSel(new Set()); e.preventDefault(); return; } }
            if (e.altKey && e.key === 'ArrowLeft' && fSecState !== 'content') { e.preventDefault(); back(); return; }
            if (e.altKey && e.key === 'ArrowRight' && fSecState !== 'content') { e.preventDefault(); forward(); return; }
            if (e.key === '/') {
                if (fSecState !== 'content' || (fSecState === 'content' && !isEditingState)) {
                    e.preventDefault();
                    setIsGlobalSearchActive(true); setTimeout(()=>document.querySelector('input[placeholder="Search..."]')?.focus(), 50); return;
                }
            }
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
                if (e.key === 'ArrowUp') { e.preventDefault(); if(selState.size) changeRelationship('up'); else { setLinkerType('up'); setIsLinkerModalOpen(true); } return; }
                if (e.key === 'ArrowDown') { e.preventDefault(); if(selState.size) changeRelationship('down'); else { setLinkerType('down'); setIsLinkerModalOpen(true); } return; }
            }
            if (e.key === 'F2') { e.preventDefault(); const n = getFocusedNote(); if(n) { setNoteToRename(n); setIsRenameModalOpen(true); } return; }
            if (e.key === ' ' && fSecState !== 'content') { e.preventDefault(); const n = getFocusedNote(); if(n && n.id !== currentId) nav(n.id); return; }
            
            if (e.shiftKey && e.key === 'Enter') {
                e.preventDefault();
                if (fSecState !== 'content') {
                    setContentSource(fSecState);
                    setFSec('content');
                    setIsEditing(true);
                } else {
                    if (isEditingState) {
                        setIsEditing(false);
                        if (contentSourceState) setFSec(contentSourceState);
                    } else {
                        setIsEditing(true);
                    }
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
        }, [isEditing, fSec, sel, currentId, back, forward, globalSearchResults, globalSearchIndex, isGlobalSearchActive, isRenameModalOpen, isLinkerModalOpen, isSettingsOpen, isImportModalOpen, isCalendarOpen, goToRandomNote, contentSearch, contentSource]);

        const handleCreateNoteFromLink = async (type) => {
            const { title } = createLinkState;
            if (!title || !activeNote) return;

            const newNote = await createNote(title);
            if (type === 'child') {
                const currentLinks = activeNote.linksTo || [];
                await updateNote(activeNote.id, { linksTo: [...currentLinks, newNote.id] });
            } else { // parent
                await updateNote(newNote.id, { linksTo: [activeNote.id] });
            }

            setCreateLinkState({ isOpen: false, title: '', position: { top: 0, left: 0 } });
            nav(newNote.id);
        };

        const handleKeyDownRef = useRef(handleGlobalKeyDown);
        useEffect(() => { handleKeyDownRef.current = handleGlobalKeyDown; }, [handleGlobalKeyDown]);
        useEffect(() => { const h=(e)=>handleKeyDownRef.current(e); window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h); }, []);
        
        // Insert today's date (yyyy-mm-dd) at the caret with Ctrl/Cmd+Shift+D,
        // works in any focused input/textarea (editor, linker, search, [[ autocomplete).
        useEffect(() => {
            const insertDate = (e) => {
                if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || e.code !== 'KeyD') return;
                const el = document.activeElement;
                if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;
                e.preventDefault();
                const dateStr = formatDateForJournal(new Date()).full;
                const start = el.selectionStart ?? el.value.length;
                const end = el.selectionEnd ?? start;
                // Use React's instance setter when present so its value tracker stays in
                // sync and it won't re-apply the value (and move the caret) on re-render.
                const own = Object.getOwnPropertyDescriptor(el, 'value');
                const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
                const setter = (own && own.set) ? own.set : Object.getOwnPropertyDescriptor(proto, 'value').set;
                setter.call(el, el.value.slice(0, start) + dateStr + el.value.slice(end));
                const caret = start + dateStr.length;
                el.setSelectionRange(caret, caret);
                el.dispatchEvent(new Event('input', { bubbles: true }));
                // Re-apply the selection after React commits the re-render.
                setTimeout(() => {
                    if (document.activeElement === el && el.selectionStart !== caret) el.setSelectionRange(caret, caret);
                }, 0);
            };
            window.addEventListener('keydown', insertDate);
            return () => window.removeEventListener('keydown', insertDate);
        }, []);
        
        const onPreviewClick = async (e) => {
            if (e.target.classList.contains('internal-link') && e.target.dataset.title) {
                e.preventDefault();
                const title = e.target.dataset.title;
                const noteToNav = await findNoteByTitle(title);
                if (noteToNav) {
                    nav(noteToNav.id);
                    // Ensure we are not in edit mode when navigating
                    if (isEditing) {
                        setIsEditing(false);
                    }
                } else {
                    const rect = e.target.getBoundingClientRect();
                    setCreateLinkState({ isOpen: true, title, position: { top: rect.bottom + 5, left: rect.left } });
                }
            }
        };
        
        return html`
            <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans flex-col">
                <${TopBar}
                    nav=${nav} back=${back} forward=${forward} canBack=${canBack} canForward=${canForward} goHome=${async()=>{nav(await getHomeNoteId())}}
                    isCalendarOpen=${isCalendarOpen} setIsCalendarOpen=${setIsCalendarOpen} calendarDates=${calendarDates} setCalendarDates=${setCalendarDates} handleCalendarSelect=${async(d)=>{setIsCalendarOpen(false);nav(await goToDate(d))}} handleCalendarMonthChange=${async(y,m)=>{const p=`${y}-${String(m).padStart(2,'0')}-`;setCalendarDates(new Set(await getNoteTitlesByPrefix(p)))}}
                    activeNote=${activeNote} handleFavToggle=${handleFavToggle} toggleEditing=${toggleEditing} isEditing=${isEditing} activeHasContent=${activeHasContent} setNoteToRename=${setNoteToRename} setIsRenameModalOpen=${setIsRenameModalOpen}
                    deleteNote=${deleteNote} currentId=${currentId} canUnlink=${canUnlink} changeRelationship=${changeRelationship} handleLinkAction=${handleLinkAction}
                    search=${search} doSearch=${doSearch} isSearchActive=${isGlobalSearchActive} setIsSearchActive=${setIsGlobalSearchActive} searchResults=${globalSearchResults} selectedSearchIndex=${globalSearchIndex} setSelectedSearchIndex=${setGlobalSearchIndex} navSearch=${navSearch}
                    setIsAllNotesModalOpen=${setIsAllNotesModalOpen}
                    setIsMentionsModalOpen=${setIsMentionsModalOpen}
                    goToRandomNote=${goToRandomNote}
                    setContentSearch=${setContentSearch}
                    onThemeSelect=${async (id) => {
                        const t = await getTheme(id);
                        if(t) { await setActiveThemeId(id); applyTheme(t); }
                    }}
                    themes=${themes}
                    dark=${dark} setIsSettingsOpen=${setIsSettingsOpen} exportData=${exportData} setImportData=${setImportData} setIsImportModalOpen=${setIsImportModalOpen} fontSize=${fs}
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
                                        ${topo.center.isFavorite&&html`<${Icons.Star} width="18" height="18" fill="currentColor" />`}
                                        ${topo.center.content&&html`<${Icons.Edit} width="18" height="18" fill="currentColor" />`}
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

                        ${vis.showFavorites && html`
                            <${FavoritesPanel} favs=${favs} onNavigate=${(id) => nav(id)} />
                        `}
                    </div>

                    <${ResizeHandle} onMouseDown=${handleMouseDown} />

                    <div 
                        style=${{ borderColor: 'color-mix(in srgb, var(--primary) 20%, transparent)' }}
                        className="flex-1 h-full bg-background border-l min-w-0 relative"
                        onClick=${() => setFSec('content')}
                    >
                            <${EditorPane} 
                                showEditor=${fSec === 'content' && isEditing && activeNote}
                                activeNote=${activeNote}
                                editContent=${editContent}
                                onTextChange=${handleContentChange}
                                textareaRef=${textareaRef}
                                previewRef=${previewRef}
                                prevH=${prevH}
                                fontPx=${fs}
                                focusedClass=${fSec === 'content'}
                                onPreviewClick=${onPreviewClick}
                                showAutocomplete=${showAutocomplete}
                                autocompleteQuery=${autocompleteQuery}
                                autocompleteResults=${autocompleteResults}
                                selectedIndex=${selectedSuggestionIndex}
                                caretPos=${caretPos}
                                onAutocompleteSelect=${handleSelectAutocomplete}
                                onAutocompleteHover=${setSelectedSuggestionIndex}
                                onAutocompleteKeyDown=${handleAutocompleteKeyDown}
                                autocompleteDropdownRef=${autocompleteDropdownRef}
                                sugListRef=${sugListRef}
                            />
                        </div>
                    </div>

                <${StatusBar} noteCount=${count} vaultName=${getCurrentVaultName()} version=${APP_VERSION} fontSize=${fs} onVaultClick=${() => setVaultChooser(p => !p)} activeNote=${activeNote} />

                <${VaultChooser} 
                    isOpen=${vaultChooser} 
                    onClose=${() => setVaultChooser(false)} 
                    onManage=${() => {
                        setVaultChooser(false);
                        setIsSettingsOpen({ open: true, initialTab: 'database', focusOn: 'newVaultInput' });
                    }}
                />
                <${LinkerModal} isOpen=${isLinkerModalOpen} type=${linkerType} onClose=${()=>setIsLinkerModalOpen(false)} onSelect=${handleLink} sourceNoteId=${getFocusedNote()?.id || currentId} />
                <${SettingsModal} isOpen=${isSettingsOpen.open || isSettingsOpen === true} onClose=${()=>setIsSettingsOpen(false)} currentCentralNoteId=${currentId} fontSize=${fs} onFontSizeChange=${setFs} onThemeChange=${async ()=>{
                    const tId = await getActiveThemeId();
                    const t = await getTheme(tId);
                    if(t) applyTheme(t);
                    getThemes().then(setThemes);
                }} onSettingsChange=${async ()=>{
                    getSectionVisibility().then(setVis);
                    setAttachmentAliases(await getAttachmentAliases());
                }} initialTab=${isSettingsOpen.initialTab} focusOn=${isSettingsOpen.focusOn} />
                <${ImportModal} isOpen=${isImportModalOpen} importData=${importData} onClose=${()=>setIsImportModalOpen(false)} onConfirm=${async m=>{await importNotes(importData,m);setIsImportModalOpen(false);window.location.reload()}} />
                <${RenameModal} 
                    isOpen=${isRenameModalOpen} 
                    currentTitle=${noteToRename?noteToRename.title:''} 
                    onClose=${()=>setIsRenameModalOpen(false)} 
                    onRename=${async (t)=>{
                        if (!noteToRename) return;
                        const oldTitle = noteToRename.title;
                        const newTitle = t;
                        const noteId = noteToRename.id;

                        await updateNote(noteId, { title: newTitle });

                        // Use searchContent to find notes referencing the old title
                        // We search for the wiki link syntax to narrow it down
                        const searchResults = await searchContent(`[[${oldTitle}`);
                        
                        const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`\\[\\[(${escapeRegExp(oldTitle)})(\\|.*?)?\\]\\]`, 'gi');

                        for (const result of searchResults) {
                            const note = await getNote(result.id);
                            if (!note || !note.content) continue;

                            if (isEditing && activeNote && note.id === activeNote.id) {
                                setEditContent(prev => prev.replace(regex, (match, p1, p2) => `[[${newTitle}${p2 || ''}]]`));
                            } else {
                                const newContent = note.content.replace(regex, (match, p1, p2) => `[[${newTitle}${p2 || ''}]]`);
                                if (newContent !== note.content) await updateNote(note.id, { content: newContent });
                            }
                        }

                        setIsRenameModalOpen(false);
                        getTopology(currentId).then(setTopo);
                    }} 
                />
                <${AllNotesModal} isOpen=${isAllNotesModalOpen} onClose=${()=>setIsAllNotesModalOpen(false)} onSelect=${id=>{setIsAllNotesModalOpen(false);nav(id);}} />
                <${MentionsModal} isOpen=${isMentionsModalOpen} onClose=${()=>setIsMentionsModalOpen(false)} onSelect=${(id, term)=>{
                    setIsMentionsModalOpen(false);
                    setHighlightTerm(term);
                    nav(id);
                    setIsEditing(false);
                    setFSec('content');
                }} currentNoteId=${activeNote?.id} title=${activeNote?.title} />
                <${ContentSearchModal} 
                    isOpen=${contentSearch} 
                    onClose=${()=>setContentSearch(false)} 
                    onNavigate=${id=>{setContentSearch(false);nav(id);}} 
                    initialQuery=${contentSearchState.query} 
                    initialResults=${contentSearchState.results} 
                    onStateChange=${(q, r) => setContentSearchState({query: q, results: r})}
                />
                <${CreateNoteFromLinkModal} isOpen=${createLinkState.isOpen} onClose=${() => setCreateLinkState({ isOpen: false })} onCreate=${handleCreateNoteFromLink} title=${createLinkState.title} position=${createLinkState.position} />
            </div>
        `;
    };
})(window.Jaroet);
