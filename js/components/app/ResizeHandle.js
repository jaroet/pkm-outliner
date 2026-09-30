(function(J) {
    J.ResizeHandle = ({onMouseDown}) => html`
        <div
            style=${{ backgroundColor: 'color-mix(in srgb, var(--primary) 5%, transparent)' }}
            className="w-2 h-full cursor-col-resize hover:bg-primary/20 transition-colors flex-shrink-0 flex items-center justify-center z-50 select-none"
            onMouseDown=${onMouseDown}
        >
            <div className="w-0.5 h-8 bg-primary rounded-full pointer-events-none"></div>
        </div>
    `;
})(window.Jaroet);