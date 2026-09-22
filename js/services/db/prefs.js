(function(J) {
    const { db } = J.Services.DB;

    const getFontSize=async()=>(await db.meta.get('fontSize'))?.value||16;
    const setFontSize=(v)=>db.meta.put({key:'fontSize',value:v});
    const getSectionVisibility=async()=>({showFavorites:(await db.meta.get('ui_showFavorites'))?.value??true});
    const setSectionVisibility=(k,v)=>{if(k==='showFavorites')db.meta.put({key:'ui_showFavorites',value:v})};
    const getSplitRatio=async()=>(await db.meta.get('ui_splitRatio'))?.value||0.5;
    const setSplitRatio=(v)=>db.meta.put({key:'ui_splitRatio',value:v});

    // Attachment Aliases
    const getAttachmentAliases = async () => (await db.meta.get('attachmentAliases'))?.value || [];
    const saveAttachmentAliases = (aliases) => db.meta.put({ key: 'attachmentAliases', value: aliases });

    Object.assign(J.Services.DB, {
        getFontSize, setFontSize, getSectionVisibility, setSectionVisibility, getSplitRatio, setSplitRatio,
        getAttachmentAliases, saveAttachmentAliases
    });
})(window.Jaroet);