(function(J) {
    const { db } = J.Services.DB;

    // Theme Methods
    const getThemes = () => db.themes.toArray();
    const getTheme = (id) => db.themes.get(id);
    const saveTheme = (theme) => db.themes.put(theme);
    const deleteTheme = (id) => db.themes.delete(id);
    const getActiveThemeId = async () => (await db.meta.get('activeThemeId'))?.value || 'dark';
    const setActiveThemeId = (id) => db.meta.put({key:'activeThemeId', value:id});

    Object.assign(J.Services.DB, { getThemes, getTheme, saveTheme, deleteTheme, getActiveThemeId, setActiveThemeId });
})(window.Jaroet);