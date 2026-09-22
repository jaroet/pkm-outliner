(function(J) {
    J.FavoritesPanel = ({favs, onNavigate}) => html`
        <div style=${{ borderColor: 'color-mix(in srgb, var(--primary) 20%, transparent)' }} className="flex-shrink-0 p-3 border-t bg-gray-50/50 dark:bg-gray-900/30 backdrop-blur-sm">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Favorites</div>
            <div className="flex flex-wrap gap-2">
                ${favs.length > 0 ? favs.map(f => html`
                    <button 
                        key=${f.id}
                        onClick=${(e) => { e.stopPropagation(); onNavigate(f.id); }}
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
                `) : html`<span className="text-xs text-gray-400 px-1 italic">No favorites</span>`}
            </div>
        </div>
    `;
})(window.Jaroet);