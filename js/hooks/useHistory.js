(function(J) {
    const { useState } = React;

    J.Hooks.useHistory = (init) => {
        const [h, setH] = useState(init ? { list: [init], idx: 0 } : { list: [], idx: -1 });

        const visit = (id) => {
            setH(s => {
                if (s.idx >= 0 && s.list[s.idx] === id) return s;
                let list = [...s.list.slice(0, s.idx + 1), id];
                if (list.length > 50) list.shift();
                const idx = Math.min(s.idx + 1, list.length - 1);
                return { list, idx };
            });
        };

        const { list, idx } = h;
        return {
            currentId: idx >= 0 ? list[idx] : null,
            visit,
            replace: (id) => setH({ list: [id], idx: 0 }),
            back: () => setH(s => s.idx > 0 ? { ...s, idx: s.idx - 1 } : s),
            forward: () => setH(s => s.idx < s.list.length - 1 ? { ...s, idx: s.idx + 1 } : s),
            canBack: idx > 0,
            canForward: idx < list.length - 1
        };
    };
})(window.Jaroet);