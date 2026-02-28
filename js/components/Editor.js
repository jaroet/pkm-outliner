
(function(J) {
    const { useState, useEffect, useRef, useCallback } = React;
    const { searchNotes } = J.Services.DB;
    const { createRenderer } = J.Services.Markdown;

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

    J.Editor = ({note, isOpen, mode, onClose, onSave, onLink}) => {
        const [content, setContent] = useState('');
        const [htmlContent, setHtmlContent] = useState('');
        const [isPreview, setIsPreview] = useState(mode === 'view');
        // Autocomplete State
        const [showSuggestions, setShowSuggestions] = useState(false);
        const [searchQuery, setSearchQuery] = useState('');
        const [searchResults, setSearchResults] = useState([]);
        const [caretPos, setCaretPos] = useState({ top: 0, left: 0 });
        const [triggerIndex, setTriggerIndex] = useState(-1);
        
        const textareaRef = useRef(null); 
        const previewRef = useRef(null); 
        const containerRef = useRef(null);
        const formatBuffer = useRef('');
        const formatTimeout = useRef(null);
        const { useClickOutside } = J.Hooks;

        // Initialize
        useEffect(()=>{
            if(note&&isOpen){
                setContent(note.content||'');
                setIsPreview(mode==='view');
                setShowSuggestions(false);
                setTimeout(()=>{
                    if(mode==='view') previewRef.current?.focus();
                    else if(textareaRef.current) { textareaRef.current.focus(); textareaRef.current.setSelectionRange(textareaRef.current.value.length,textareaRef.current.value.length); }
                },100);
            }
        },[note?.id, isOpen]); // Only reset on note change or open

        // Markdown Parsing (Synchronous with marked v9)
        useEffect(()=>{
            if(!isPreview) return;
            const renderer = createRenderer({clickableCheckboxes:true});
            const html = marked.parse(content||'',{breaks:true,gfm:true,renderer});
            setHtmlContent(html);
        },[content, isPreview]);

        // Autocomplete Search
        useEffect(()=>{
            if(showSuggestions){
                const t=setTimeout(async()=>{
                    setSearchResults(await searchNotes(searchQuery)); 
                },150);
                return ()=>clearTimeout(t);
            }
        },[searchQuery, showSuggestions]);

        const ins=(title)=>{
            const b=content.slice(0,triggerIndex);
            const a=content.slice(textareaRef.current.selectionEnd);
            const n=`${b}[[${title}]]${a}`;
            setContent(n); setShowSuggestions(false);
            setTimeout(()=>{
                if(textareaRef.current){
                    textareaRef.current.focus();
                    const p=triggerIndex+2+title.length+2;
                    textareaRef.current.setSelectionRange(p,p);
                }
            },50);
        };

        const handleChange=(e)=>{
            const v=e.target.value; setContent(v);
            const c=e.target.selectionEnd;
            const lo=v.lastIndexOf('[[',c);
            if(lo!==-1){
                const tb=v.slice(lo+2,c);
                if(tb.includes(']]')||tb.includes('\n')){ setShowSuggestions(false); }
                else {
                    setTriggerIndex(lo); setSearchQuery(tb); setShowSuggestions(true);
                    const coords=getCaretCoordinates(e.target,lo);
                    setCaretPos({top:coords.top-e.target.scrollTop,left:coords.left-e.target.scrollLeft});
                }
            } else { setShowSuggestions(false); }
        };

        // --- Centralized Hook Usage ---
        const { useListNavigation } = J.Hooks;
        const { activeIndex: selectedSuggestionIndex, setActiveIndex: setSelectedSuggestionIndex, listRef: sugListRef, handleKeyDown: handleAutocompleteKeyDown } = useListNavigation({
            isOpen: showSuggestions,
            itemCount: searchResults.length,
            onEnter: (index) => {
                if (searchResults[index]) ins(searchResults[index].title);
            },
            onEscape: () => setShowSuggestions(false)
        });

        // Use the click-outside hook for the autocomplete dropdown
        const autocompleteDropdownRef = useClickOutside(showSuggestions, useCallback(() => setShowSuggestions(false), []));

        const handleKeyDown=(e)=>{
            e.stopPropagation(); // Prevent global app listeners
            
            // Autocomplete
            if (showSuggestions) {
                // Pass event to the navigation hook. It will preventDefault if it handles the key.
                handleAutocompleteKeyDown(e);
                // If the hook handled it, we can stop.
                if (['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
                    return;
                }
            }

            // Formatting Shortcuts (Wrap/Unwrap Selection) with Delay
            if (textareaRef.current && textareaRef.current.selectionStart !== textareaRef.current.selectionEnd) {
                if (['[', '*'].includes(e.key)) {
                    e.preventDefault();
                    const key = e.key;

                    // Reset buffer if key changes
                    if (formatBuffer.current.length > 0 && formatBuffer.current[0] !== key) {
                        formatBuffer.current = '';
                        if (formatTimeout.current) clearTimeout(formatTimeout.current);
                    }

                    formatBuffer.current += key;
                    if (formatTimeout.current) clearTimeout(formatTimeout.current);

                    formatTimeout.current = setTimeout(() => {
                        const buf = formatBuffer.current;
                        formatBuffer.current = '';
                        
                        if (!textareaRef.current) return;

                        const start = textareaRef.current.selectionStart;
                        const end = textareaRef.current.selectionEnd;
                        const val = textareaRef.current.value;
                        const selectedText = val.substring(start, end);
                        const before = val.substring(0, start);
                        const after = val.substring(end);
                        
                        let syntax = buf;
                        let closeSyntax = buf;

                        if (buf.startsWith('[')) closeSyntax = buf.replace(/\[/g, ']');

                        if (before.endsWith(syntax) && after.startsWith(closeSyntax)) {
                            const newBefore = before.substring(0, before.length - syntax.length);
                            const newAfter = after.substring(closeSyntax.length);
                            setContent(newBefore + selectedText + newAfter);
                            setTimeout(() => { if(textareaRef.current) { textareaRef.current.focus(); textareaRef.current.setSelectionRange(newBefore.length, newBefore.length + selectedText.length); } }, 0);
                        } else {
                            setContent(before + syntax + selectedText + closeSyntax + after);
                            setTimeout(() => { if(textareaRef.current) { textareaRef.current.focus(); textareaRef.current.setSelectionRange(start + syntax.length, end + syntax.length); } }, 0);
                        }
                    }, 200);
                    return;
                }
            }

            if(e.key==='Escape'){e.preventDefault();onClose();return;}
            
            // Shift+Enter (Toggle Edit/View)
            if(e.shiftKey&&e.key==='Enter'){
                e.preventDefault();
                if(isPreview) { 
                    // Switch to Edit
                    setIsPreview(false); 
                    setTimeout(()=>textareaRef.current?.focus(),50); 
                } else { 
                    // Save and Switch to View
                    (async () => { 
                        await onSave(note.id,content); 
                        setIsPreview(true); setTimeout(()=>previewRef.current?.focus(),50); 
                    })(); 
                }
                return;
            }

            // Tab for indent/outdent
            if (e.key === 'Tab' && !isPreview && e.target === textareaRef.current) {
                // The autocomplete hook already handles Tab when the suggestion box is open.
                // This check prevents indenting when trying to select an autocomplete item.
                if (showSuggestions) return;

                const val = textareaRef.current.value;
                const start = textareaRef.current.selectionStart;
                const before = val.substring(0, start);
                const lineStart = before.lastIndexOf('\n') + 1;
                const currentLine = val.substring(lineStart, val.indexOf('\n', start) === -1 ? val.length : val.indexOf('\n', start));

                // Only apply to lines that look like list items
                if (/^[-*]\s/.test(currentLine.trim())) {
                    e.preventDefault();
                    let newVal, newCursorPos;
                    if (e.shiftKey) { // Outdent
                        newVal = val.substring(0, lineStart) + val.substring(lineStart + 2);
                        newCursorPos = Math.max(lineStart, start - 2);
                    } else { // Indent
                        newVal = val.substring(0, lineStart) + '  ' + val.substring(lineStart);
                        newCursorPos = start + 2;
                    }
                    setContent(newVal);
                    setTimeout(() => { if (textareaRef.current) { textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorPos; textareaRef.current.focus(); } }, 0);
                    return;
                }
            }

            // List Continuation
            if(e.key==='Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !isPreview && e.target === textareaRef.current){
                const val = textareaRef.current.value;
                const start = textareaRef.current.selectionStart;
                const end = textareaRef.current.selectionEnd;
                const before = val.substring(0, start);
                const lineStart = before.lastIndexOf('\n') + 1;
                const currentLine = before.substring(lineStart);
                const match = currentLine.match(/^(\s*[-*]\s)(.*)/);
                
                if(match){
                    e.preventDefault();
                    const prefix = match[1];
                    const content = match[2];
                    let newVal, newCursorPos;
                    
                    if(!content.trim()){
                        newVal = val.substring(0, lineStart) + '\n' + val.substring(end);
                        newCursorPos = lineStart + 1;
                    } else {
                        const insertion = '\n' + prefix;
                        newVal = val.substring(0, start) + insertion + val.substring(end);
                        newCursorPos = start + insertion.length;
                    }
                    setContent(newVal);
                    setTimeout(()=>{ if(textareaRef.current){ textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorPos; textareaRef.current.focus(); } }, 0);
                    return;
                }
            }
        };

        const handlePreviewClick=(e)=>{
            if(e.target.classList.contains('internal-link')){
                e.preventDefault();
                onLink(e.target.dataset.title);
            }
            // Checkbox logic could go here
        };

        if(!isOpen||!note)return null;

        return html`
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick=${onClose}>
                <div ref=${containerRef} tabIndex=${-1} onKeyDown=${handleKeyDown} onClick=${e => e.stopPropagation()} className="w-full max-w-[90vw] h-[90vh] bg-card rounded-lg shadow-2xl flex flex-col border border-gray-200 dark:border-gray-800 outline-none relative">
                    <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 bg-background/50 rounded-t-lg">
                        <h2 className="text-xl font-bold truncate pr-4">${note.title}</h2>
                        <div className="flex gap-2 flex-shrink-0">
                            <button onClick=${async ()=>{
                                if(isPreview){
                                    setIsPreview(false);setTimeout(()=>textareaRef.current?.focus(),50);
                                }else{
                                    await onSave(note.id,content);
                                    setIsPreview(true);setTimeout(()=>previewRef.current?.focus(),50);
                                }
                            }} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:opacity-80 text-sm min-w-[80px]">
                                ${isPreview?'Edit':'Preview'}
                            </button>
                            ${!isPreview&&html`<button onClick=${async ()=>{await onSave(note.id,content);onClose()}} className="px-3 py-1 rounded bg-primary text-primary-foreground hover:opacity-80 text-sm">Save & Close</button>`}
                            <button onClick=${onClose} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:opacity-80 text-sm">Close</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden relative bg-background/50">
                        ${isPreview?html`
                            <div ref=${previewRef} tabIndex=${0} onClick=${handlePreviewClick} style=${{fontSize:'15px'}} className="w-full h-full p-6 overflow-auto prose dark:prose-invert max-w-none custom-scrollbar select-text outline-none compact-markdown" dangerouslySetInnerHTML=${{__html:htmlContent}} />
                        `:html`
                            <div className="relative w-full h-full">
                                <textarea ref=${textareaRef} value=${content} onChange=${handleChange} style=${{fontSize:'15px'}} className="w-full h-full p-6 bg-transparent resize-none outline-none font-mono custom-scrollbar" placeholder="Type markdown here... Use [[ to link." />
                                ${showSuggestions&&html`
                                    <div ref=${(el) => { autocompleteDropdownRef.current = el; sugListRef.current = el; }} className="absolute z-50 w-64 bg-card border border-gray-200 dark:border-gray-700 shadow-xl rounded-md max-h-60 overflow-y-auto custom-scrollbar" style=${{top:caretPos.top+30,left:caretPos.left+24}}>
                                        ${searchResults.length===0?html`<div className="p-2 text-xs text-gray-500 italic">No matching notes</div>`
                                        :searchResults.map((s,i)=>html`
                                            <div key=${s.id} onClick=${()=>ins(s.title)} onMouseEnter=${() => setSelectedSuggestionIndex(i)} className=${`px-3 py-2 text-sm cursor-pointer ${i===selectedSuggestionIndex?'bg-primary text-primary-foreground':'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                                ${s.title}
                                            </div>
                                        `)}
                                    </div>
                                `}
                            </div>
                        `}
                    </div>
                    <div className="p-2 text-xs text-gray-500 border-t dark:border-gray-700 text-center bg-background/50 rounded-b-lg">
                        ${isPreview?'View Mode • Shift+Enter: Edit • Esc: Close':'Edit Mode • [[ for links • Shift+Enter: Save & View • Esc: Cancel'}
                    </div>
                </div>
            </div>
        `;
    };
})(window.Jaroet);
