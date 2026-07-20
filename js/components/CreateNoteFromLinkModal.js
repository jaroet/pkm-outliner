(function(J) {
    const { useClickOutside } = J.Hooks;
    const { useCallback } = React;

    J.CreateNoteFromLinkModal = ({ isOpen, onClose, onCreate, title, position }) => {
        const modalRef = useClickOutside(isOpen, useCallback(() => onClose(), []));

        if (!isOpen) return null;

        return html`
            <div ref=${modalRef} className="fixed z-50 bg-card border border-gray-200 dark:border-gray-700 shadow-xl rounded-md text-sm" style=${{ top: position.top, left: position.left }}>
                <div className="p-2 border-b dark:border-gray-700 font-semibold text-center">Create "${title}"</div>
                <div className="flex flex-col">
                    <button onClick=${() => onCreate('child')} className="px-4 py-2 text-left hover:bg-primary/10">
                        <span className="opacity-50 mr-2">+</span> As Child
                    </button>
                    <button onClick=${() => onCreate('parent')} className="px-4 py-2 text-left hover:bg-primary/10">
                        <span className="opacity-50 mr-2">+</span> As Parent
                    </button>
                </div>
            </div>
        `;
    };
})(window.Jaroet);