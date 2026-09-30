(function(J) {
    J.EditorPane = ({
        showEditor, activeNote, editContent, onTextChange, textareaRef, previewRef, prevH, fontPx, focusedClass,
        onPreviewClick, showAutocomplete, autocompleteQuery, autocompleteResults, selectedIndex, caretPos,
        onAutocompleteSelect, onAutocompleteHover, onAutocompleteKeyDown, autocompleteDropdownRef, sugListRef
    }) => {
        return html`
            ${showEditor ? html`
                <textarea
                    ref=${textareaRef}
                    style=${{ fontSize: `${fontPx * 0.95}px` }}
                    className="w-full h-full bg-transparent resize-none outline-none font-mono custom-scrollbar p-6"
                    value=${editContent}
                    onChange=${onTextChange}
                    onKeyDown=${(e) => {
                        if (showAutocomplete) {
                            if (['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
                                e.stopPropagation();
                                onAutocompleteKeyDown(e);
                            }
                        }
                    }}
                    placeholder="Start typing..."
                ></textarea>
                ${showAutocomplete && html`
                    <div ref=${(el) => { autocompleteDropdownRef.current = el; sugListRef.current = el; }} className="absolute z-50 w-64 bg-card border border-gray-200 dark:border-gray-700 shadow-xl rounded-md max-h-60 overflow-y-auto custom-scrollbar" style=${{top:caretPos.top+30,left:caretPos.left+24}}>
                        ${autocompleteResults.length===0?html`<div className="p-2 text-xs text-gray-500 italic">No matching notes</div>`
                        :autocompleteResults.map((s,i)=>html`
                            <div key=${s.id} onClick=${()=>onAutocompleteSelect(i)} onMouseEnter=${() => onAutocompleteHover(i)} className=${`px-3 py-2 text-sm cursor-pointer ${i===selectedIndex?'bg-primary text-primary-foreground':'hover:bg-black/5 dark:hover:bg-white/10'}`}>
                                ${s.title}
                            </div>
                        `)}
                        ${autocompleteQuery.trim() && html`
                            <div onClick=${() => onAutocompleteSelect(autocompleteResults.length)} onMouseEnter=${() => onAutocompleteHover(autocompleteResults.length)} className=${`px-3 py-2 text-sm cursor-pointer border-t dark:border-gray-700 ${selectedIndex === autocompleteResults.length ? 'bg-primary text-primary-foreground' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}>
                                <span className="opacity-50 mr-2">+</span> Create "${autocompleteQuery}" as Child
                            </div>
                            <div onClick=${() => onAutocompleteSelect(autocompleteResults.length + 1)} onMouseEnter=${() => onAutocompleteHover(autocompleteResults.length + 1)} className=${`px-3 py-2 text-sm cursor-pointer ${selectedIndex === autocompleteResults.length + 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}>
                                <span className="opacity-50 mr-2">+</span> Create "${autocompleteQuery}" as Parent
                            </div>
                        `}
                    </div>
                `}
            ` : activeNote ? html`
                <div 
                    ref=${previewRef}
                    tabIndex=${0}
                    style=${{ fontSize: `${fontPx}px` }}
                    className=${`w-full h-full overflow-y-auto custom-scrollbar p-8 prose dark:prose-invert max-w-none compact-markdown transition-all duration-200 outline-none ${focusedClass ? 'ring-2 ring-primary/10 rounded-lg' : ''}`} 
                    dangerouslySetInnerHTML=${{ __html: prevH || '<span class="text-gray-400 italic">No content</span>' }}
                    onClick=${onPreviewClick}
                ></div>
            ` : html`
                <div className="flex items-center justify-center h-full text-gray-400 italic select-none">
                    No content
                </div>
            `}
        `;
    };
})(window.Jaroet);