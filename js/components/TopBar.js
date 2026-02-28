
(function(J) {
    const { useState, useRef, useCallback } = React;
    const { Icons, CalendarDropdown, VaultChooser } = J;
    const { deleteNote, getHomeNoteId } = J.Services.DB;
    const { goToDate } = J.Services.Journal;

    J.TopBar = (props) => {
        const {
            nav, back, forward, canBack, canForward, goHome,
            isCalendarOpen, setIsCalendarOpen, calendarDates, setCalendarDates, handleCalendarSelect, handleCalendarMonthChange,
            activeNote, handleFavToggle, setIsEditorOpen, activeHasContent, setNoteToRename, setIsRenameModalOpen,
            canUnlink, changeRelationship, handleLinkAction,
            search, doSearch, isSearchActive, setIsSearchActive, searchResults, navSearch, selectedSearchIndex, setSelectedSearchIndex,
            dark, setIsSettingsOpen, exportData, setImportData, setIsImportModalOpen, setIsAllNotesModalOpen, setIsMentionsModalOpen, goToRandomNote, setContentSearch,
            fontSize, themes, onThemeSelect, onSortChange
        } = props;

        const searchRef = useRef(null);
        const [themeDrop, setThemeDrop] = useState(false);
        const [sortDrop, setSortDrop] = useState(false);

        const { useClickOutside, useListNavigation } = J.Hooks;

        // Centralized hook for search list navigation
        const { activeIndex: sIdx, setActiveIndex: setSIdx, listRef, handleKeyDown: handleSearchKeyDown } = useListNavigation({
            isOpen: isSearchActive && searchResults.length > 0,
            itemCount: searchResults.length,
            onEnter: (index) => {
                navSearch(searchResults[index].id);
                searchRef.current?.blur();
            },
            onEscape: () => setIsSearchActive(false)
        });

        // Use the new hook for click-outside behavior
        const themeDropdownRef = useClickOutside(themeDrop, useCallback(() => setThemeDrop(false), []));
        const sortDropdownRef = useClickOutside(sortDrop, useCallback(() => setSortDrop(false), []));
        const searchDropdownContainerRef = useClickOutside(isSearchActive && searchResults.length > 0, useCallback(() => {
            setIsSearchActive(false);
            searchRef.current?.blur(); // Optionally blur the search input
        }, []));

        // Icon Button Helper
        const Btn = ({ onClick, disabled, active, icon, title, className="", forceColor=true }) => html`
            <button 
                onClick=${onClick} 
                disabled=${disabled}
                title=${title}
                style=${forceColor || active ? { color: 'var(--theme-accent)' } : {}}
                className=${`p-1.5 rounded transition-colors duration-200 ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/10'} ${active ? 'bg-primary/10' : 'text-gray-400'} ${className}`}
            >
                <${icon} />
            </button>
        `;

        // Vertical Separator
        const Sep = () => html`<div className="h-5 w-px bg-current opacity-10 mx-1"></div>`;

        const currentSort = activeNote?.childSort || (
            (/^(Journal Hub|\d{4}(-\d{2})?(-\d{2})?)$/.test(activeNote?.title) ? 'title_desc' : 'title_asc')
        );

        const sortLabels = {
            'manual': 'Manual',
            'title_asc': 'A-Z', 'title_desc': 'Z-A',
            'created_asc': 'Oldest', 'created_desc': 'Newest',
            'modified_asc': 'Least Recent', 'modified_desc': 'Most Recent'
        };

        return html`
            <div 
                style=${{fontSize:`${Math.max(12,fontSize-4)}px`}} 
                className="h-12 flex-shrink-0 flex items-center px-3 gap-1 z-40 relative app-bar border-b text-foreground transition-colors duration-300"
                onClick=${e => e.stopPropagation()}
            >
                
                <div className="flex items-center gap-1">
                    <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-md p-0.5 gap-0.5">
                        <${Btn} onClick=${back} disabled=${!canBack} icon=${Icons.ChevronLeft} title="Back (Alt+Left)" />
                        <${Btn} onClick=${forward} disabled=${!canForward} icon=${Icons.ChevronRight} title="Forward (Alt+Right)" />
                    </div>

                    <${Btn} onClick=${goHome} icon=${Icons.Home} title="Home" />

                    <div className="relative">
                        <${Btn} onClick=${()=>setIsCalendarOpen(!isCalendarOpen)} icon=${Icons.Calendar} title="Journal (Ctrl+J)" active=${isCalendarOpen} />
                        <${CalendarDropdown} isOpen=${isCalendarOpen} onClose=${()=>setIsCalendarOpen(false)} onSelectDate=${handleCalendarSelect} existingDates=${calendarDates} onMonthChange=${handleCalendarMonthChange} />
                    </div>

                    <${Btn} onClick=${() => setContentSearch(true)} icon=${Icons.Search} title="Content Search (Ctrl+Shift+F)" />
                    <${Btn} onClick=${() => setIsAllNotesModalOpen(true)} icon=${Icons.List} title="All Notes" />
                    <${Btn} onClick=${() => setIsMentionsModalOpen(true)} icon=${Icons.LinkLeft} title="Mentions" disabled=${!activeNote} />
                    <${Btn} onClick=${goToRandomNote} icon=${Icons.Shuffle} title="Random Note (Ctrl+Alt+R)" />
                    
                    <div className="relative">
                        <button onClick=${()=>setSortDrop(!sortDrop)} style=${{ color: 'var(--theme-accent)' }} className="px-2 py-1.5 text-xs font-medium rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors h-8 flex items-center" title="Sort Order">
                            ${sortLabels[currentSort] || 'Sort'}
                        </button>
                        ${sortDrop && html`
                            <div ref=${sortDropdownRef} className="absolute top-full left-0 mt-1 w-36 bg-card border border-gray-200 dark:border-gray-700 shadow-xl rounded-md z-50 py-1">
                                ${Object.entries(sortLabels).map(([k, v]) => html`
                                    <div 
                                        key=${k} 
                                        onClick=${() => { onSortChange(k); setSortDrop(false); }} 
                                        className=${`flex items-center justify-between px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${currentSort === k ? 'font-bold text-primary' : ''}`}
                                    >
                                        <span>${v}</span>
                                        ${currentSort === k && html`<${Icons.Check} width="16" height="16" />`}
                                    </div>
                                `)}
                            </div>
                        `}
                    </div>
                </div>

                <${Sep} />

                <div className="flex items-center gap-1">
                    <${Btn} onClick=${handleFavToggle} icon=${Icons.Star} title="Toggle Favorite" active=${activeNote?.isFavorite} forceColor=${activeNote?.isFavorite} />
                    <${Btn} onClick=${()=>setIsEditorOpen(true)} icon=${Icons.Edit} title="Edit Content" active=${activeHasContent} forceColor=${activeHasContent} />
                    <${Btn} onClick=${()=>{if(activeNote){setNoteToRename(activeNote);setIsRenameModalOpen(true)}}} icon=${Icons.Rename} title="Rename (F2)" />
                    <${Btn} onClick=${async()=>{if(activeNote&&confirm('Delete Note?')){await deleteNote(activeNote.id);nav(currentId===activeNote.id?await getHomeNoteId():currentId);}}} icon=${Icons.Trash} title="Delete" className="hover:text-red-500" />
                </div>

                <${Sep} />

                <div className="flex items-center gap-1">
                    <${Btn} onClick=${()=>changeRelationship('unlink')} disabled=${!canUnlink} icon=${Icons.Unlink} title="Unlink (Backspace)" forceColor=${canUnlink} />
                    <${Btn} onClick=${()=>handleLinkAction('up')} icon=${Icons.LinkUp} title="Link Parent (Ctrl+Up)" />
                    <${Btn} onClick=${()=>handleLinkAction('down')} icon=${Icons.LinkDown} title="Link Child (Ctrl+Down)" />
                </div>

                <${Sep} />

                <div className="relative flex-1 min-w-[150px]">
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" style=${{color:'var(--theme-accent)'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                    <input 
                        ref=${searchRef} 
                        value=${search} 
                        onChange=${e=>doSearch(e.target.value)} 
                        onFocus=${()=>setIsSearchActive(true)} 
                        onKeyDown=${handleSearchKeyDown} 
                        placeholder="Search..." 
                        className="w-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 focus:bg-background rounded-md pl-8 pr-3 py-1 outline-none transition-all border border-transparent text-sm h-8"
                        style=${{ borderColor: isSearchActive ? 'var(--theme-accent)' : 'transparent' }} 
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-30 text-xs pointer-events-none border border-current px-1 rounded">/</div>
                    
                    ${isSearchActive&&searchResults.length>0&&html`
                        <div ref=${(el) => { searchDropdownContainerRef.current = el; listRef.current = el; }} className="absolute top-full left-0 right-0 mt-1 bg-card border border-gray-200 dark:border-gray-700 shadow-xl rounded-md max-h-64 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-1 duration-75">
                            ${searchResults.map((r,i)=>html`
                                <div 
                                    key=${r.id} 
                                    onMouseDown=${() => {
                                        navSearch(r.id);
                                        searchRef.current?.blur();
                                    }} 
                                    className=${`px-4 py-2 cursor-pointer text-sm flex justify-between ${i===sIdx?'bg-primary text-white':'hover:bg-gray-100 dark:hover:bg-gray-800'}`} 
                                    onMouseEnter=${()=>setSIdx(i)}
                                >
                                    <span className="truncate">${r.title}</span>
                                </div>
                            `)}
                        </div>
                    `}
                </div>

                <${Sep} />

                <div className="flex items-center gap-1">
                    <div className="relative">
                        <${Btn} onClick=${()=>setThemeDrop(p=>!p)} icon=${dark?Icons.Sun:Icons.Moon} title="Select Theme" active=${themeDrop} />
                        ${themeDrop&&html`
                            <div 
                                ref=${themeDropdownRef}
                                className="absolute top-full right-0 mt-2 w-48 bg-card border border-gray-200 dark:border-gray-700 shadow-xl rounded-md z-50 animate-in fade-in zoom-in-95 duration-100"
                                onClick=${e => e.stopPropagation()}
                            >
                                <div className="p-2 text-xs font-bold uppercase text-gray-500 border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">Select Theme</div>
                                ${themes.map(t => html`
                                    <div key=${t.id} onClick=${()=>{onThemeSelect(t.id);setThemeDrop(false)}} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-sm truncate">
                                        ${t.name}
                                    </div>
                                `)}
                            </div>
                        `}
                    </div>
                    <${Btn} onClick=${()=>setIsSettingsOpen(true)} icon=${Icons.Settings} title="Settings" />
                    <${Btn} onClick=${exportData} icon=${Icons.Download} title="Export JSON" />
                    <${Btn} onClick=${()=>{const i=document.createElement('input');i.type='file';i.accept='.json';i.onchange=e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>{setImportData(JSON.parse(ev.target.result));setIsImportModalOpen(true);};r.readAsText(f);}};i.click();}} icon=${Icons.Upload} title="Import JSON" />
                </div>

            </div>
        `;
    };
})(window.Jaroet);
