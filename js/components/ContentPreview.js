(function(J) {
    const { findNoteByTitle } = J.Services.DB;
    const { useEffect, useRef, useMemo } = React;

    function ContentPreview({ isFocused, fontSize, previewHtml, onFocus, onClick }) {
        const previewContainerRef = useRef(null);

        const checkLinks = useMemo(() => async () => {
            if (previewContainerRef.current) {
                const links = previewContainerRef.current.querySelectorAll('a.internal-link');
                for (const link of links) {
                    const title = link.dataset.title;
                    const noteExists = await findNoteByTitle(title);
                    if (!noteExists) {
                        link.classList.add('broken-link');
                    } else {
                        link.classList.remove('broken-link');
                    }
                }
            }
        }, [previewHtml]);

        useEffect(() => { checkLinks(); }, [checkLinks]);

        return html`
            <${J.Components.SectionContainer} 
                title="Content" 
                className=${`h-full outline-none ${isFocused ? 'ring-2 ring-primary' : ''}`} 
                onClick=${onFocus}
            >
                <div 
                    ref=${previewContainerRef}
                    style=${{ fontSize: `${fontSize}px` }}
                    className="absolute inset-0 p-6 overflow-auto custom-scrollbar prose dark:prose-invert max-w-none rounded-b-3xl compact-markdown" 
                    onClick=${onClick} 
                    dangerouslySetInnerHTML=${{ __html: previewHtml }} />
            </${J.Components.SectionContainer}>
        `;
    }

    J.Components.ContentPreview = ContentPreview;
})(window.Jaroet);