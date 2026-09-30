(function(J) {
    const { useState, useRef, useCallback, useEffect } = React;
    const { setSplitRatio: dbSetSplitRatio } = J.Services.DB;

    J.Hooks.useSplitPane = () => {
        const [splitRatio, setSplitRatio] = useState(0.5);
        const splitRatioLoaded = useRef(false);
        const isDragging = useRef(false);
        const containerRef = useRef(null);

        const handleMouseDown = (e) => {
            isDragging.current = true;
            splitRatioLoaded.current = true;
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

        // Persist split ratio
        useEffect(() => {
            if (!splitRatioLoaded.current) return;
            const t = setTimeout(() => dbSetSplitRatio(splitRatio), 200);
            return () => clearTimeout(t);
        }, [splitRatio]);

        return { splitRatio, setSplitRatio, splitRatioLoaded, containerRef, onMouseDown: handleMouseDown };
    };
})(window.Jaroet);